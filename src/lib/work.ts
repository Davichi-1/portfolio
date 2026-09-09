/**
 * ============================================================================
 * PLACEHOLDER WORK — REPLACE BEFORE YOU LAUNCH
 * ============================================================================
 * These entries describe *kinds* of work rather than named clients, so nothing
 * here claims a relationship you don't have. Swap the titles, summaries and
 * specs for your real projects, then drop images into /public/work/ and set
 * the `image` field to use them instead of the generated visual.
 *
 * Delete any entry you don't need — the grid and filters adapt to the array.
 * ============================================================================
 */

export type Project = {
  id: string;
  title: string;
  /** Must match an id in src/lib/disciplines.ts */
  disciplineId: string;
  year: string;
  /** What he did on it. Active voice. */
  role: string;
  summary: string;
  /** Slate metadata, rendered in mono. Keep it technical and short. */
  specs: string[];
  /** Optional. Path under /public — e.g. "/work/cover.jpg". Overrides the generated visual. */
  image?: string;
  /** Optional outbound link — case study, live site, video. */
  href?: string;
  /** Renders larger in the grid. Use for two or three of your best. */
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "record-label-identity",
    title: "Identity system for an independent record label",
    disciplineId: "graphics",
    year: "2025",
    role: "Identity, art direction, print",
    summary:
      "A mark that survives being stamped on vinyl, compressed for streaming thumbnails and blown up for a venue banner. Built as a system: grid, type scale, colour rules and a sleeve template the label fills in itself.",
    specs: ["CMYK + spot", "300 dpi", "12in sleeve", "Type: 2 families"],
    featured: true,
  },
  {
    id: "short-film-colour",
    title: "Short film — camera and colour",
    disciplineId: "cinematography",
    year: "2025",
    role: "DP, colourist",
    summary:
      "Shot flat and graded for a warm, single-source look. Lit almost entirely with practicals and one bounced key so the night interiors kept their depth without going muddy.",
    specs: ["4K", "24 fps", "2.39:1", "Log → Rec.709"],
    featured: true,
  },
  {
    id: "album-mix",
    title: "Six-track EP — mix and master",
    disciplineId: "sound",
    year: "2024",
    role: "Mixing, mastering",
    summary:
      "Tracked in a treated bedroom, so the first job was subtraction — room resonance out, then rebuild the low end. Mastered to streaming targets without flattening the dynamics the performance depended on.",
    specs: ["24-bit / 48 kHz", "Stereo", "−14 LUFS", "6 tracks"],
  },
  {
    id: "studio-booking-app",
    title: "Booking platform for a recording studio",
    disciplineId: "software",
    year: "2025",
    role: "Design and build, front to back",
    summary:
      "Calendar, deposits and automated confirmations. Replaced a booking process that ran entirely through WhatsApp and lost roughly one session a week to double-bookings.",
    specs: ["Next.js", "PostgreSQL", "Stripe", "Lighthouse 98"],
    featured: true,
  },
  {
    id: "portrait-series",
    title: "Portrait series — available light",
    disciplineId: "photography",
    year: "2024",
    role: "Photographer, retouch",
    summary:
      "Fifteen portraits shot across Lagos over three weekends, phone only, no reflector. One preset carried the whole set so it reads as a series rather than fifteen good frames.",
    specs: ["Mobile", "Available light", "15 frames", "1 preset"],
  },
  {
    id: "brand-film",
    title: "Brand film for a founder-led business",
    disciplineId: "cinematography",
    year: "2024",
    role: "DP, editor, sound mix",
    summary:
      "Interview-led, cut to 90 seconds and 30 seconds from the same session. I mixed the dialogue myself, which is usually where a film this size falls apart.",
    specs: ["4K", "90s + 30s", "16:9 + 9:16", "Dialogue mix"],
  },
  {
    id: "motion-identity",
    title: "Motion identity for a podcast",
    disciplineId: "graphics",
    year: "2025",
    role: "Design, animation",
    summary:
      "Animated logo, lower thirds and an audiogram template the host exports weekly without opening After Effects. The constraint was that it had to survive being made by someone else.",
    specs: ["1080p", "30 fps", "9:16 + 1:1", "Template kit"],
  },
  {
    id: "sound-design-spot",
    title: "Sound design for a 30-second spot",
    disciplineId: "sound",
    year: "2023",
    role: "Sound design, foley",
    summary:
      "No music budget, so the whole spot is built from foley and room tone. Recorded most of it in a stairwell, which turned out to have a better tail than anything a plugin gave me.",
    specs: ["Foley", "Stereo", "30s", "No library"],
  },
];

export const projectsByDiscipline = (id: string | null) =>
  id ? projects.filter((p) => p.disciplineId === id) : projects;
