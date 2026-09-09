"""First-time setup: asks for your two codes, checks they work, saves them.

    python setup.py

You paste each code when prompted. This script validates both against the real
services before writing .env, so you find out immediately if something is wrong
instead of getting a confusing error later.
"""

from __future__ import annotations

import pathlib
import re
import sys

from config import Settings

ENV_PATH = pathlib.Path(__file__).parent / ".env"

TELEGRAM_SHAPE = re.compile(r"^\d{6,}:[A-Za-z0-9_-]{30,}$")


def clean(raw: str) -> str:
    """Forgive the common paste mistakes: quotes, whole lines, stray spaces."""
    value = raw.strip().strip('"').strip("'").strip()
    # Pasted the whole line from the instructions, e.g. TELEGRAM_BOT_TOKEN=123:abc
    if "=" in value:
        left, right = value.split("=", 1)
        if left.strip().replace("_", "").isalpha() and left.strip().isupper():
            value = right.strip()
    return value


def ask(title: str, guidance: str, validate) -> str:
    print()
    print("-" * 68)
    print(title)
    print("-" * 68)
    print(guidance)
    while True:
        print()
        try:
            raw = input("Paste it here and press Enter:\n> ")
        except (EOFError, KeyboardInterrupt):
            print("\n\nStopped. Nothing was saved. Run setup.py again when ready.")
            sys.exit(1)

        value = clean(raw)
        if not value:
            print("\n  Nothing was pasted. Try again, or press Ctrl+C to stop.")
            continue

        problem = validate(value)
        if problem:
            print(f"\n  That doesn't look right: {problem}")
            continue

        return value


def check_telegram_shape(value: str) -> str | None:
    if not TELEGRAM_SHAPE.match(value):
        return (
            "a Telegram token is a number, then a colon, then ~35 letters and "
            "digits, like 8123456789:AAHx7q... Copy the whole thing from BotFather."
        )
    return None


def check_gemini_shape(value: str) -> str | None:
    # Deliberately loose: Google keys start with AIza today, but the real check is
    # the network call below, and a strict prefix test would reject a valid key if
    # that ever changes.
    if any(c.isspace() for c in value):
        return "there's a space in there — a key is one unbroken string"
    if len(value) < 30:
        return "that looks too short to be a full key"
    return None


def verify_telegram(token: str) -> tuple[bool, str]:
    import time

    import httpx

    last_error = ""
    # A single dropped connection shouldn't send someone back to the start of
    # setup, so a transient failure gets a couple of quiet retries.
    for attempt in range(3):
        try:
            response = httpx.get(f"https://api.telegram.org/bot{token}/getMe", timeout=20)
        except Exception as exc:
            last_error = type(exc).__name__
            if attempt < 2:
                print(f"  Connection dropped ({last_error}), retrying...")
                time.sleep(2)
            continue

        if response.status_code == 401:
            return False, "Telegram rejected this token. Ask BotFather for it again with /mytoken."
        if response.status_code != 200:
            return False, f"Telegram returned an error ({response.status_code})."

        username = response.json().get("result", {}).get("username", "?")
        return True, f"connected to your bot: @{username}"

    return False, f"couldn't reach Telegram after 3 tries ({last_error}). Check your internet."


def verify_gemini(api_key: str) -> tuple[bool, str]:
    from google import genai

    client = genai.Client(api_key=api_key)
    try:
        # A deliberately tiny request. It proves the key is accepted for real
        # generation, which a metadata call would not. thinking_level is left out
        # on purpose: the point here is to test the key, and pinning a value only
        # creates a way for this check to fail for reasons that aren't the key.
        client.interactions.create(
            model=Settings.model,
            input="hi",
            generation_config={"max_output_tokens": 32},
        )
    except Exception as exc:
        detail = str(exc).lower()
        status = getattr(exc, "status_code", None)

        # Google answers a bad key with 400 INVALID_ARGUMENT rather than 401.
        if "api key not valid" in detail or "api_key_invalid" in detail:
            return False, (
                "Google rejected this key. Make a new one at aistudio.google.com "
                "-> Get API key."
            )
        if status == 429:
            # The key is real; there just isn't quota left right now. Worth saving.
            return True, "key works (its free quota is used up for now, but it's valid)"
        if status in (401, 403):
            return False, (
                "This key isn't allowed to use the Gemini API. Check it at "
                "aistudio.google.com, or make a new one."
            )
        if status == 404:
            return False, (
                f"The model {Settings.model!r} wasn't found for this key. Your key is "
                "probably fine - tell whoever set this up that MODEL needs changing."
            )
        if status and status >= 500:
            return False, "Google's API is having trouble right now. Try again shortly."

        # A 400 that got this far is about the request, not the key. Saying
        # "couldn't verify the key" here would send someone off regenerating a
        # perfectly good key, so name the real culprit instead.
        if status == 400:
            return False, (
                f"Your key looks fine - this is a settings problem on our end.\n"
                f"          Google said: {str(exc)[:200]}\n"
                f"          Tell whoever set this up; MODEL or a generation_config "
                f"value needs changing."
            )
        return False, f"Couldn't verify the key: {type(exc).__name__} - {str(exc)[:160]}"
    finally:
        client.close()

    return True, "key works"


def main() -> int:
    print()
    print("=" * 68)
    print("  ScanBot setup")
    print("=" * 68)
    print()
    print("You need two codes. I'll ask for one at a time and check each one")
    print("works before saving. Nothing is saved until both pass.")
    print("Both are free.")

    if ENV_PATH.exists():
        existing = ENV_PATH.read_text(encoding="utf-8")
        if "PASTE_YOUR" not in existing and "TELEGRAM_BOT_TOKEN=" in existing:
            print()
            print("Note: .env already has settings in it. Continuing will overwrite them.")
            try:
                if input("Type y to continue: ").strip().lower() != "y":
                    print("Stopped. Nothing changed.")
                    return 1
            except (EOFError, KeyboardInterrupt):
                print("\nStopped. Nothing changed.")
                return 1

    token = ask(
        "STEP 1 of 2  -  Your Telegram bot token",
        "In Telegram, search for  @BotFather  (the one with a blue checkmark).\n"
        "Send it:  /newbot\n"
        "It asks for a name (anything), then a username (must end in 'bot').\n"
        "It replies with a code like  8123456789:AAHx7q...  -  that's what I need.",
        check_telegram_shape,
    )

    print("\n  Checking with Telegram...")
    ok, detail = verify_telegram(token)
    if not ok:
        print(f"  Failed: {detail}")
        return 1
    print(f"  OK - {detail}")
    bot_username = detail.rsplit("@", 1)[-1]

    key = ask(
        "STEP 2 of 2  -  Your Google Gemini API key (free)",
        "Go to  aistudio.google.com  and sign in with your Google account.\n"
        "Click  Get API key  ->  Create API key  ->  copy it.\n"
        "It starts with  AIza\n"
        "No credit card, no billing setup. There is a daily limit on the free\n"
        "tier, and Google uses free-tier content to improve their products.",
        check_gemini_shape,
    )

    print("\n  Checking with Google (free)...")
    ok, detail = verify_gemini(key)
    if not ok:
        print(f"  Failed: {detail}")
        return 1
    print(f"  OK - {detail}")

    ENV_PATH.write_text(
        "# Written by setup.py. Other options are documented in .env.example\n"
        f"TELEGRAM_BOT_TOKEN={token}\n"
        f"GEMINI_API_KEY={key}\n",
        encoding="utf-8",
    )

    print()
    print("=" * 68)
    print("  Both codes work. Saved to .env")
    print("=" * 68)
    print()
    print("Now start the bot by double-clicking  START-BOT.bat")
    print(f"Then open Telegram, search for  @{bot_username}, press Start,")
    print("and send it a photo of anything.")
    print()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nStopped. Nothing was saved.")
        raise SystemExit(1)
