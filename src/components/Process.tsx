import { processSteps } from "@/lib/process";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

/**
 * The only place on the site where numbered markers are used. They're earned
 * here — this genuinely is a sequence, and the order is information the
 * reader needs.
 */
export default function Process() {
  return (
    <section
      id="approach"
      className="border-y border-line bg-ink-2/40 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <SectionHeader
        timecode="00:03:00:00"
        label="Approach"
        title="How the work actually runs"
        lead="Four steps, the same every time, whether it's a logo or a mix. You always know what happens next and what you'll have in hand at the end of it."
      />

      <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {processSteps.map((step, i) => (
          <Reveal as="li" key={step.n} delay={i * 90} className="bg-ink-2">
            <div className="flex h-full flex-col p-6 lg:p-7">
              <div className="flex items-center gap-3">
                <span className="mono-data text-[13px] font-medium tracking-[0.06em] text-amber">
                  {step.n}
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>

              <h3 className="display mt-5 text-[clamp(1.125rem,2.2vw,1.5rem)]">
                {step.title}
              </h3>

              <p className="mt-3.5 flex-1 text-[0.9375rem] leading-[1.62] text-bone-2 text-pretty">
                {step.body}
              </p>

              <div className="mt-6 border-t border-line pt-4">
                <span className="mono-label block">You leave with</span>
                <span className="mt-1.5 block text-[0.875rem] leading-snug text-bone">
                  {step.output}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
