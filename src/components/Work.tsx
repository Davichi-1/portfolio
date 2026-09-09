"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { disciplines, disciplineById } from "@/lib/disciplines";
import { projects } from "@/lib/work";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import ProjectVisual from "./ProjectVisual";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Work() {
  const [filter, setFilter] = useState<string | null>(null);

  const shown = useMemo(
    () => (filter ? projects.filter((p) => p.disciplineId === filter) : projects),
    [filter],
  );

  // Only offer a filter for disciplines that actually have work behind them.
  const availableFilters = useMemo(
    () => disciplines.filter((d) => projects.some((p) => p.disciplineId === d.id)),
    [],
  );

  return (
    <section id="work" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeader
        timecode="00:02:00:00"
        label="Reel"
        title="Selected work"
        lead="Filter by channel. Every entry lists what I did on it and the spec it was delivered at, because that is usually the question after 'looks nice'."
      />

      {/* Filter bar, with a live count readout */}
      <Reveal>
        <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-3 border-y border-line py-3">
          <button
            type="button"
            onClick={() => setFilter(null)}
            aria-pressed={filter === null}
            className={`mono-label px-3 py-1.5 transition-colors ${
              filter === null
                ? "bg-bone text-ink"
                : "text-bone-3 hover:text-bone"
            }`}
          >
            All
          </button>

          {availableFilters.map((d) => {
            const on = filter === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setFilter(on ? null : d.id)}
                aria-pressed={on}
                className="mono-label flex items-center gap-2 px-3 py-1.5 transition-colors"
                style={{
                  backgroundColor: on ? d.hex : undefined,
                  color: on ? "#0b1114" : undefined,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: on ? "#0b1114" : d.hex }}
                  aria-hidden="true"
                />
                {d.name.replace("Mobile ", "")}
              </button>
            );
          })}

          <span
            className="mono-data ml-auto text-[11px] text-bone-3"
            aria-live="polite"
          >
            {pad(shown.length)} / {pad(projects.length)}
          </span>
        </div>
      </Reveal>

      {/* Remounting on filter change re-runs the wipe, so a new selection
          reads as a new set rather than a silent swap. */}
      <ul
        key={filter ?? "all"}
        className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {shown.map((project, i) => {
          const discipline = disciplineById(project.disciplineId);
          const hex = discipline?.hex ?? "#e8b33c";
          const wide = project.featured && !filter;

          return (
            <Reveal
              as="li"
              key={project.id}
              delay={i * 70}
              className={wide ? "lg:col-span-2" : ""}
            >
              <article className="panel group relative flex h-full flex-col transition-colors duration-300 hover:border-line-bright">
                {/* Cover */}
                <div className="relative overflow-hidden border-b border-line bg-ink-3">
                  <div className={wide ? "aspect-[16/9]" : "aspect-[4/3]"}>
                    {project.image ? (
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <ProjectVisual
                        disciplineId={project.disciplineId}
                        seed={project.id}
                      />
                    )}
                  </div>

                  {/* Slate: channel and year */}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3">
                    <span
                      className="mono-data bg-ink/80 px-2 py-1 text-[10px] tracking-[0.14em] uppercase backdrop-blur-sm"
                      style={{ color: hex }}
                    >
                      {discipline?.name ?? "Work"}
                    </span>
                    <span className="mono-data bg-ink/80 px-2 py-1 text-[10px] text-bone-2 backdrop-blur-sm">
                      {project.year}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="display text-[clamp(1.0625rem,2vw,1.375rem)] leading-[1.1]">
                    {project.href ? (
                      <a
                        href={project.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-amber focus-visible:text-amber"
                      >
                        {/* Stretched hit area — the whole card is the link */}
                        <span className="absolute inset-0 z-10" aria-hidden="true" />
                        {project.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      project.title
                    )}
                  </h3>

                  <p className="mono-label mt-2.5" style={{ color: hex }}>
                    {project.role}
                  </p>

                  <p className="mt-3.5 text-[0.9375rem] leading-[1.6] text-bone-2 text-pretty">
                    {project.summary}
                  </p>

                  {/* Delivery spec */}
                  <ul className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4">
                    {project.specs.map((spec, si) => (
                      <li
                        key={spec}
                        className="mono-data flex items-center gap-3 text-[10px] tracking-[0.08em] text-bone-3 uppercase"
                      >
                        {si > 0 ? (
                          <span className="text-line-bright" aria-hidden="true">
                            /
                          </span>
                        ) : null}
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Corner bracket on hover — a frame being set on the card */}
                <span
                  className="pointer-events-none absolute -top-px -right-px h-4 w-4 border-t border-r opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ borderColor: hex }}
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute -bottom-px -left-px h-4 w-4 border-b border-l opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ borderColor: hex }}
                  aria-hidden="true"
                />
              </article>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
