"""ScanBot — a Telegram bot that identifies whatever you point your camera at.

Send it a photo and it tells you what the thing is. Then ask follow-up questions
about the same photo in plain text.
"""

from __future__ import annotations

import asyncio
import contextlib
import html
import logging
import re
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from telegram import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
)
from telegram.constants import ChatAction, ParseMode
from telegram.error import BadRequest, Conflict, InvalidToken, NetworkError
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from config import ConfigError, Settings, load_settings
from scanner import (
    DEFAULT_MODE,
    FIRST_SCAN_PROMPT,
    MODES,
    ImageError,
    ScanError,
    Scanner,
    prepare_image,
)
from session import RateLimiter, SessionStore

log = logging.getLogger("scanbot")

# Telegram rejects messages over 4096 characters.
TELEGRAM_MESSAGE_LIMIT = 3900

# Telegram lets bots download files up to 20 MB.
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024

WELCOME = (
    "<b>Point your camera at something. I'll tell you what it is.</b>\n\n"
    "Tap 📎 → <b>Camera</b> and take a photo, or send one from your gallery. "
    "You'll get an identification back in a few seconds.\n\n"
    "After that, just type a question about the same photo — <i>is it safe for cats?</i>, "
    "<i>what's it worth?</i>, <i>how do I fix it?</i> — and I'll answer from the image.\n\n"
    "/mode switches what I specialise in: plants, food, text, products, animals, tech.\n"
    "/help for everything else."
)

HELP = (
    "<b>How to use me</b>\n"
    "• Send a photo — I identify what's in it.\n"
    "• Then type any question about that photo and I'll answer from it.\n"
    "• Send a file instead of a photo if you want me to see it at full resolution.\n"
    "• Reply <code>/scan</code> to an older photo to re-scan it, or "
    "<code>/scan your question</code> to ask something specific about it.\n\n"
    "<b>Commands</b>\n"
    "/mode — pick what I specialise in\n"
    "/reset — forget the current photo and start clean\n"
    "/help — this message\n\n"
    "<b>Worth knowing</b>\n"
    "• I work from pixels alone, so I'm confident about obvious things and honest "
    "about guesses. I'll tell you which one you're getting.\n"
    "• Never use me to decide whether something is safe to eat, touch, or take. "
    "That includes mushrooms, berries, and pills.\n"
    "• I won't try to identify people.\n"
    "• A photo I've scanned stays available for follow-up questions for a while, "
    "then it's dropped."
)


def build_mode_keyboard(active: str) -> InlineKeyboardMarkup:
    rows, row = [], []
    for mode in MODES.values():
        label = f"✅ {mode.label}" if mode.key == active else mode.label
        row.append(InlineKeyboardButton(label, callback_data=f"mode:{mode.key}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    return InlineKeyboardMarkup(rows)


# --------------------------------------------------------------------------- #
# Sending helpers
# --------------------------------------------------------------------------- #

_TAG_RE = re.compile(r"</?[^>]{1,40}>")


def _strip_tags(text: str) -> str:
    return html.unescape(_TAG_RE.sub("", text))


def _chunks(text: str) -> list[str]:
    """Split on paragraph then line boundaries so replies never break mid-word."""
    if len(text) <= TELEGRAM_MESSAGE_LIMIT:
        return [text]

    chunks, current = [], ""
    for line in text.splitlines(keepends=True):
        while len(line) > TELEGRAM_MESSAGE_LIMIT:
            chunks.append(line[:TELEGRAM_MESSAGE_LIMIT])
            line = line[TELEGRAM_MESSAGE_LIMIT:]
        if len(current) + len(line) > TELEGRAM_MESSAGE_LIMIT:
            chunks.append(current)
            current = ""
        current += line
    if current:
        chunks.append(current)
    return chunks


async def reply_html(message, text: str, **kwargs) -> None:
    """Send HTML, falling back to plain text if the model emitted bad markup."""
    for chunk in _chunks(text):
        try:
            await message.reply_text(chunk, parse_mode=ParseMode.HTML, **kwargs)
        except BadRequest as exc:
            if "can't parse entities" not in str(exc).lower():
                raise
            log.warning("HTML parse failed, resending as plain text: %s", exc)
            await message.reply_text(_strip_tags(chunk), **kwargs)


@contextlib.asynccontextmanager
async def busy(chat, action: str = ChatAction.TYPING):
    """Keep the '…is typing' indicator alive for the duration of a slow call."""

    async def loop() -> None:
        while True:
            with contextlib.suppress(Exception):
                await chat.send_action(action)
            await asyncio.sleep(4)

    task = asyncio.create_task(loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


# --------------------------------------------------------------------------- #
# Handlers
# --------------------------------------------------------------------------- #


class ScanBot:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.scanner = Scanner(settings)
        self.sessions = SessionStore(settings.session_ttl_seconds)
        self.limiter = RateLimiter(
            settings.rate_limit_scans, settings.rate_limit_window_seconds
        )
        self._api_slots = asyncio.Semaphore(settings.max_concurrent_scans)

    # -- access control ---------------------------------------------------- #

    def permitted(self, update: Update) -> bool:
        allowed = self.settings.allowed_user_ids
        if not allowed:
            return True
        user = update.effective_user
        return user is not None and user.id in allowed

    async def guard(self, update: Update) -> bool:
        if self.permitted(update):
            return True
        if update.effective_message:
            await update.effective_message.reply_text(
                "This bot is private. Ask its owner to add your Telegram ID."
            )
        return False

    # -- commands ---------------------------------------------------------- #

    async def start(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return
        await reply_html(update.effective_message, WELCOME)

    async def help_cmd(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return
        await reply_html(update.effective_message, HELP)

    async def mode_cmd(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return
        session = self.sessions.get(update.effective_chat.id)
        await update.effective_message.reply_text(
            f"I'm currently set to <b>{MODES[session.mode].label}</b>. Pick another:",
            parse_mode=ParseMode.HTML,
            reply_markup=build_mode_keyboard(session.mode),
        )

    async def mode_chosen(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        query = update.callback_query
        await query.answer()
        if not self.permitted(update):
            return

        key = (query.data or "").removeprefix("mode:")
        if key not in MODES:
            return

        session = self.sessions.get(update.effective_chat.id)
        session.mode = key
        # The old thread was answered under a different specialism; start fresh.
        session.clear_image()

        await query.edit_message_text(
            f"Set to <b>{MODES[key].label}</b>. Send me a photo.",
            parse_mode=ParseMode.HTML,
            reply_markup=build_mode_keyboard(key),
        )

    async def reset(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return
        self.sessions.drop(update.effective_chat.id)
        await update.effective_message.reply_text(
            "Cleared. Send a new photo whenever you're ready."
        )

    async def scan_cmd(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """/scan — as a reply to a photo, or on its own to re-scan the last one."""
        if not await self.guard(update):
            return

        message = update.effective_message
        question = " ".join(context.args or "").strip()
        replied = message.reply_to_message

        if replied and (replied.photo or self._image_document(replied)):
            await self._handle_image_message(update, context, replied, question or None)
            return

        session = self.sessions.get(update.effective_chat.id)
        if not session.has_image:
            await message.reply_text(
                "Send me a photo first, or reply /scan to one you've already sent."
            )
            return

        await self._ask(update, question or FIRST_SCAN_PROMPT)

    # -- media ------------------------------------------------------------- #

    @staticmethod
    def _image_document(message) -> object | None:
        doc = getattr(message, "document", None)
        if doc and (doc.mime_type or "").startswith("image/"):
            return doc
        return None

    async def on_photo(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return
        caption = (update.effective_message.caption or "").strip()
        await self._handle_image_message(
            update, context, update.effective_message, caption or None
        )

    async def on_document(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return

        message = update.effective_message
        document = self._image_document(message)
        if document is None:
            await message.reply_text(
                "I can only read images. Send a photo, or a file that's a JPEG, PNG, "
                "WebP or GIF."
            )
            return

        caption = (message.caption or "").strip()
        await self._handle_image_message(update, context, message, caption or None)

    async def on_other_media(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        if not await self.guard(update):
            return
        await update.effective_message.reply_text(
            "I work from still images. If it's a video, pause it and send me a "
            "screenshot of the frame you want identified."
        )

    async def on_text(self, update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
        """Plain text is a follow-up question about the photo already in the session."""
        if not await self.guard(update):
            return

        question = (update.effective_message.text or "").strip()
        if not question:
            return

        session = self.sessions.get(update.effective_chat.id)
        if not session.has_image:
            await reply_html(
                update.effective_message,
                "I need something to look at first. Tap 📎 → <b>Camera</b>, or send a "
                "photo from your gallery, and I'll tell you what it is.",
            )
            return

        await self._ask(update, question)

    # -- the actual work --------------------------------------------------- #

    async def _handle_image_message(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
        image_message,
        question: str | None,
    ) -> None:
        reply_to = update.effective_message
        chat = update.effective_chat
        user = update.effective_user

        wait = self.limiter.retry_after(user.id)
        if wait:
            await reply_to.reply_text(
                f"You're going fast — give me {round(wait)}s and send it again."
            )
            return

        file_id, size = self._pick_file(image_message)
        if file_id is None:
            await reply_to.reply_text("I couldn't find an image on that message.")
            return

        if size and size > MAX_DOWNLOAD_BYTES:
            await reply_to.reply_text(
                "That file is over Telegram's 20 MB limit for bots. Send it as a "
                "photo instead — Telegram will compress it for me."
            )
            return

        async with busy(chat, ChatAction.TYPING):
            try:
                telegram_file = await context.bot.get_file(file_id)
                raw = bytes(await telegram_file.download_as_bytearray())
            except Exception:
                log.exception("failed to download %s", file_id)
                await reply_to.reply_text(
                    "Telegram wouldn't give me that file. Try sending it again."
                )
                return

            try:
                image_b64, media_type = await asyncio.to_thread(
                    prepare_image, raw, self.scanner.max_image_edge
                )
            except ImageError as exc:
                await reply_to.reply_text(str(exc))
                return

            session = self.sessions.get(chat.id)
            session.start_scan(image_b64, media_type)

            await self._run_scan(reply_to, session, question or FIRST_SCAN_PROMPT)

    async def _ask(self, update: Update, question: str) -> None:
        message = update.effective_message
        chat = update.effective_chat

        wait = self.limiter.retry_after(update.effective_user.id)
        if wait:
            await message.reply_text(
                f"You're going fast — give me {round(wait)}s and ask again."
            )
            return

        session = self.sessions.get(chat.id)
        async with busy(chat, ChatAction.TYPING):
            await self._run_scan(message, session, question)

    async def _run_scan(self, reply_to, session, question: str) -> None:
        """Ask the model, then keep the thread handle for the next follow-up.

        Google holds the conversation, so a follow-up sends one line of text
        instead of re-uploading the photo. session.thread_id is None on the first
        scan and once a thread has run long enough to retire.
        """
        try:
            async with self._api_slots:
                result = await self.scanner.scan(
                    session.mode,
                    image_b64=session.image_b64,
                    media_type=session.media_type,
                    question=question,
                    previous_interaction_id=session.thread_id,
                )
        except ScanError as exc:
            await reply_to.reply_text(str(exc))
            return
        except Exception:
            log.exception("unexpected failure during scan")
            await reply_to.reply_text("Something broke on my side. Try again in a moment.")
            return

        session.record_answer(result.interaction_id, fresh=result.fresh)
        await reply_html(reply_to, result.text)

    @staticmethod
    def _pick_file(message) -> tuple[str | None, int | None]:
        if message.photo:
            largest = message.photo[-1]  # Telegram sorts these smallest to largest
            return largest.file_id, largest.file_size
        doc = getattr(message, "document", None)
        if doc and (doc.mime_type or "").startswith("image/"):
            return doc.file_id, doc.file_size
        return None, None

    # -- errors ------------------------------------------------------------ #

    async def on_error(self, update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
        log.error("unhandled error", exc_info=context.error)
        if isinstance(update, Update) and update.effective_message:
            with contextlib.suppress(Exception):
                await update.effective_message.reply_text(
                    "Something went wrong handling that. Try again."
                )


# --------------------------------------------------------------------------- #
# Wiring
# --------------------------------------------------------------------------- #


def start_health_server(port: int) -> None:
    """Answer GET / with 200 so port-checking hosts consider the bot healthy.

    Long polling needs no inbound traffic, but Render, Fly and some Railway
    configs will kill a service that never binds a port.
    """

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - stdlib naming
            body = b"ok"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_args) -> None:
            pass

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True, name="health").start()
    log.info("health endpoint listening on port %d", port)


def build_application(settings: Settings) -> Application:
    bot = ScanBot(settings)

    async def post_init(app: Application) -> None:
        await app.bot.set_my_commands(
            [
                BotCommand("start", "What this bot does"),
                BotCommand("scan", "Scan a photo you replied to"),
                BotCommand("mode", "Pick what I specialise in"),
                BotCommand("reset", "Forget the current photo"),
                BotCommand("help", "How to use me"),
            ]
        )
        me = await app.bot.get_me()
        log.info("running as @%s (model=%s)", me.username, settings.model)

    async def post_shutdown(_: Application) -> None:
        await bot.scanner.close()

    app = (
        Application.builder()
        .token(settings.telegram_token)
        .concurrent_updates(True)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    app.add_handler(CommandHandler("start", bot.start))
    app.add_handler(CommandHandler("help", bot.help_cmd))
    app.add_handler(CommandHandler("mode", bot.mode_cmd))
    app.add_handler(CommandHandler("reset", bot.reset))
    app.add_handler(CommandHandler("scan", bot.scan_cmd))
    app.add_handler(CallbackQueryHandler(bot.mode_chosen, pattern=r"^mode:"))
    app.add_handler(MessageHandler(filters.PHOTO, bot.on_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, bot.on_document))
    app.add_handler(
        MessageHandler(
            filters.VIDEO | filters.ANIMATION | filters.VOICE | filters.AUDIO | filters.Sticker.ALL,
            bot.on_other_media,
        )
    )
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, bot.on_text))
    app.add_error_handler(bot.on_error)

    return app


def main() -> int:
    try:
        settings = load_settings()
    except ConfigError as exc:
        print(f"Configuration problem: {exc}", file=sys.stderr)
        return 1

    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpx2").setLevel(logging.WARNING)

    if settings.port:
        start_health_server(settings.port)

    app = build_application(settings)
    log.info("starting long polling")
    try:
        # drop_pending_updates keeps a restart from replaying a backlog of old photos.
        app.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)
    except InvalidToken:
        print(
            "Telegram rejected TELEGRAM_BOT_TOKEN. Check it against what @BotFather "
            "gave you; it should look like 123456789:AAH...",
            file=sys.stderr,
        )
        return 1
    except Conflict:
        print(
            "Another process is already polling with this token. Stop it first: "
            "only one instance can run per bot.",
            file=sys.stderr,
        )
        return 1
    except NetworkError as exc:
        print(f"Could not reach Telegram: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
