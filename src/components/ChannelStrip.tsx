"use client";

import { disciplines } from "@/lib/disciplines";
import { profile } from "@/lib/profile";
import { useSectionTracker, timecodeFromProgress } from "@/lib/hooks";

/**
 * A persistent channel strip down the left edge — the site's instrument panel.
 *
 * Everything on it reports real state: the fill is scroll position, the
 * timecode is scroll position expressed the way he'd read it on a deck, and
 * the five LEDs are working jump links to each discipline. Nothing here is
 * decoration pretending to be a readout.
 *
 * Desktop only. On smaller screens the top bar carries navigation instead.
 */

const SECTIONS = [
  { id: "signal", label: "Signal" },
  { id: "craft", label: "Craft" },
  { id: "work", label: "Reel" },
  { id: "approach", label: "Approach" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

export default function ChannelStrip() {
  const { active, progress } = useSectionTracker(SECTION_IDS);
  const activeLabel =
    SECTIONS.find((s) => s.id === active)?.label ?? SECTIONS[0]!.label;

  return (
    <aside
      className="fixed top-0 left-0 z-40 hidden h-screen w-20 flex-col justify-between border-r border-line bg-ink-2/60 px-2 py-4 backdrop-blur-sm lg:flex xl:w-24"
      aria-label="Section navigation and scroll position"
    >
      {/* Monogram */}
      <div className="flex flex-col items-center gap-4">
        <a
          href="#signal"
          className="mono-data grid h-9 w-9 place-items-center border border-line-bright text-[11px] font-semibold tracking-[0.05em] text-bone transition-colors hover:border-amber hover:text-amber"
          aria-label={`${profile.fullName} — back to top`}
        >
          {profile.initials}
        </a>

        {/* Availability LED */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${profile.availability.open ? "led-live bg-amber" : "bg-bone-3"}`}
            aria-hidden="true"
          />
          <span className="mono-label text-[8px] tracking-[0.1em]">
            {profile.availability.open ? "Open" : "Busy"}
          </span>
        </div>
      </div>

      {/* Progress: a fader travelling a measured scale */}
      <div className="flex flex-1 items-stretch justify-center gap-1.5 py-5">
        <div className="tick-scale-v w-1.5 opacity-70" aria-hidden="true" />
        <div className="relative w-px bg-line" aria-hidden="true">
          <div
            className="absolute inset-x-0 top-0 bg-amber transition-[height] duration-150 ease-out"
            style={{ height: `${progress * 100}%` }}
          />
          <div
            className="absolute -left-[3px] h-[2px] w-[7px] bg-amber transition-[top] duration-150 ease-out"
            style={{ top: `${progress * 100}%` }}
          />
        </div>

        {/* Current section, set vertically along the strip */}
        <div
          className="mono-label flex items-center text-[9px] text-bone-2"
          style={{ writingMode: "vertical-rl" }}
        >
          {activeLabel}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Timecode — split across two lines to stay legible at this width */}
        <div className="flex flex-col items-center gap-0.5" aria-hidden="true">
          <span className="mono-label text-[8px] tracking-[0.14em]">TC</span>
          <span className="mono-data text-[10px] leading-tight text-bone-2">
            {timecodeFromProgress(progress).slice(0, 5)}
          </span>
          <span className="mono-data text-[10px] leading-tight text-bone-3">
            {timecodeFromProgress(progress).slice(6)}
          </span>
        </div>

        {/* Five channels, five working jump links */}
        <ul className="flex flex-col items-center gap-2">
          {disciplines.map((d) => (
            <li key={d.id}>
              <a
                href={`#discipline-${d.id}`}
                title={d.name}
                className="group grid h-4 w-4 place-items-center"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full opacity-45 transition-all duration-300 group-hover:scale-150 group-hover:opacity-100 group-focus-visible:scale-150 group-focus-visible:opacity-100"
                  style={{ backgroundColor: d.hex }}
                />
                <span className="sr-only">Jump to {d.name}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* VU meter */}
        <div className="flex h-6 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="vu-bar w-[3px] bg-cyan/70"
              style={{ height: "100%", animationDelay: `${i * 0.22}s` }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
