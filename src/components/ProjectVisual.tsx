import { disciplineById } from "@/lib/disciplines";

/**
 * Generated cover art, one composition per discipline, used until real images
 * land in /public/work/. Better than a grey placeholder box: each one is drawn
 * from the instrument its discipline actually uses — a waveform, a halftone
 * screen, a code block, an exposure ramp, a histogram.
 *
 * Deterministic by design. Everything random is seeded off the project id so
 * server and client render identically and hydration stays quiet.
 */

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Quantise to 2dp before the number reaches the DOM.
 *
 * The PRNG above is pure integer maths and identical everywhere, but the
 * envelopes below use Math.sin / Math.exp / ** — and the precision of those is
 * implementation-defined, so Node and the browser can disagree in the final
 * bit (70.08810407112985 vs ...86). React compares the serialised strings, so
 * one ULP is a hydration mismatch. Rounding kills the class of bug outright,
 * and 2dp inside a 400×300 viewBox is well past what any screen can resolve.
 */
const q = (n: number) => Math.round(n * 100) / 100;

type Props = { disciplineId: string; seed: string };

export default function ProjectVisual({ disciplineId, seed }: Props) {
  const discipline = disciplineById(disciplineId);
  const hex = discipline?.hex ?? "#e8b33c";
  const rand = seededRandom(seed);
  const uid = `pv-${seed.replace(/[^a-z0-9]/gi, "")}`;

  const shared = {
    viewBox: "0 0 400 300",
    preserveAspectRatio: "xMidYMid slice",
    className:
      "h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]",
    "aria-hidden": true as const,
  };

  // ── Sound: a mix window ──────────────────────────────────────────────────
  if (disciplineId === "sound") {
    const bars = Array.from({ length: 56 }, (_, i) => {
      const envelope = Math.sin((i / 55) * Math.PI) ** 0.6;
      return q(Math.max(4, (0.25 + rand() * 0.75) * envelope * 118));
    });
    return (
      <svg {...shared}>
        <rect width="400" height="300" fill="#141f24" />
        <line x1="0" y1="150" x2="400" y2="150" stroke={hex} strokeWidth="0.5" opacity="0.4" />
        {bars.map((h, i) => (
          <rect
            key={i}
            x={q(12 + i * 6.7)}
            y={q(150 - h / 2)}
            width="3.4"
            height={h}
            fill={hex}
            opacity={q(0.35 + (h / 118) * 0.55)}
          />
        ))}
        {[70, 110, 190, 230].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#22343a" strokeWidth="0.5" />
        ))}
      </svg>
    );
  }

  // ── Graphics: a halftone screen with registration ────────────────────────
  if (disciplineId === "graphics") {
    const dots: React.ReactElement[] = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 20; col++) {
        const x = 10 + col * 20;
        const y = 10 + row * 20;
        // Radius falls off from the lower-left, like a gradient screen.
        const falloff = 1 - (col / 20) * 0.55 - (row / 15) * 0.3;
        const r = q(Math.max(0.7, falloff * 6.2 * (0.55 + rand() * 0.6)));
        dots.push(<circle key={`${row}-${col}`} cx={x} cy={y} r={r} fill={hex} opacity="0.5" />);
      }
    }
    return (
      <svg {...shared}>
        <rect width="400" height="300" fill="#141f24" />
        {dots}
        <circle cx="268" cy="112" r="66" fill="none" stroke={hex} strokeWidth="1.25" opacity="0.9" />
        <rect
          x="96" y="150" width="118" height="118"
          fill="none" stroke="#e7e2d7" strokeWidth="1.25" opacity="0.5"
          transform="rotate(-8 155 209)"
        />
        {/* Registration marks */}
        <g stroke="#e7e2d7" strokeWidth="0.75" opacity="0.55">
          <line x1="352" y1="248" x2="382" y2="248" />
          <line x1="367" y1="233" x2="367" y2="263" />
          <circle cx="367" cy="248" r="8" fill="none" />
        </g>
      </svg>
    );
  }

  // ── Software: a code block, abstracted ───────────────────────────────────
  if (disciplineId === "software") {
    const lines = Array.from({ length: 17 }, () => ({
      indent: Math.floor(rand() * 4) * 16,
      width: q(60 + rand() * 210),
      bright: rand() > 0.72,
    }));
    return (
      <svg {...shared}>
        <rect width="400" height="300" fill="#141f24" />
        <defs>
          <pattern id={`${uid}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#22343a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill={`url(#${uid}-grid)`} />
        <rect x="0" y="0" width="34" height="300" fill="#0f181c" />
        {lines.map((line, i) => (
          <g key={i}>
            <rect x="14" y={20 + i * 16} width="7" height="1.5" fill="#6d7877" />
            <rect
              x={46 + line.indent}
              y={18 + i * 16}
              width={Math.min(line.width, 340 - line.indent)}
              height="5"
              rx="0.5"
              fill={line.bright ? hex : "#2f474f"}
              opacity={line.bright ? 0.85 : 0.9}
            />
          </g>
        ))}
      </svg>
    );
  }

  // ── Cinematography: an exposure ramp under a bloom ───────────────────────
  if (disciplineId === "cinematography") {
    return (
      <svg {...shared}>
        <defs>
          <radialGradient id={`${uid}-bloom`} cx="34%" cy="38%" r="62%">
            <stop offset="0%" stopColor={hex} stopOpacity="0.5" />
            <stop offset="55%" stopColor={hex} stopOpacity="0.1" />
            <stop offset="100%" stopColor={hex} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="#141f24" />
        <rect width="400" height="300" fill={`url(#${uid}-bloom)`} />

        {/* Eleven-stop exposure wedge */}
        {Array.from({ length: 11 }, (_, i) => (
          <rect
            key={i}
            x={30 + i * 31}
            y="196"
            width="31"
            height="46"
            fill={hex}
            opacity={q(0.07 + (i / 10) * 0.62)}
          />
        ))}

        {/* Letterbox to 2.39:1 */}
        <rect x="0" y="0" width="400" height="26" fill="#0b1114" />
        <rect x="0" y="274" width="400" height="26" fill="#0b1114" />

        {/* Focus brackets */}
        <g stroke="#e7e2d7" strokeWidth="1" opacity="0.45" fill="none">
          <path d="M138 96v-14h16M246 82h16v14M262 152v14h-16M154 166h-16v-14" />
        </g>
        <line x1="200" y1="118" x2="200" y2="130" stroke="#e7e2d7" strokeWidth="1" opacity="0.45" />
        <line x1="194" y1="124" x2="206" y2="124" stroke="#e7e2d7" strokeWidth="1" opacity="0.45" />
      </svg>
    );
  }

  // ── Photography: thirds grid and a histogram ─────────────────────────────
  const hist = Array.from({ length: 44 }, (_, i) => {
    const centre = Math.exp(-(((i - 19) / 12) ** 2));
    return q(Math.max(2, centre * 52 * (0.6 + rand() * 0.6)));
  });
  return (
    <svg {...shared}>
      <defs>
        <linearGradient id={`${uid}-light`} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor={hex} stopOpacity="0.2" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="#141f24" />
      <rect width="400" height="300" fill={`url(#${uid}-light)`} />

      {/* Rule of thirds */}
      <g stroke="#e7e2d7" strokeWidth="0.5" opacity="0.28">
        <line x1="133" y1="0" x2="133" y2="300" />
        <line x1="267" y1="0" x2="267" y2="300" />
        <line x1="0" y1="100" x2="400" y2="100" />
        <line x1="0" y1="200" x2="400" y2="200" />
      </g>

      {/* Focus box on an intersection */}
      <rect x="243" y="76" width="48" height="48" fill="none" stroke={hex} strokeWidth="1.25" />

      {/* Histogram */}
      <g>
        <rect x="20" y="196" width="176" height="72" fill="#0b1114" opacity="0.72" />
        {hist.map((h, i) => (
          <rect key={i} x={q(24 + i * 3.9)} y={q(264 - h)} width="2.4" height={h} fill={hex} opacity="0.7" />
        ))}
        <line x1="20" y1="264" x2="196" y2="264" stroke="#e7e2d7" strokeWidth="0.5" opacity="0.4" />
      </g>
    </svg>
  );
}
