import { disciplines } from "@/lib/disciplines";

/**
 * A running band of the actual kit, borrowed from film leader. It exists to
 * answer the one question the discipline list raises — "yes, but what do you
 * actually run?" — without spending a section on it.
 */
export default function Marquee() {
  // Interleave tools across disciplines so no single craft dominates the run.
  const items = disciplines
    .flatMap((d) => d.tools.map((tool, i) => ({ tool, hex: d.hex, order: i })))
    .sort((a, b) => a.order - b.order);

  const Run = ({ ariaHidden }: { ariaHidden: boolean }) => (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item, i) => (
        <li key={`${item.tool}-${i}`} className="flex items-center gap-5 px-5">
          <span
            className="h-1 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: item.hex }}
            aria-hidden="true"
          />
          <span className="mono-data text-[12px] tracking-[0.14em] whitespace-nowrap text-bone-2 uppercase">
            {item.tool}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="relative overflow-hidden border-y border-line bg-ink-2/50 py-3.5"
      role="marquee"
      aria-label="Tools and software in regular use"
    >
      <div className="marquee-track flex w-max">
        <Run ariaHidden={false} />
        <Run ariaHidden={true} />
      </div>

      {/* Feather the edges so items enter and leave rather than clipping */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
