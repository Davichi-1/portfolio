/**
 * The five disciplines. This is the spine of the whole site: the hero canvas,
 * the channel strip LEDs, the work filters and the discipline modules all
 * read from this one array.
 *
 * Each discipline owns a hue drawn from SMPTE broadcast colour bars.
 * Photography owns the neutral grey card — that is deliberate, and it is what
 * stops the palette becoming five competing primaries.
 *
 * `trace` selects the waveform character drawn for this discipline in the
 * hero canvas. See src/components/SignalCanvas.tsx.
 *
 * TODO(David): the `tools` lists are the standard kit for each discipline —
 * trim them to what you actually run so the page stays honest.
 */

export type TraceKind = "sine" | "step" | "ramp" | "impulse" | "bezier";

export type Discipline = {
  id: string;
  index: number;
  name: string;
  /** Shown under the name — what the discipline is, in his terms. */
  kicker: string;
  /** Timecode marker. He works in timecode; this is structure, not decoration. */
  timecode: string;
  /** CSS custom property holding this discipline's hue. */
  hue: string;
  /** Tailwind-safe hex, for canvas and inline styles. */
  hex: string;
  trace: TraceKind;
  /** The one-sentence thesis for this discipline. */
  thesis: string;
  /** Concrete things a client receives. Active voice, no adjectives. */
  delivers: string[];
  tools: string[];
};

export const disciplines: Discipline[] = [
  {
    id: "graphics",
    index: 0,
    name: "Graphic Design",
    kicker: "Form, colour, type",
    timecode: "00:01:00:00",
    hue: "var(--color-magenta)",
    hex: "#d2569b",
    trace: "bezier",
    thesis:
      "Six years of this one. It taught me that a logo is the smallest part of an identity — the system around it is the work.",
    delivers: [
      "Brand identity and logo systems",
      "Album art, single covers, tour collateral",
      "Editorial and social layout systems",
      "Packaging and print-ready artwork",
      "Type-led posters and campaign keys",
    ],
    tools: ["Illustrator", "Photoshop", "InDesign", "Figma", "After Effects"],
  },
  {
    id: "software",
    index: 1,
    name: "Software Engineering",
    kicker: "Logic, systems, interfaces",
    timecode: "00:02:00:00",
    hue: "var(--color-mint)",
    hex: "#5fcb8c",
    trace: "step",
    thesis:
      "Design that ships is worth more than design that presents. I build the thing, so the handoff never gets lost.",
    delivers: [
      "Web applications, front to back",
      "Portfolio and commerce sites that stay fast",
      "Design systems built as real components",
      "APIs, auth and database schema",
      "Deployment, monitoring, handover docs",
    ],
    tools: ["TypeScript", "React", "Next.js", "Node", "Python", "PostgreSQL"],
  },
  {
    id: "sound",
    index: 2,
    name: "Sound Engineering",
    kicker: "Pressure, time, space",
    timecode: "00:03:00:00",
    hue: "var(--color-cyan)",
    hex: "#3fbfd1",
    trace: "sine",
    thesis:
      "Most footage fails on audio before it fails on picture. I treat sound as half the frame, because it is.",
    delivers: [
      "Recording, tracking and comping",
      "Mixing for music and for picture",
      "Dialogue cleanup, noise and room repair",
      "Sound design, foley and ambience beds",
      "Mastering for streaming loudness targets",
    ],
    tools: ["Pro Tools", "Ableton Live", "Reaper", "iZotope RX", "FabFilter"],
  },
  {
    id: "cinematography",
    index: 3,
    name: "Cinematography",
    kicker: "Light over time",
    timecode: "00:04:00:00",
    hue: "var(--color-amber)",
    hex: "#e8b33c",
    trace: "ramp",
    thesis:
      "I light for the grade, not for the monitor. What gets shot decides what the edit is allowed to become.",
    delivers: [
      "Music videos and short-form narrative",
      "Brand films and founder interviews",
      "Camera operation and lighting design",
      "Colour grading and look development",
      "Edit, sound mix and final delivery",
    ],
    tools: ["DaVinci Resolve", "Premiere Pro", "Gimbal", "LED + modifiers"],
  },
  {
    id: "photography",
    index: 4,
    name: "Mobile Photography",
    kicker: "Light in an instant",
    timecode: "00:05:00:00",
    hue: "var(--color-card)",
    hex: "#cdc6b8",
    trace: "impulse",
    thesis:
      "The camera in my pocket is always the one that is there. Constraint is a discipline — it forces the eye to do the work.",
    delivers: [
      "Portraits, on location and available light",
      "Street and documentary series",
      "Product and lifestyle stills for social",
      "Event coverage, same-day turnaround",
      "Colour-consistent presets and edits",
    ],
    tools: ["Lightroom Mobile", "Halide", "Snapseed", "Capture One"],
  },
];

export const disciplineById = (id: string) =>
  disciplines.find((d) => d.id === id);
