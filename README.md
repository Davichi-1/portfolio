# David Tobias Chidera — portfolio

A portfolio for a multidisciplinary creative working across five fields: graphic
design, software engineering, sound engineering, cinematography and mobile
photography.

Built with Next.js (App Router), React 19, TypeScript and Tailwind CSS v4. The
only server-side piece is the contact form.

---

## Before you launch

Four things in this repo are placeholders. The site builds and runs without
touching them, but do not publish it as-is.

### 1. Replace the work — `src/lib/work.ts`

The eight entries there are **placeholders**. They describe *kinds* of work
rather than named clients, so nothing currently claims a relationship that
doesn't exist. Swap each one for a real project:

```ts
{
  id: "brand-system-2024",        // unique, kebab-case; also seeds the cover art
  title: "Ọ̀ṣun Records identity",
  disciplineId: "graphics",        // graphics | software | sound | cinematography | photography
  year: 2024,
  role: "Identity design, art direction",
  summary: "One or two sentences. What the job was, what you did, what changed.",
  specs: ["Logotype + wordmark", "Sleeve system", "12 releases"],
  image: "/work/osun-records.jpg", // optional — see below
  href: "https://…",               // optional — makes the whole card clickable
  featured: true,                  // optional — card spans two columns
}
```

Until an entry has an `image`, the card renders generated cover art specific to
its discipline — a waveform for sound, a halftone screen for graphics, an
exposure wedge for cinematography, and so on. It's deterministic, seeded off
`id`, so it never changes between reloads or between server and browser.

To use real images, drop them in `public/work/` and set `image` to the path.
Roughly 1600×1200 (4:3) is the sweet spot.

### 2. Trim the tool lists — `src/lib/disciplines.ts`

Each discipline has a `tools` array. These were filled in with the standard kit
for each field, which means some of it is a guess. Cut anything you don't
actually run — the marquee and the "Runs on" lists both read from it, so a wrong
entry is visible in two places.

### 3. Add your social links — `src/lib/profile.ts`

The `socials` array has handles but empty `href` values. Anything with an empty
`href` is skipped in the UI, so right now none of them render. Fill in the URLs
you want, delete the rest.

### 4. Set the real domain

`NEXT_PUBLIC_SITE_URL` currently falls back to `https://davidtobias.com`, which
is a placeholder. It feeds the canonical URL, sitemap, Open Graph tags and
structured data, so set it to the real domain before launch.

Everything else about you — name, email, phone, location, availability — lives in
`src/lib/profile.ts` and is already correct. Change it there and it updates
everywhere: nav, footer, contact panel, share image, sitemap and search metadata.

---

## Running it locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with hot reload            |
| `npm run build`     | Production build                      |
| `npm start`         | Serve the production build            |
| `npm run lint`      | ESLint                                |
| `npm run typecheck` | TypeScript, no emit                   |

---

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. Both variables are optional
for local development.

```
RESEND_API_KEY=re_xxxxxxxxxxxx
CONTACT_TO_EMAIL=tobiasdavidchidera@gmail.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_SITE_URL=https://your-real-domain.com
```

**`RESEND_API_KEY`** — get one free at [resend.com](https://resend.com). Without
it the contact form still works: the enquiry is printed to the server console and
the visitor is told the message was received. That's deliberate. A missing API
key should cost you a notification, not a lead. You'll see this in your terminal
or Vercel logs:

```
[contact] RESEND_API_KEY not set — enquiry logged instead of emailed:
NEW ENQUIRY
...
```

**`CONTACT_TO_EMAIL`** — where enquiries go. Defaults to the address in
`profile.ts`.

**`CONTACT_FROM_EMAIL`** — the sending address. Resend's free tier only lets you
send from `onboarding@resend.dev` until you verify a domain; verify yours and set
this to an address on it so replies look like they come from you.

---

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. At [vercel.com/new](https://vercel.com/new), import it. Vercel detects Next.js
   — no build settings to change.
3. Add the environment variables above under **Settings → Environment
   Variables**, for Production, Preview and Development.
4. Deploy, then add your custom domain under **Settings → Domains**.

Redeploy after changing `NEXT_PUBLIC_SITE_URL` — it's inlined at build time, so
an existing deployment won't pick it up on its own.

---

## How it's put together

```
src/
├─ app/
│  ├─ layout.tsx              Fonts, metadata, JSON-LD. Font vars go on <html> — see the note there.
│  ├─ page.tsx                Section order
│  ├─ globals.css             Every design token and custom animation
│  ├─ opengraph-image.tsx     Generated share card
│  ├─ sitemap.ts / robots.ts
│  ├─ not-found.tsx
│  └─ api/contact/route.ts    The only endpoint
├─ components/
│  ├─ SignalCanvas.tsx        Hero animation — five live traces, one per discipline
│  ├─ ChannelStrip.tsx        Fixed left rail (desktop). Every readout is real state.
│  ├─ Disciplines.tsx         The five channels, as an accordion
│  ├─ Work.tsx                Filterable project grid
│  ├─ ProjectVisual.tsx       Generated cover art
│  ├─ Contact.tsx             The form
│  └─ …
└─ lib/
   ├─ profile.ts              You. Start here.
   ├─ disciplines.ts          The five fields
   ├─ work.ts                 Projects  ← replace these
   ├─ process.ts              How you work
   ├─ contact-schema.ts       Validation, shared by browser and server
   ├─ rate-limit.ts           Throttling
   ├─ mailer.ts               Email, with the console fallback
   └─ hooks.ts                Reduced motion, in-view, scroll tracking
```

### The design

The whole thing is built on one idea: five different crafts are all the same
job — take a signal and shape it. So the interface is a piece of studio
equipment. A mixing console's channel strip runs down the left edge on desktop,
each discipline gets a colour drawn from SMPTE broadcast bars, sections are
timecoded like a six-minute reel (one minute per year of experience), and the
hero draws five live signal traces whose shapes come from the disciplines
themselves: a sine for sound, a step function for software, an exposure ramp for
cinematography, a shutter impulse for photography, a bézier for graphics.

Photography owns the neutral grey card rather than a sixth hue — that's what
stops the palette becoming five loud colours competing at once.

### Notes for whoever edits this next

- **Validation lives in one place.** `contact-schema.ts` is imported by both the
  form and the API route, so client and server rules can't drift apart. Change a
  rule once.
- **Rate limiting is in-memory.** `rate-limit.ts` holds its counters in a module
  `Map`, which on Vercel means per serverless instance rather than global. It
  stops a bot hammering one instance, which is what it's for. If you need it
  airtight, swap in `@upstash/ratelimit`.
- **`@theme static` in `globals.css` is deliberate.** Tailwind v4 only emits
  theme variables it sees used as utility classes, and several tokens here are
  only referenced from custom CSS via `var()`. Without `static` they get
  tree-shaken and the display typeface silently falls back.
- **Numbers that reach the DOM are rounded to 2dp** in `ProjectVisual.tsx`.
  `Math.sin`/`Math.exp` precision is implementation-defined, so Node and the
  browser can disagree in the last bit — which React reports as a hydration
  mismatch. Rounding removes the whole class of problem.
- **Reduced motion is respected throughout.** Ambient animation stops, the
  custom cursor is replaced by the real one, scroll reveals resolve to visible,
  and the hero canvas draws a single static frame. Nothing disappears.

---

## Accessibility

Keyboard focus is visible everywhere (`:focus-visible`, amber ring). The
accordion uses `aria-expanded`/`aria-controls`, the work filter uses
`aria-pressed` with a live result count, and form errors are announced through a
single `role="status"` region. There's a skip link to the work section. The hero
canvas carries a text description of what it's showing.
