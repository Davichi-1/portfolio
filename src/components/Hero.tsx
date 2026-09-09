import { disciplines } from "@/lib/disciplines";
import { profile } from "@/lib/profile";
import SignalCanvas from "./SignalCanvas";

/**
 * The hero leads with the thesis, not the name — the name sits in the top bar
 * where it belongs. "Five crafts, one pair of hands" is the actual argument:
 * you brief one person instead of coordinating five vendors.
 *
 * Display type resolves by widening on load, condensed to full, the way a
 * signal settles into its true shape. That's the one orchestrated moment.
 */
export default function Hero() {
  return (
    <section
      id="signal"
      className="relative flex min-h-svh flex-col justify-between pt-24 pb-8 sm:pt-28"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Slate line — where he is, and whether he's free */}
        <div className="boot flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-4">
          <span className="mono-label flex items-center gap-2 text-bone-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${profile.availability.open ? "led-live bg-amber" : "bg-bone-3"}`}
              aria-hidden="true"
            />
            {profile.availability.label}
          </span>
          <span className="mono-label">{profile.locationLong}</span>
          <span className="mono-label hidden sm:inline">{profile.timezone}</span>
          <span className="mono-label ml-auto hidden lg:inline">
            Est. {profile.startYear}
          </span>
        </div>

        {/* The thesis */}
        <h1 className="display mt-8 text-hero sm:mt-10">
          <span className="boot-resolve block" style={{ animationDelay: "80ms" }}>
            Five crafts.
          </span>
          <span
            className="boot-resolve block text-bone-2"
            style={{ animationDelay: "220ms" }}
          >
            One pair
          </span>
          <span className="boot-resolve block" style={{ animationDelay: "360ms" }}>
            of hands.
          </span>
        </h1>

        <div
          className="boot mt-8 grid gap-8 border-t border-line pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          style={{ animationDelay: "620ms" }}
        >
          <p className="max-w-2xl text-lead leading-[1.55] text-bone-2 text-balance">
            <span className="text-bone">{profile.fullName}</span> — designer,
            engineer, mixer, shooter. Six years in Nigeria making work that has
            to hold up in more than one medium, because most work does.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#contact"
              className="mono-label group flex items-center gap-3 bg-amber px-5 py-3.5 text-ink transition-colors hover:bg-bone"
            >
              Start a project
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </a>
            <a
              href="#work"
              className="mono-label border border-line-bright px-5 py-3.5 text-bone transition-colors hover:border-bone hover:bg-ink-3"
            >
              See the reel
            </a>
          </div>
        </div>
      </div>

      {/* The signature: five traces, one per discipline */}
      <div className="mt-12 border-y border-line bg-ink-2/40">
        <SignalCanvas />
      </div>

      {/* Legend — makes the canvas legible as an argument, not a decoration */}
      <div className="px-4 pt-5 sm:px-6 lg:px-8">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {disciplines.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.hex }}
                aria-hidden="true"
              />
              <a
                href={`#discipline-${d.id}`}
                className="mono-label link-wipe text-bone-2 transition-colors hover:text-bone"
              >
                {d.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
