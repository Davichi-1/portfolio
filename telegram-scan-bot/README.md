# ScanBot — a Telegram bot that identifies what you point your camera at

Send it a photo, it tells you what the thing is. Then ask follow-up questions about
that same photo in plain text.

```
You:  [photo of a plant]
Bot:  Swiss cheese plant (Monstera deliciosa) — almost certainly.
      • Wants bright indirect light; direct sun scorches the leaves.
      • Water when the top 5cm of soil dries out, roughly weekly.
      • The splits in the leaves mean it's mature and happy.
      • Give it something to climb and the leaves get bigger.
      ⚠️ Toxic to cats and dogs if chewed — calcium oxalate.

You:  how do I propagate it?
Bot:  ...
```

## One important thing about "using the camera"

A Telegram bot can't reach into your phone and open the camera itself — Telegram
gives bots no such permission, on purpose. What it *can* do is receive the photo you
take. In practice that's the same experience, one tap apart:

**📎 → Camera → take the shot → send.** The bot replies in a few seconds.

(The other route is a Telegram Mini App with a live `getUserMedia` preview inside
Telegram, which needs its own HTTPS-hosted web page. This bot doesn't include one —
the photo route works everywhere, including on desktop and in group chats.)

## Setup

You need two free credentials: a Telegram bot token and a Google Gemini API key.
Neither one costs money and neither needs a credit card.

### On Windows: double-click `START-BOT.bat`

That's the only file you need. On a first run it notices the credentials aren't saved
yet, walks you through them, and then starts the bot; after that it just starts the
bot. `SETUP.bat` is still there if you want to re-enter your codes later.

Setup asks for one credential at a time, tells you where to get each one, and checks
each against the real service before saving anything. If a value is wrong you find out
immediately instead of hitting a confusing error later. Nothing is written until both
pass.

### By hand (any platform)

**1. Get a bot token.** Open Telegram, message [@BotFather](https://t.me/BotFather),
send `/newbot`, pick a name and a username. It replies with a token that looks like
`123456789:AAH...`.

**2. Get a Gemini API key** from [aistudio.google.com](https://aistudio.google.com) →
**Get API key** → **Create API key**. It starts with `AIza`. Free tier, no card — see
[Free tier, and what it costs you](#free-tier-and-what-it-costs-you) below for the one
tradeoff you should know about.

**3. Configure and install.**

```bash
cd telegram-scan-bot
cp .env.example .env
```

Open `.env` and paste in your two values. Then:

```bash
python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt
```

On macOS or Linux that middle step is `source .venv/bin/activate`.

**4. Run it.**

```bash
python bot.py
```

You should see `running as @your_bot_name`. Message your bot on Telegram and send
it a photo.

Your credentials live in `.env`, which is gitignored. Don't paste them into a chat
window, an issue, or a commit — a leaked key has to be revoked and replaced.

## What it can do

| | |
|---|---|
| Send a photo | Get an identification |
| Send a file (JPEG/PNG/WebP/GIF) | Same, at full resolution — better for fine detail and small text |
| Type a question afterwards | Answered against the photo you last sent |
| Reply `/scan` to an old photo | Re-scans it |
| Reply `/scan is this safe for cats?` | Scans it with that specific question |
| Caption a photo with a question | Answers that question instead of a generic ID |
| `/mode` | Switch specialism |
| `/reset` | Forget the current photo |

**Modes** change what the bot pays attention to and what it tells you:

- 🔍 **Anything** — general identification, plus material, variant, era, rough value
- 🌿 **Plants & fungi** — common and Latin name, light/water/soil, toxicity to pets
- 🍽 **Food & drink** — dish, visible ingredients, estimated calories and macros, allergens
- 🔤 **Text & labels** — exact transcription, translation, and what it means
- 🏷 **Products** — brand, line, model, generation, rough price bracket
- 🐾 **Animals** — species and breed, temperament, care or habitat
- 🔌 **Tech & parts** — connectors, components, error screens and what to try first

## Keeping it online

The bot uses **long polling**: it dials out to Telegram and holds the connection
open. No public URL, no HTTPS certificate, no webhook registration. It just needs a
process that stays running.

### Railway or Render (easiest)

Push this folder to a Git repo, then create a service from it.

- **Railway** — detects the `Dockerfile`. Add `TELEGRAM_BOT_TOKEN` and
  `GEMINI_API_KEY` under Variables. Deploy. Done.
- **Render** — create a **Background Worker** (not a Web Service), runtime Docker.
  Add the same two variables.
  If you use a Web Service instead because the free tier requires it, also set
  `PORT=10000`; the bot will serve a `200 ok` healthcheck on that port so Render
  doesn't kill it.

### Fly.io

```bash
fly launch --no-deploy
fly secrets set TELEGRAM_BOT_TOKEN=... GEMINI_API_KEY=...
fly deploy
```

### Your own VPS

```bash
docker build -t scanbot .
docker run -d --restart=always --env-file .env --name scanbot scanbot
```

`--restart=always` is what makes it survive reboots and crashes.

Or without Docker, as a systemd unit at `/etc/systemd/system/scanbot.service`:

```ini
[Unit]
Description=Telegram ScanBot
After=network-online.target

[Service]
WorkingDirectory=/opt/scanbot
EnvironmentFile=/opt/scanbot/.env
ExecStart=/opt/scanbot/.venv/bin/python bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now scanbot
```

**Run exactly one instance.** Two processes polling the same token fight over
updates and Telegram returns `Conflict: terminated by other getUpdates request`.
If you see that error, something else is already running with your token.

## Configuration

Everything is optional except the two credentials. Full list with explanations is in
[.env.example](.env.example). The ones you're most likely to touch:

| Variable | Default | |
|---|---|---|
| `MODEL` | `gemini-3.8-flash` | Any Gemini model with a free tier that takes image input. `gemini-2.5-flash-lite` or `gemini-3.1-flash-lite` are gentler on quota if you keep hitting the cap |
| `THINKING_LEVEL` | `low` | `low`/`medium`/`high` — how hard the model works per scan |
| `IMAGE_RESOLUTION` | `high` | `low`/`medium`/`high`/`ultra_high` — how much detail it reads off the photo. Costs input tokens; `high` is what makes small print on labels legible |
| `MAX_OUTPUT_TOKENS` | `2048` | Thinking draws from this too, so an empty reply usually means it's set too low |
| `RATE_LIMIT_SCANS` | `6` | Scans per user per minute |
| `ALLOWED_USER_IDS` | *(empty — public)* | Comma-separated Telegram user IDs to make the bot private |
| `SESSION_TTL_SECONDS` | `1800` | How long a photo stays open for follow-up questions |
| `PORT` | *(unset)* | Only set this if your host demands an open port |

To make the bot private, message [@userinfobot](https://t.me/userinfobot) to get your
numeric ID and put it in `ALLOWED_USER_IDS`.

## Free tier, and what it costs you

Gemini's free tier is an ongoing tier, not a trial balance that runs out — so running
this bot costs nothing in money. Two things it does cost:

**Your quota.** There's a cap on requests per minute and per day. It's per-project and
Google doesn't publish it in the docs; your actual numbers are at
[aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). The daily
count resets at midnight Pacific. When you hit it the bot says so plainly instead of
looking broken. To stretch it: drop `IMAGE_RESOLUTION` to `medium`, lower
`THINKING_LEVEL`, or switch `MODEL` to one of the `-lite` variants.

**Your privacy.** On the free tier, Google states that content you send is used to
improve their products. On the paid tier it isn't. That applies to every photo this
bot forwards. If you're going to scan anything you'd rather Google didn't keep —
documents, medical things, anything with a face or an address in it — either don't, or
enable billing on the project to move onto the paid terms.

Follow-up questions are cheap. Google holds the conversation server-side, so asking
"is it safe for cats?" about a photo you already sent costs one line of text, not
another image upload. That matters most on a per-minute token limit.

If you make the bot public, `RATE_LIMIT_SCANS` per user and `MAX_CONCURRENT_SCANS`
across everyone are what keep one person from burning the whole day's quota.

## How it's put together

| File | |
|---|---|
| [bot.py](bot.py) | Handlers, message routing, HTML-safe sending, health endpoint, startup |
| [scanner.py](scanner.py) | Image normalisation and the Gemini vision call. The mode prompts live here. **The only file that knows which provider is in use** |
| [session.py](session.py) | Per-chat photo and thread handle with TTL, and the rate limiter |
| [config.py](config.py) | Environment parsing, with startup validation |
| [setup.py](setup.py) | The guided credential prompt behind `SETUP.bat` |
| [selftest.py](selftest.py) | 98 offline checks — image handling, sessions, request assembly, error classification, expired-thread recovery, handler wiring. Needs no credentials |
| [apicheck.py](apicheck.py) | Prints the exact request body the bot will send and asserts its shape against the installed SDK |

Both test scripts run without a token or an API key:

```bash
python selftest.py && python apicheck.py
```

Run them after changing anything in `scanner.py`. This matters more than usual here:
the Interactions API takes its parameters as passthrough keyword arguments, so the SDK
will **not** catch a misspelled field for you — it forwards whatever you hand it, and
you find out from a 400. `apicheck.py` captures the serialised HTTP body at the
transport layer and asserts the real shape, which is the only way to catch that.

Design notes worth knowing if you modify it:

- **The conversation lives on Google's side.** The first scan sends the photo with
  `store=True` and keeps the returned interaction ID; follow-ups send just the question
  plus `previous_interaction_id`. That's what makes follow-ups nearly free. Threads are
  retired after `MAX_FOLLOWUPS` turns, and if one expires early the bot silently
  rescans from the photo it still holds rather than making the user re-send it.
- **Photos are downscaled to 1568px on the long edge** before upload, which keeps
  requests small and fast. EXIF orientation is applied, so sideways phone photos read
  correctly. `IMAGE_RESOLUTION` is the separate knob that controls how much detail the
  model actually reads.
- **The model is asked for Telegram HTML**, restricted to `<b> <i> <code> <pre>`. If it
  ever emits markup Telegram rejects, `reply_html()` catches the `BadRequest` and
  resends the message as plain text rather than failing.
- **Session state is in memory only.** A restart loses open photos, which costs a user
  one re-send. Photos are never written to disk.
- **API errors are classified structurally, not by class name.** The SDK raises from a
  private module with no public re-export, so `scanner.py` recognises a failure by
  module prefix and reads the status off the exception. `apicheck.py` makes one real
  request with a deliberately bad key to prove that still works after an SDK upgrade.
  One gotcha baked in: Google answers an invalid key with **400**, not 401.

## Limits, honestly

- It works from pixels alone. It's confident about obvious things and says when it's
  guessing — but a confident wrong answer is still possible.
- **Do not use it to decide whether something is safe to eat, touch, or take.** The
  plant/fungi mode says this out loud every time, and that warning is real: mushroom
  identification from a photo kills people.
- It won't try to identify who a person is, by design.
- Group chats work, but it only responds to photos and to text in chats where it can
  read messages. If you add it to a group, either give it privacy-mode-off via
  @BotFather or address it with `/scan` as a reply.
