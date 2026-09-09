"""Turns a photo into an identification, using Gemini's Interactions API.

This is the only file that knows which vision provider is in use. Everything
else — handlers, sessions, rate limiting, hosting — is provider-agnostic.
"""

from __future__ import annotations

import base64
import io
import logging
from dataclasses import dataclass

import httpx
from google import genai
from google.genai import errors as genai_errors
from PIL import Image, ImageOps, UnidentifiedImageError

from config import Settings

log = logging.getLogger(__name__)

# Inline image bytes count against a 20 MB total request size. Resizing to
# max_image_edge normally lands far below this; the quality ladder in
# prepare_image() is the safety net for pathological inputs (huge flat scans,
# screenshots of screenshots).
MAX_IMAGE_BYTES = 3_500_000

# A follow-up rides on the previous interaction, so the server already holds
# the photo and the thread. That is cheap, but the thread still grows with every
# turn, so past this many follow-ups we start a fresh interaction from the image.
MAX_FOLLOWUPS = 10


class ImageError(Exception):
    """The bytes we were handed are not an image we can send to the model."""


class ScanError(Exception):
    """The scan could not be completed; the message is safe to show a user."""


@dataclass(frozen=True)
class Mode:
    key: str
    label: str
    instruction: str


@dataclass(frozen=True)
class ScanResult:
    """The model's reply, plus the handle needed to ask a follow-up about it."""

    text: str
    interaction_id: str | None
    # True when this reply opened a new thread rather than continuing one, which
    # is how the caller knows to restart its thread-length count.
    fresh: bool = True


BASE_SYSTEM = """\
You are ScanBot, a visual identification assistant living inside Telegram. People \
point a camera at something they don't recognise and send you the photo. You tell \
them what it is.

Answer in this shape and nothing else:

First line: <b>the name of the thing</b> — as specific as the photo supports.
Then 3 to 5 short lines, each starting with •, covering the details that actually \
matter for this kind of object.
Then, only if there is a real caution to give, one final line starting with ⚠️.

How to answer:
- Lead with the most specific identification you can actually support, then say how \
sure you are in plain words — "almost certainly", "probably", "my best guess". Never \
manufacture precision. A hedged genus beats a confident wrong species.
- If the photo is too blurry, dark, or tightly cropped to tell, say that outright and \
name exactly what a better shot would need to show.
- If several distinct things are visible, identify the main subject and cover the rest \
in one line.
- Be concrete. Skip anything the user can already see for themselves.
- Never identify or guess who a person in a photo is, and never infer someone's \
identity, ethnicity, health, or personal characteristics from their appearance. \
Describe a visible role or object if it matters ("a nurse's lanyard"), not a person.
- Reply in whatever language the user writes to you in. Default to English.

Formatting: Telegram HTML. The only tags allowed are <b>, <i>, <code> and <pre>. Any \
literal &, < or > in your text must be written &amp;, &lt;, &gt;. No markdown, no \
headings, no tables, no links. Stay under 1200 characters unless asked for more.\
"""

MODES: dict[str, Mode] = {
    "identify": Mode(
        "identify",
        "🔍 Anything",
        "Focus: general identification. What the object is, what it is for, and what "
        "is notable about this particular one — material, variant, era, condition, "
        "and a rough value if it is the sort of thing people collect or resell.",
    ),
    "plant": Mode(
        "plant",
        "🌿 Plants & fungi",
        "Focus: plants, flowers, leaves and fungi. Give the common name and the Latin "
        "name, then light, water and soil needs, then whether it is toxic to people, "
        "cats or dogs. Always close with a ⚠️ line saying that a photo is not a "
        "reliable basis for deciding whether something is safe to eat or touch — "
        "state this especially firmly for mushrooms and for berries.",
    ),
    "food": Mode(
        "food",
        "🍽 Food & drink",
        "Focus: food and drink. Name the dish or product, list the ingredients you can "
        "actually see, and give a rough calorie count plus protein/carb/fat split for "
        "the portion shown — label it clearly as an estimate from a photo. Flag likely "
        "allergens. Never say or imply the food is safe for a specific medical "
        "condition, diet restriction, or allergy.",
    ),
    "text": Mode(
        "text",
        "🔤 Text & labels",
        "Focus: the text in the image. Transcribe it exactly inside a <code> block, "
        "then translate it into the user's language if it is in another one, then "
        "explain in one or two lines what it means or what to do about it. Reproduce "
        "numbers, codes, dosages and units character for character, and say so if any "
        "character is unreadable rather than guessing it.",
    ),
    "product": Mode(
        "product",
        "🏷 Products",
        "Focus: products and packaging. Name the brand, product line and model or "
        "variant as precisely as the photo supports, say what it is for, note the "
        "generation or year if it is identifiable, and give a rough price bracket with "
        "its currency, marked approximate.",
    ),
    "animal": Mode(
        "animal",
        "🐾 Animals",
        "Focus: animals. Give the species, and the breed or subspecies where the photo "
        "supports one, then size, temperament, and care or habitat notes. If the animal "
        "looks injured, sick or distressed, say to contact a local vet or wildlife "
        "rescue rather than acting on your identification.",
    ),
    "tech": Mode(
        "tech",
        "🔌 Tech & parts",
        "Focus: hardware, cables, connectors, components and error screens. Name the "
        "exact standard or part where you can — connector type, chip package, port, "
        "protocol, bus — and say what it plugs into or does. For an error message, give "
        "the two or three most likely causes and the first thing to try.",
    ),
}

DEFAULT_MODE = "identify"

FIRST_SCAN_PROMPT = "What is this? Identify it."


def prepare_image(raw: bytes, max_edge: int = 1568) -> tuple[str, str]:
    """Normalise arbitrary image bytes into base64 JPEG the API will accept."""
    try:
        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image) or image
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageError(
            "I couldn't open that as an image. JPEG, PNG, WebP and GIF all work — "
            "HEIC from an iPhone often doesn't, so try sending it as a normal photo "
            "instead of a file."
        ) from exc

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    long_edge = max(image.size)
    if long_edge > max_edge:
        scale = max_edge / long_edge
        width = max(1, round(image.width * scale))
        height = max(1, round(image.height * scale))
        image = image.resize((width, height), Image.Resampling.LANCZOS)

    for quality in (85, 70, 55, 40):
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True)
        data = buffer.getvalue()
        if len(data) <= MAX_IMAGE_BYTES:
            break
    else:
        raise ImageError("That image is too large to process. Try a smaller one.")

    log.debug("prepared image: %dx%d, %d bytes", image.width, image.height, len(data))
    return base64.standard_b64encode(data).decode("ascii"), "image/jpeg"


# --------------------------------------------------------------------------- #
# Request pieces
# --------------------------------------------------------------------------- #


def text_content(text: str) -> dict:
    return {"type": "text", "text": text}


def image_content(image_b64: str, media_type: str, resolution: str = "high") -> dict:
    """An inline image block.

    `resolution` trades input tokens for detail. High earns its cost here: the
    whole job is reading fine detail off a photo, and small print on a label is
    the first thing a lower setting loses.
    """
    return {
        "type": "image",
        "data": image_b64,
        "mime_type": media_type,
        "resolution": resolution,
    }


def user_step(content: list[dict]) -> dict:
    return {"type": "user_input", "content": content}


# --------------------------------------------------------------------------- #
# Error classification
# --------------------------------------------------------------------------- #

# The Interactions API raises from google.genai._gaos.lib.compat_errors, which is
# private and has no public re-export, so catching those classes by name would
# break on an SDK reshuffle. Instead we recognise an SDK-or-transport failure
# structurally and read the HTTP status off the exception. apicheck.py asserts
# that a real API failure is still recognised, so a rename gets caught there.


def _is_transport_or_api_error(exc: BaseException) -> bool:
    return (
        isinstance(exc, (genai_errors.APIError, httpx.HTTPError))
        or type(exc).__module__.startswith("google.genai")
    )


def _status_of(exc: BaseException) -> int | None:
    """The HTTP status behind an SDK exception, if it carries one."""
    for attr in ("status_code", "code"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            return value
    status = getattr(getattr(exc, "response", None), "status_code", None)
    return status if isinstance(status, int) else None


def _scan_error_for(exc: BaseException) -> ScanError:
    status = _status_of(exc)
    detail = str(exc).lower()

    # Google answers a bad key with 400 INVALID_ARGUMENT, not 401, so the status
    # alone can't tell an unusable key from an unusable request.
    if "api key not valid" in detail or "api_key_invalid" in detail:
        log.error("Gemini rejected the API key")
        return ScanError(
            "My API key was rejected. The bot owner needs to check GEMINI_API_KEY."
        )

    if status in (401, 403):
        log.error("Gemini denied the request (%s): %s", status, exc)
        return ScanError(
            "My API key isn't allowed to do that. The bot owner needs to check it "
            "at aistudio.google.com."
        )

    if status == 429:
        log.warning("Gemini quota exhausted: %s", exc)
        return ScanError(
            "I've hit Google's free-tier limit. Wait a minute and try again — if it "
            "keeps happening, today's allowance is used up and it resets at midnight "
            "Pacific time."
        )

    if status == 404:
        log.error("Gemini returned 404: %s", exc)
        return ScanError(
            "My model configuration looks wrong. The bot owner needs to check MODEL."
        )

    if status == 400:
        log.error("Gemini rejected the request: %s", exc)
        return ScanError("The API rejected that image. Try a different photo.")

    if status and status >= 500:
        log.error("Gemini server error %s: %s", status, exc)
        return ScanError("The vision service is having trouble. Try again shortly.")

    log.error("could not reach Gemini: %r", exc)
    return ScanError("I couldn't reach the vision service. Try again shortly.")


# --------------------------------------------------------------------------- #
# Response reading
# --------------------------------------------------------------------------- #

# A truncated answer is still worth showing; a failed or cancelled one is not.
_USABLE_STATUSES = frozenset({"completed", "incomplete"})


def _extract_text(interaction) -> str:
    text = (interaction.output_text or "").strip()
    if text:
        return text

    # output_text covers only the trailing run of text blocks. If the model
    # interleaved a thought or a tool step, walk the steps for the rest.
    parts: list[str] = []
    for step in getattr(interaction, "steps", None) or ():
        if getattr(step, "type", None) != "model_output":
            continue
        for block in getattr(step, "content", None) or ():
            if getattr(block, "type", None) == "text" and getattr(block, "text", None):
                parts.append(block.text)
    return "\n".join(parts).strip()


class Scanner:
    """Thin wrapper over the Interactions API for one-image identification."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = genai.Client(api_key=settings.gemini_api_key)

    @property
    def max_image_edge(self) -> int:
        return self._settings.max_image_edge

    async def close(self) -> None:
        await self._client.aio.aclose()

    def system_prompt(self, mode_key: str) -> str:
        mode = MODES.get(mode_key, MODES[DEFAULT_MODE])
        return f"{BASE_SYSTEM}\n\n{mode.instruction}"

    async def scan(
        self,
        mode_key: str,
        *,
        image_b64: str,
        media_type: str,
        question: str,
        previous_interaction_id: str | None = None,
    ) -> ScanResult:
        """Answer `question` about the photo, continuing a thread when we have one."""
        if previous_interaction_id:
            try:
                interaction = await self._send(
                    mode_key,
                    input=[user_step([text_content(question)])],
                    previous_interaction_id=previous_interaction_id,
                )
            except Exception as exc:
                if not _is_transport_or_api_error(exc):
                    raise
                if not self._thread_is_gone(exc):
                    raise _scan_error_for(exc) from exc
                # The stored interaction aged out from under us. We still hold the
                # photo, so rescan from it rather than making the user re-send it.
                log.info(
                    "follow-up on %s rejected as missing; rescanning from the image",
                    previous_interaction_id,
                )
            else:
                return self._read(interaction, mode_key, fresh=False)

        try:
            interaction = await self._send(
                mode_key,
                # The docs ask for the text prompt before the image.
                input=[
                    user_step(
                        [
                            text_content(question),
                            image_content(
                                image_b64, media_type, self._settings.image_resolution
                            ),
                        ]
                    )
                ],
            )
        except Exception as exc:
            if not _is_transport_or_api_error(exc):
                raise
            raise _scan_error_for(exc) from exc

        return self._read(interaction, mode_key, fresh=True)

    @staticmethod
    def _thread_is_gone(exc: BaseException) -> bool:
        """Is this the server telling us the previous interaction no longer exists?"""
        status = _status_of(exc)
        if status == 404:
            return True
        # A 400 is ambiguous — it covers a bad key just as much as a dead thread —
        # so only treat it as a dead thread when the server says so.
        return status == 400 and "interaction" in str(exc).lower()

    async def _send(self, mode_key: str, **body):
        """One call to the API. Raises the SDK's own exceptions untouched, so the
        caller can tell an expired thread from a genuine failure."""
        return await self._client.aio.interactions.create(
            model=self._settings.model,
            # Sent on follow-ups too, not just the opening turn: the reply has to
            # keep obeying the Telegram-HTML contract either way.
            system_instruction=self.system_prompt(mode_key),
            generation_config={
                "max_output_tokens": self._settings.max_output_tokens,
                "thinking_level": self._settings.thinking_level,
            },
            # Server-side state is what lets a follow-up cost one line of text
            # instead of re-uploading the whole photo.
            store=True,
            **body,
        )

    def _read(self, interaction, mode_key: str, *, fresh: bool) -> ScanResult:
        """Pull the reply out of a response, or explain why there isn't one."""
        status = getattr(interaction, "status", None)
        text = _extract_text(interaction)

        if not text:
            log.info("empty reply (status=%s, errors=%s)", status, interaction.errors)
            if status == "budget_exceeded":
                raise ScanError(
                    "I ran out of room before writing an answer. The bot owner can "
                    "raise MAX_OUTPUT_TOKENS or lower THINKING_LEVEL."
                )
            raise ScanError("I couldn't make anything of that image. Try another angle.")

        if status not in _USABLE_STATUSES:
            log.warning("unusable interaction status=%s errors=%s", status, interaction.errors)
            raise ScanError("I can't answer about that image. Try something else.")

        usage = interaction.usage
        if usage:
            log.info(
                "scan ok: mode=%s fresh=%s in=%s thought=%s out=%s",
                mode_key,
                fresh,
                usage.total_input_tokens,
                usage.total_thought_tokens,
                usage.total_output_tokens,
            )
        return ScanResult(text=text, interaction_id=interaction.id, fresh=fresh)
