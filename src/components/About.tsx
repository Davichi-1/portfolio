import { disciplines } from "@/lib/disciplines";
import { profile } from "@/lib/profile";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

/**
 * Answers the objection the five-discipline claim invites — that breadth means
 * shallowness — head on, rather than hoping nobody thinks of it.
 * The spec sheet on the right is the practical half: facts, no prose.
 */
export default function About() {
  const specs = [
    { label: "Based", value: profile.locationLong },
    { label: "Timezone", value: profile.timezone },
    { label: "Working since", value: String(profile.startYear) },
    { label: "Disciplines", value: `${disciplines.length} channels` },
    { label: "Remote", value: "Worldwide" },
    { label: "On location", value: "Across Nigeria" },
    { label: "Reply time", value: "Within 2 working days" },
    {
      label: "Status",
      value: profile.availability.open ? "Taking new work" : "Booked",
      live: profile.availability.open,
    },
  ];

  return (
    <section id="about" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeader
        timecode="00:04:00:00"
        label="About"
        title="Breadth is the point, not the compromise"
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-16">
        {/* The argument */}
        <div className="max-w-2xl">
          <Reveal>
            <p className="text-[clamp(1.0625rem,1.7vw,1.25rem)] leading-[1.62] text-bone text-pretty">
              I&apos;m {profile.fullName}, working out of {profile.location}. I
              started in graphic design {profile.yearsExperience} years ago and
              kept following the same problem sideways — a poster needed motion,
              the motion needed sound, the sound needed a room, the room needed a
              site to live on. None of it was a career plan. It was one job
              refusing to stay in one medium.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <p className="mt-6 text-[1.0625rem] leading-[1.68] text-bone-2 text-pretty">
              The fair objection to five disciplines is that it usually means
              five shallow ones. My answer is that they aren&apos;t five
              separate skills — they&apos;re one skill applied to five kinds of
              signal. Composition is composition whether you&apos;re framing a
              shot, setting a page or balancing a mix. Knowing how a file gets
              exported, compressed and finally seen is the same instinct in
              every one of them.
            </p>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-6 text-[1.0625rem] leading-[1.68] text-bone-2 text-pretty">
              What it buys you in practice: nothing gets lost in a handoff. The
              person who designed the identity is the person who animates it, who
              shoots the campaign, who mixes the audio, who builds the site it
              lands on. Fewer meetings, one invoice, and a result that holds
              together because one pair of eyes carried it the whole way.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <blockquote
              className="mt-9 border-l-2 pl-5"
              style={{ borderColor: "var(--color-amber)" }}
            >
              <p className="display text-[clamp(1.125rem,2.3vw,1.625rem)] leading-[1.2] text-bone">
                Every craft here is the same job: take a signal and shape it
                until it says the thing.
              </p>
            </blockquote>
          </Reveal>
        </div>

        {/* The spec sheet */}
        <Reveal delay={120}>
          <div className="panel lg:sticky lg:top-24">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <span className="mono-label">Spec sheet</span>
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
              <span className="mono-data text-[10px] text-bone-3">
                {profile.initials}
              </span>
            </div>

            <dl className="px-5 py-1">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 border-b border-line/60 py-3 last:border-0"
                >
                  <dt className="mono-label shrink-0">{spec.label}</dt>
                  <dd className="flex items-center gap-2 text-right text-[0.875rem] text-bone">
                    {spec.live ? (
                      <span
                        className="led-live h-1.5 w-1.5 rounded-full bg-amber"
                        aria-hidden="true"
                      />
                    ) : null}
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="border-t border-line p-5">
              <a
                href="#contact"
                className="mono-label flex items-center justify-between gap-3 border border-amber/45 bg-amber/10 px-4 py-3 text-amber transition-colors hover:bg-amber hover:text-ink"
              >
                Start a project
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
