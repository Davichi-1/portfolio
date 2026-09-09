"""Environment-backed configuration for the scanner bot."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()

# Gemini 3 models take low/medium/high. "minimal" exists in the API but the
# flash models this bot targets reject it with a 400, so it is not offered here.
THINKING_LEVELS = frozenset({"low", "medium", "high"})
IMAGE_RESOLUTIONS = frozenset({"low", "medium", "high", "ultra_high"})


class ConfigError(RuntimeError):
    """Raised when the bot cannot start because of bad or missing config."""


def _int(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be a whole number, got {raw!r}") from exc


def _choice(name: str, default: str, allowed: frozenset[str]) -> str:
    value = (os.getenv(name) or default).strip().lower()
    if value not in allowed:
        # Startup errors print to a console that may not be UTF-8 (Windows cp1252),
        # so every message on this path stays ASCII.
        options = ", ".join(sorted(allowed))
        raise ConfigError(f"{name} must be one of {options}, got {value!r}")
    return value


def _ids(name: str) -> frozenset[int]:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return frozenset()
    try:
        return frozenset(int(part) for part in raw.replace(";", ",").split(",") if part.strip())
    except ValueError as exc:
        raise ConfigError(f"{name} must be a comma-separated list of numeric IDs") from exc


def _credential(name: str, guidance: str) -> str:
    """A required secret, with the unfilled-template case called out by name.

    The placeholders in .env.example are non-empty, so they would otherwise sail
    through startup and fail much later as a puzzling API error.
    """
    value = (os.getenv(name) or "").strip()
    if not value:
        raise ConfigError(f"{name} is not set. {guidance}")
    if "PASTE_YOUR" in value.upper():
        raise ConfigError(
            f"{name} is still the placeholder text from .env.example, not a real "
            f"value. {guidance}"
        )
    return value


@dataclass(frozen=True)
class Settings:
    telegram_token: str
    gemini_api_key: str
    model: str = "gemini-3.8-flash"
    thinking_level: str = "low"
    image_resolution: str = "high"
    max_output_tokens: int = 2048
    max_image_edge: int = 1568
    rate_limit_scans: int = 6
    rate_limit_window_seconds: int = 60
    max_concurrent_scans: int = 4
    session_ttl_seconds: int = 1800
    allowed_user_ids: frozenset[int] = field(default_factory=frozenset)
    port: int | None = None
    log_level: str = "INFO"


def load_settings() -> Settings:
    token = _credential(
        "TELEGRAM_BOT_TOKEN",
        "Run SETUP.bat (or python setup.py) and paste the token @BotFather gave you.",
    )
    api_key = _credential(
        "GEMINI_API_KEY",
        "Get a free key at aistudio.google.com, then run SETUP.bat "
        "(or python setup.py) to save it.",
    )

    port_raw = (os.getenv("PORT") or "").strip()

    return Settings(
        telegram_token=token,
        gemini_api_key=api_key,
        model=(os.getenv("MODEL") or "gemini-3.8-flash").strip(),
        thinking_level=_choice("THINKING_LEVEL", "low", THINKING_LEVELS),
        image_resolution=_choice("IMAGE_RESOLUTION", "high", IMAGE_RESOLUTIONS),
        max_output_tokens=_int("MAX_OUTPUT_TOKENS", 2048),
        max_image_edge=max(256, _int("MAX_IMAGE_EDGE", 1568)),
        rate_limit_scans=_int("RATE_LIMIT_SCANS", 6),
        rate_limit_window_seconds=_int("RATE_LIMIT_WINDOW_SECONDS", 60),
        max_concurrent_scans=max(1, _int("MAX_CONCURRENT_SCANS", 4)),
        session_ttl_seconds=_int("SESSION_TTL_SECONDS", 1800),
        allowed_user_ids=_ids("ALLOWED_USER_IDS"),
        port=int(port_raw) if port_raw else None,
        log_level=(os.getenv("LOG_LEVEL") or "INFO").strip().upper(),
    )
