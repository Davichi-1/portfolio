"""Per-chat state: the last photo scanned, the active mode, and the follow-up thread."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from scanner import DEFAULT_MODE, MAX_FOLLOWUPS

# Hard ceiling so a busy public bot can't grow its memory without bound.
MAX_SESSIONS = 5000


@dataclass
class Session:
    mode: str = DEFAULT_MODE
    image_b64: str | None = None
    media_type: str | None = None
    # The conversation itself lives on Google's side; this is the handle to it.
    interaction_id: str | None = None
    turns: int = 0
    updated_at: float = field(default_factory=time.monotonic)

    @property
    def has_image(self) -> bool:
        return self.image_b64 is not None

    @property
    def thread_id(self) -> str | None:
        """The interaction to continue, or None when it's time to start fresh.

        Every turn re-reads the whole thread server-side, so a thread that has run
        long enough gets retired and the next question rescans from the photo.
        """
        if self.turns >= MAX_FOLLOWUPS:
            return None
        return self.interaction_id

    def touch(self) -> None:
        self.updated_at = time.monotonic()

    def start_scan(self, image_b64: str, media_type: str) -> None:
        """Replace the current photo, dropping any conversation about the old one."""
        self.image_b64 = image_b64
        self.media_type = media_type
        self.interaction_id = None
        self.turns = 0
        self.touch()

    def record_answer(self, interaction_id: str | None, *, fresh: bool) -> None:
        self.interaction_id = interaction_id
        self.turns = 1 if fresh else self.turns + 1
        self.touch()

    def clear_image(self) -> None:
        self.image_b64 = None
        self.media_type = None
        self.interaction_id = None
        self.turns = 0
        self.touch()


class SessionStore:
    """In-memory session map with TTL expiry.

    State is deliberately not persisted: a photo someone sent an hour ago is not
    worth keeping on disk, and losing it on restart costs the user one re-send.
    """

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._sessions: dict[int, Session] = {}

    def get(self, chat_id: int) -> Session:
        self._expire()
        session = self._sessions.get(chat_id)
        if session is None:
            if len(self._sessions) >= MAX_SESSIONS:
                self._evict_oldest()
            session = Session()
            self._sessions[chat_id] = session
        elif self._is_stale(session):
            # Keep the chosen mode, drop the stale photo and its conversation.
            session.clear_image()
        return session

    def drop(self, chat_id: int) -> None:
        self._sessions.pop(chat_id, None)

    def _is_stale(self, session: Session) -> bool:
        return time.monotonic() - session.updated_at > self._ttl

    def _expire(self) -> None:
        for chat_id, session in list(self._sessions.items()):
            if self._is_stale(session):
                del self._sessions[chat_id]

    def _evict_oldest(self) -> None:
        oldest = min(self._sessions, key=lambda cid: self._sessions[cid].updated_at)
        del self._sessions[oldest]


class RateLimiter:
    """Sliding-window limiter, keyed by user ID."""

    _PRUNE_AT = 10_000

    def __init__(self, limit: int, window_seconds: int) -> None:
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[int, list[float]] = {}

    def retry_after(self, key: int) -> float:
        """0.0 if the call is allowed (and counted), else seconds until it is."""
        if self._limit <= 0:
            return 0.0

        now = time.monotonic()
        cutoff = now - self._window

        if len(self._hits) > self._PRUNE_AT:
            self._prune(cutoff)

        hits = [t for t in self._hits.get(key, ()) if t > cutoff]

        if len(hits) >= self._limit:
            self._hits[key] = hits
            return max(0.1, hits[0] + self._window - now)

        hits.append(now)
        self._hits[key] = hits
        return 0.0

    def _prune(self, cutoff: float) -> None:
        self._hits = {
            key: fresh
            for key, hits in self._hits.items()
            if (fresh := [t for t in hits if t > cutoff])
        }
