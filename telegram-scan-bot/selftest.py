"""Offline self-test: exercises everything that doesn't need network access.

    python selftest.py

Verifies image preparation, session/thread handling, the rate limiter, request
assembly, error classification, and that every handler wires up against a real
Application object. No Telegram token and no API key are used.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import sys

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:selftest-not-a-real-token")
os.environ.setdefault("GEMINI_API_KEY", "selftest-not-a-real-key")

# The error-path checks below deliberately trigger failures the bot is designed to
# log, including one full traceback. Every one of them is asserted on its return
# value, so the logging itself is noise that would read as a broken test run.
logging.disable(logging.CRITICAL)

import httpx  # noqa: E402
from PIL import Image  # noqa: E402

import scanner  # noqa: E402
from config import ConfigError, load_settings  # noqa: E402
from session import RateLimiter, SessionStore  # noqa: E402

failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok    {label}")
    else:
        print(f"  FAIL  {label}{f' — {detail}' if detail else ''}")
        failures.append(label)


def make_image(width: int, height: int, mode: str = "RGB", fmt: str = "PNG") -> bytes:
    img = Image.new(mode, (width, height))
    for x in range(0, width, 7):  # some texture so JPEG can't trivially flatten it
        for y in range(0, height, 7):
            img.putpixel((x, y), (x % 256, y % 256, (x + y) % 256) if mode == "RGB" else 200)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


print("\nconfig")
settings = load_settings()
check("loads with defaults", settings.model == "gemini-3.8-flash", settings.model)
check("thinking level default is low", settings.thinking_level == "low")
check("image resolution default is high", settings.image_resolution == "high")
check("no allowlist means public", not settings.allowed_user_ids)

os.environ["THINKING_LEVEL"] = "turbo"
try:
    load_settings()
    check("bad THINKING_LEVEL rejected", False, "no exception raised")
except ConfigError as exc:
    check("bad THINKING_LEVEL rejected with the valid options",
          "low, medium, high" in str(exc), str(exc))
    check("startup error stays ASCII-safe for a cp1252 console", str(exc).isascii())
del os.environ["THINKING_LEVEL"]

# The API documents "minimal", but the flash models this bot targets answer it with
# a 400. Offering it in config would turn a valid key into a confusing failure.
os.environ["THINKING_LEVEL"] = "minimal"
try:
    load_settings()
    check("thinking level the flash models reject is not offered", False,
          "'minimal' was accepted")
except ConfigError:
    check("thinking level the flash models reject is not offered", True)
del os.environ["THINKING_LEVEL"]

# An unfilled .env is the most likely first-run mistake, so it must name itself
# rather than surfacing later as a puzzling API error.
saved_key = os.environ["GEMINI_API_KEY"]
os.environ["GEMINI_API_KEY"] = "PASTE_YOUR_GEMINI_KEY_HERE"
try:
    load_settings()
    check("unfilled placeholder rejected", False, "no exception raised")
except ConfigError as exc:
    check("unfilled placeholder rejected as a placeholder", "placeholder" in str(exc))
    check("placeholder error points at setup", "SETUP" in str(exc).upper())
os.environ["GEMINI_API_KEY"] = ""
try:
    load_settings()
    check("missing key rejected", False, "no exception raised")
except ConfigError as exc:
    check("missing key names the variable", "GEMINI_API_KEY" in str(exc))
os.environ["GEMINI_API_KEY"] = saved_key


print("\nimage preparation")
b64, media_type = scanner.prepare_image(make_image(4000, 3000), max_edge=1568)
decoded = Image.open(io.BytesIO(base64.b64decode(b64)))
check("large image downscaled", max(decoded.size) == 1568, str(decoded.size))
check("aspect ratio kept", abs(decoded.width / decoded.height - 4 / 3) < 0.01)
check("re-encoded as JPEG", media_type == "image/jpeg" and decoded.format == "JPEG")

b64_small, _ = scanner.prepare_image(make_image(300, 200), max_edge=1568)
small = Image.open(io.BytesIO(base64.b64decode(b64_small)))
check("small image not upscaled", small.size == (300, 200), str(small.size))

b64_pal, _ = scanner.prepare_image(make_image(100, 100, mode="P"), max_edge=1568)
check("palette mode converted", Image.open(io.BytesIO(base64.b64decode(b64_pal))).mode == "RGB")

check(
    "under API size ceiling",
    len(base64.b64decode(b64)) <= scanner.MAX_IMAGE_BYTES,
    f"{len(base64.b64decode(b64))} bytes",
)

try:
    scanner.prepare_image(b"this is definitely not an image", max_edge=1568)
    check("non-image rejected", False, "no exception raised")
except scanner.ImageError as exc:
    check("non-image rejected with a user-safe message", "image" in str(exc).lower())


print("\nprompts and modes")
check("seven modes defined", len(scanner.MODES) == 7, str(len(scanner.MODES)))
check("default mode exists", scanner.DEFAULT_MODE in scanner.MODES)
for key, mode in scanner.MODES.items():
    check(f"mode {key!r} has label + instruction", bool(mode.label and mode.instruction))

sys_plant = scanner.Scanner(settings).system_prompt("plant")
check("system prompt includes base rules", "ScanBot" in sys_plant)
check("system prompt includes mode instruction", "Latin name" in sys_plant)
check("unknown mode falls back to default", "general identification" in
      scanner.Scanner(settings).system_prompt("nonsense"))


print("\ncontent blocks")
img_block = scanner.image_content(b64, media_type, "medium")
check("image block shape", img_block["type"] == "image" and img_block["data"] == b64)
check("image block carries the mime type", img_block["mime_type"] == "image/jpeg")
check("image resolution passes through", img_block["resolution"] == "medium")
check("text block shape", scanner.text_content("hi") == {"type": "text", "text": "hi"})
step = scanner.user_step([scanner.text_content("hi")])
check("user step shape", step["type"] == "user_input" and len(step["content"]) == 1)


print("\nerror classification")


class FakeAPIError(httpx.HTTPError):
    """Stands in for the SDK's private exception classes, which carry a status."""

    def __init__(self, message: str, status: int) -> None:
        super().__init__(message)
        self.status_code = status


check("SDK/transport errors recognised",
      scanner._is_transport_or_api_error(FakeAPIError("x", 500)))
check("ordinary bugs are not mistaken for API errors",
      not scanner._is_transport_or_api_error(TypeError("bug in my own code")))
check("status read off the exception", scanner._status_of(FakeAPIError("x", 429)) == 429)
check("missing status reads as None", scanner._status_of(TypeError("bug")) is None)

check("bad key names the env var the owner must fix",
      "GEMINI_API_KEY" in str(scanner._scan_error_for(
          FakeAPIError("API key not valid. Please pass a valid API key.", 400))))
check("quota exhaustion explains the free-tier reset",
      "midnight" in str(scanner._scan_error_for(FakeAPIError("quota", 429))).lower())
check("404 points at the MODEL setting",
      "MODEL" in str(scanner._scan_error_for(FakeAPIError("not found", 404))))
check("500 reads as a temporary service problem",
      "trouble" in str(scanner._scan_error_for(FakeAPIError("boom", 503))).lower())
check("no status reads as unreachable",
      "reach" in str(scanner._scan_error_for(httpx.ConnectError("down"))).lower())

check("404 means the thread is gone",
      scanner.Scanner._thread_is_gone(FakeAPIError("no such thing", 404)))
check("400 mentioning an interaction means the thread is gone",
      scanner.Scanner._thread_is_gone(FakeAPIError("interaction not found", 400)))
check("a plain 400 does not look like a dead thread",
      not scanner.Scanner._thread_is_gone(FakeAPIError("API key not valid", 400)))


print("\nsessions")
store = SessionStore(ttl_seconds=1800)
sess = store.get(chat_id=1)
check("new session has no image", not sess.has_image)
check("new session uses default mode", sess.mode == scanner.DEFAULT_MODE)
check("new session has no thread", sess.thread_id is None)

sess.start_scan(b64, media_type)
check("start_scan attaches image", sess.has_image)
check("start_scan clears any old thread", sess.thread_id is None)

sess.record_answer("int_1", fresh=True)
check("first answer opens a thread", sess.thread_id == "int_1")
check("first answer counts as one turn", sess.turns == 1)

sess.record_answer("int_2", fresh=False)
check("follow-up advances the thread", sess.thread_id == "int_2" and sess.turns == 2)

for i in range(scanner.MAX_FOLLOWUPS):
    sess.record_answer(f"int_{i}", fresh=False)
check("a long thread is retired so the next question rescans", sess.thread_id is None)
sess.record_answer("int_new", fresh=True)
check("a fresh scan restarts the count", sess.thread_id == "int_new" and sess.turns == 1)

sess.start_scan(b64, media_type)
check("new photo drops the old thread", sess.thread_id is None)

sess.clear_image()
check("clear_image drops the image", not sess.has_image)

check("same chat returns same session", store.get(1) is store.get(1))
store.drop(1)
check("drop removes the session", store.get(1) is not sess)

stale = SessionStore(ttl_seconds=0)
s = stale.get(99)
s.start_scan(b64, media_type)
check("expired session loses its image", not stale.get(99).has_image)


print("\nrate limiter")
limiter = RateLimiter(limit=3, window_seconds=60)
allowed = [limiter.retry_after(7) == 0.0 for _ in range(3)]
check("first N calls allowed", all(allowed))
wait = limiter.retry_after(7)
check("call N+1 blocked", wait > 0, f"retry_after={wait}")
check("other users unaffected", limiter.retry_after(8) == 0.0)
check("limit<=0 disables limiting", RateLimiter(0, 60).retry_after(1) == 0.0)


print("\nrequest assembly")
import asyncio  # noqa: E402

from bot import ScanBot, _chunks, _strip_tags  # noqa: E402


class FakeMessage:
    def __init__(self):
        self.sent: list[str] = []

    async def reply_text(self, text, **kwargs):
        self.sent.append(text)


async def build_requests():
    calls: list[dict] = []
    bot = ScanBot(settings)

    async def fake_scan(mode_key, **kwargs):
        calls.append({"mode": mode_key, **kwargs})
        return scanner.ScanResult(
            text="<b>A thing</b>\n• detail",
            interaction_id=f"int_{len(calls)}",
            fresh=kwargs.get("previous_interaction_id") is None,
        )

    bot.scanner.scan = fake_scan  # type: ignore[method-assign]

    session = bot.sessions.get(42)
    session.start_scan(b64, media_type)

    msg = FakeMessage()
    await bot._run_scan(msg, session, "What is this?")
    check("first scan passes the image", calls[0]["image_b64"] == b64)
    check("first scan sends the question", calls[0]["question"] == "What is this?")
    check("first scan has no thread to continue",
          calls[0]["previous_interaction_id"] is None)
    check("thread handle recorded", session.thread_id == "int_1")

    await bot._run_scan(msg, session, "Is it safe for cats?")
    check("follow-up continues the recorded thread",
          calls[1]["previous_interaction_id"] == "int_1")
    check("follow-up sends the new question", calls[1]["question"] == "Is it safe for cats?")
    check("follow-up advances the thread", session.thread_id == "int_2")
    check("mode is carried through", calls[1]["mode"] == session.mode)
    check("reply delivered to the user", len(msg.sent) == 2)

    # ScanError must surface as a message, not an exception.
    async def failing_scan(mode_key, **kwargs):
        raise scanner.ScanError("rate limited, try later")

    bot.scanner.scan = failing_scan  # type: ignore[method-assign]
    msg2 = FakeMessage()
    await bot._run_scan(msg2, session, "again?")
    check("ScanError shown to user", msg2.sent == ["rate limited, try later"])
    check("a failed scan leaves the thread handle alone", session.thread_id == "int_2")

    async def exploding_scan(mode_key, **kwargs):
        raise RuntimeError("boom")

    bot.scanner.scan = exploding_scan  # type: ignore[method-assign]
    msg3 = FakeMessage()
    await bot._run_scan(msg3, session, "again?")
    check("unexpected error caught", len(msg3.sent) == 1 and "broke" in msg3.sent[0].lower())

    await bot.scanner.close()


asyncio.run(build_requests())


print("\nexpired thread recovery")


class FakeInteraction:
    def __init__(self, text: str, ident: str) -> None:
        self.output_text = text
        self.id = ident
        self.status = "completed"
        self.usage = None
        self.errors = None
        self.steps = None


async def expired_thread():
    scan = scanner.Scanner(settings)
    sent: list[dict] = []

    async def fake_send(mode_key, **body):
        sent.append(body)
        if "previous_interaction_id" in body:
            raise FakeAPIError("Interaction not found", 404)
        return FakeInteraction("<b>Rescanned</b>", "int_fresh")

    scan._send = fake_send  # type: ignore[method-assign]

    result = await scan.scan(
        "identify",
        image_b64=b64,
        media_type=media_type,
        question="is it safe?",
        previous_interaction_id="int_expired",
    )
    check("dead thread falls back to a fresh scan instead of erroring",
          result.text == "<b>Rescanned</b>")
    check("the fallback is reported as fresh", result.fresh is True)
    check("the fallback re-sends the image",
          any(b["type"] == "image" for b in sent[1]["input"][0]["content"]))
    check("exactly two attempts were made", len(sent) == 2, str(len(sent)))

    # A quota error on a follow-up must NOT be retried as a fresh scan; that would
    # just burn another request against an already-exhausted quota.
    async def rate_limited(mode_key, **body):
        raise FakeAPIError("quota exceeded", 429)

    scan._send = rate_limited  # type: ignore[method-assign]
    tries = 0
    try:
        await scan.scan(
            "identify", image_b64=b64, media_type=media_type, question="q",
            previous_interaction_id="int_live",
        )
        check("quota error surfaces", False, "no exception raised")
    except scanner.ScanError as exc:
        check("quota error surfaces as a ScanError", "free-tier" in str(exc))

    # A bug in our own code must not be disguised as an API problem.
    async def buggy(mode_key, **body):
        raise TypeError("bug in my own code")

    scan._send = buggy  # type: ignore[method-assign]
    try:
        await scan.scan("identify", image_b64=b64, media_type=media_type, question="q")
        check("real bugs propagate", False, "no exception raised")
    except scanner.ScanError:
        check("real bugs propagate", False, "disguised as a ScanError")
    except TypeError:
        check("real bugs propagate instead of being disguised", True)

    await scan.close()


asyncio.run(expired_thread())


print("\nresponse reading")


async def response_reading():
    scan = scanner.Scanner(settings)

    empty = FakeInteraction("", "int_x")
    try:
        scan._read(empty, "identify", fresh=True)
        check("empty reply rejected", False, "no exception raised")
    except scanner.ScanError as exc:
        check("empty reply rejected with a retry suggestion", "angle" in str(exc))

    starved = FakeInteraction("", "int_y")
    starved.status = "budget_exceeded"
    try:
        scan._read(starved, "identify", fresh=True)
        check("budget exhaustion rejected", False, "no exception raised")
    except scanner.ScanError as exc:
        check("budget exhaustion names the setting to raise",
              "MAX_OUTPUT_TOKENS" in str(exc))

    blocked = FakeInteraction("some text", "int_z")
    blocked.status = "failed"
    try:
        scan._read(blocked, "identify", fresh=True)
        check("failed interaction rejected", False, "no exception raised")
    except scanner.ScanError:
        check("failed interaction rejected even when text is present", True)

    truncated = FakeInteraction("half an answer", "int_t")
    truncated.status = "incomplete"
    check("a truncated answer is still shown",
          scan._read(truncated, "identify", fresh=True).text == "half an answer")

    # output_text is empty when the model interleaves non-text steps, so the
    # fallback has to walk the steps itself.
    class Block:
        def __init__(self, text):
            self.type, self.text = "text", text

    class Step:
        def __init__(self, kind, blocks):
            self.type, self.content = kind, blocks

    interleaved = FakeInteraction("", "int_s")
    interleaved.steps = [
        Step("thought", [Block("hmm")]),
        Step("model_output", [Block("<b>Found it</b>")]),
    ]
    check("text recovered from steps when output_text is empty",
          scan._read(interleaved, "identify", fresh=True).text == "<b>Found it</b>")

    await scan.close()


asyncio.run(response_reading())


print("\nmessage formatting")
check("short text is one chunk", _chunks("hello") == ["hello"])
long_text = "\n".join(f"line {i} " + "x" * 100 for i in range(200))
parts = _chunks(long_text)
check("long text split", len(parts) > 1, f"{len(parts)} chunks")
check("every chunk within Telegram's limit", all(len(p) <= 3900 for p in parts),
      f"max={max(len(p) for p in parts)}")
check("splitting is lossless", "".join(parts) == long_text)
unbroken = "y" * 9000
check("unbroken run also split", all(len(p) <= 3900 for p in _chunks(unbroken)))
check("tags stripped for fallback",
      _strip_tags("<b>Bold</b> &amp; <i>it</i>") == "Bold & it",
      _strip_tags("<b>Bold</b> &amp; <i>it</i>"))


print("\nhandler wiring")
from bot import build_application, build_mode_keyboard  # noqa: E402

app = build_application(settings)
handler_count = sum(len(v) for v in app.handlers.values())
check("handlers registered", handler_count >= 9, f"{handler_count} handlers")
check("error handler registered", len(app.error_handlers) == 1)

kb = build_mode_keyboard("plant")
buttons = [b for row in kb.inline_keyboard for b in row]
check("keyboard has a button per mode", len(buttons) == len(scanner.MODES))
check("active mode is ticked", any(b.text.startswith("✅") for b in buttons))
check("callback data parses back to modes",
      all(b.callback_data.removeprefix("mode:") in scanner.MODES for b in buttons))


print()
if failures:
    print(f"{len(failures)} check(s) failed:")
    for name in failures:
        print(f"  - {name}")
    sys.exit(1)
print("all checks passed")
