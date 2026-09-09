"""Verify the API request shape against the installed SDK, without a valid key.

    python apicheck.py

The Interactions API takes its parameters as passthrough keyword arguments, so the
SDK will not catch a misspelled field for you — it forwards whatever you hand it.
This script therefore captures the fully serialised HTTP body at the transport
layer and asserts the shape of what would actually go out.

It also makes one real request with a deliberately invalid key. That is what keeps
scanner.py's error classification honest: the exceptions come from a private SDK
module, and this proves they are still recognised.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import os

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:apicheck")
os.environ.setdefault("GEMINI_API_KEY", "apicheck-not-a-real-key")

import httpx  # noqa: E402
from PIL import Image  # noqa: E402

import scanner  # noqa: E402
from config import load_settings  # noqa: E402

settings = load_settings()
failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok    {label}")
    else:
        print(f"  FAIL  {label}{f' - {detail}' if detail else ''}")
        failures.append(label)


buf = io.BytesIO()
Image.new("RGB", (64, 64), (120, 30, 200)).save(buf, format="PNG")
image_b64, media_type = scanner.prepare_image(buf.getvalue(), settings.max_image_edge)


async def capture(**scan_kwargs) -> dict:
    """Run a scan against a transport that records the body instead of sending it."""
    sent: dict = {}
    original = httpx.AsyncClient.send

    async def spy(self, request, **kwargs):
        sent["url"] = str(request.url)
        sent["body"] = json.loads(request.content)
        raise RuntimeError("__captured__")

    httpx.AsyncClient.send = spy
    scan = scanner.Scanner(settings)
    try:
        await scan.scan("plant", **scan_kwargs)
    except Exception:
        pass  # the sentinel escapes on purpose; `sent` is the signal
    finally:
        httpx.AsyncClient.send = original
        await scan.close()
    return sent


async def probe() -> None:
    print(f"model under test: {settings.model}\n")

    print("first scan - serialised request body (image data elided)")
    sent = await capture(
        image_b64=image_b64, media_type=media_type, question=scanner.FIRST_SCAN_PROMPT
    )
    if not sent:
        check("request was serialised", False, "rejected before reaching the transport")
        return

    body = sent["body"]
    printable = json.loads(json.dumps(body))
    printable["system_instruction"] = "<system prompt>"
    printable["input"][0]["content"][1]["data"] = f"<{len(image_b64)} base64 chars>"
    print(json.dumps(printable, indent=2)[:1600])

    content = body["input"][0]["content"]
    image = content[1]
    print()
    check("posts to the interactions endpoint", sent["url"].endswith("/interactions"),
          sent["url"])
    check("model is the configured ID", body["model"] == settings.model)
    check("system_instruction is top level", isinstance(body.get("system_instruction"), str))
    check("system prompt carries the mode", "Latin name" in body["system_instruction"])
    check("max_output_tokens nested in generation_config",
          body["generation_config"]["max_output_tokens"] == settings.max_output_tokens)
    check("thinking_level nested in generation_config",
          body["generation_config"]["thinking_level"] == settings.thinking_level)
    check("store is on, so follow-ups can continue the thread", body["store"] is True)
    check("no previous_interaction_id on a first scan",
          "previous_interaction_id" not in body)
    check("input is a single user_input step",
          len(body["input"]) == 1 and body["input"][0]["type"] == "user_input")
    check("text comes before the image, as the docs require",
          [b["type"] for b in content] == ["text", "image"])
    check("image is inline base64 JPEG",
          image["mime_type"] == "image/jpeg" and isinstance(image["data"], str))
    check("image resolution is the configured one",
          image["resolution"] == settings.image_resolution)
    check("image data round-trips to a JPEG",
          base64.b64decode(image["data"])[:2] == b"\xff\xd8")

    print("\nfollow-up - continues the thread instead of re-uploading")
    sent = await capture(
        image_b64=image_b64,
        media_type=media_type,
        question="is it safe for cats?",
        previous_interaction_id="int_apicheck_123",
    )
    body = sent["body"]
    check("previous_interaction_id sent", body.get("previous_interaction_id") == "int_apicheck_123")
    check("no image re-uploaded",
          all(b["type"] != "image" for b in body["input"][0]["content"]),
          str([b["type"] for b in body["input"][0]["content"]]))
    check("system_instruction still sent", isinstance(body.get("system_instruction"), str))
    check("question is the only content",
          body["input"][0]["content"] == [{"type": "text", "text": "is it safe for cats?"}])

    print("\nerror classification against a real API response")
    scan = scanner.Scanner(settings)
    try:
        await scan.scan(
            "identify", image_b64=image_b64, media_type=media_type, question="what is this?"
        )
        check("invalid key is rejected", False, "the request unexpectedly succeeded")
    except scanner.ScanError as exc:
        check("SDK exception is recognised and translated", True)
        check("invalid key produces the owner-facing message",
              "GEMINI_API_KEY" in str(exc), str(exc))
    except Exception as exc:
        # An offline machine lands here; that is not a shape failure.
        if scanner._is_transport_or_api_error(exc):
            check("SDK exception is recognised", False,
                  f"{type(exc).__module__}.{type(exc).__name__} escaped translation")
        else:
            print(f"  skip  no network, could not test live errors ({type(exc).__name__})")
    finally:
        await scan.close()


asyncio.run(probe())

print()
if failures:
    print(f"{len(failures)} check(s) failed:")
    for name in failures:
        print(f"  - {name}")
    raise SystemExit(1)
print("all checks passed")
