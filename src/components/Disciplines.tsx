"use client";

import { useCallback, useEffect, useState } from "react";
import { disciplines } from "@/lib/disciplines";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

/**
 * Five console channels, one open at a time. The interaction is the metaphor:
 * you select a channel and it comes up. An accordion also keeps five long
 * discipline write-ups from turning the page into a wall.
 *
 * Deep links work — the channel strip LEDs and the hero legend both point at
 * #discipline-<id>, and landing on one opens it.
 */
export default function Disciplines() {
  const [open, setOpen] = useState(disciplines[0]!.id);

  // Open whichever channel the URL hash points at.
  const syncFromHash = useCallback(() => {
    const hash = window.location.hash.replace("#discipline-", "");
    if (disciplines.some((d) => d.id === hash)) setOpen(hash);
  }, []);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  return (
    <section id="craft" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeader
        timecode="00:01:00:00"
        label="Craft"
        title="Five channels, and what comes down each one"
        lead="Every one of these is the same job in a different medium: take a signal and shape it until it says the thing. Select a channel to see what you actually get."
      />

      <div className="border-t border-line">
        {disciplines.map((d, i) => {
          const isOpen = open === d.id;
          const panelId = `panel-${d.id}`;

          return (
            <Reveal
              key={d.id}
              delay={i * 60}
              className="border-b border-line"
            >
              <article id={`discipline-${d.id}`} className="scroll-mt-24">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? "" : d.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="group flex w-full items-center gap-4 py-6 text-left transition-colors sm:gap-6"
                    style={{
                      backgroundColor: isOpen ? `${d.hex}0a` : undefined,
                    }}
                  >
                    {/* Channel LED + hue rail */}
                    <span className="flex shrink-0 items-center gap-3 sm:gap-4">
                      <span
                        className="w-1 transition-all duration-400"
                        style={{
                          backgroundColor: d.hex,
                          height: isOpen ? "2.75rem" : "1rem",
                          opacity: isOpen ? 1 : 0.5,
                        }}
                        aria-hidden="true"
                      />
                      <span className="mono-data hidden text-[11px] text-bone-3 sm:inline">
                        {d.timecode}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className="display block text-[clamp(1.25rem,3.6vw,2.25rem)] transition-colors duration-300"
                        style={{ color: isOpen ? d.hex : undefined }}
                      >
                        {d.name}
                      </span>
                      <span className="mono-label mt-1.5 block text-bone-3">
                        {d.kicker}
                      </span>
                    </span>

                    {/* Open/close indicator — a fader, not a chevron */}
                    <span
                      className="relative grid h-8 w-8 shrink-0 place-items-center border border-line transition-colors group-hover:border-line-bright"
                      aria-hidden="true"
                    >
                      <span className="absolute h-px w-3 bg-bone-2" />
                      <span
                        className="absolute h-3 w-px bg-bone-2 transition-transform duration-400 ease-out"
                        style={{ transform: isOpen ? "scaleY(0)" : "scaleY(1)" }}
                      />
                    </span>
                  </button>
                </h3>

                {/* Grid-rows transition keeps the panel height animatable
                    without measuring anything in JS. */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={`discipline-${d.id}`}
                  hidden={!isOpen}
                  className="grid transition-[grid-template-rows] duration-500 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-8 pb-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-12 sm:pl-8 lg:pl-[7.5rem]">
                      <div>
                        <p className="text-[1.0625rem] leading-[1.65] text-bone text-pretty">
                          {d.thesis}
                        </p>

                        <div className="mt-7">
                          <span className="mono-label">Runs on</span>
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {d.tools.map((tool) => (
                              <li
                                key={tool}
                                className="mono-data border border-line px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-bone-2"
                              >
                                {tool}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <span className="mono-label">What you get</span>
                        <ul className="mt-3">
                          {d.delivers.map((item) => (
                            <li
                              key={item}
                              className="flex gap-3 border-b border-line/60 py-2.5 text-[0.9375rem] text-bone-2 last:border-0"
                            >
                              <span
                                className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full"
                                style={{ backgroundColor: d.hex }}
                                aria-hidden="true"
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
