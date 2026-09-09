import Reveal from "./Reveal";

type Props = {
  /** Timecode marker. He works in timecode — this is structure, not ornament. */
  timecode: string;
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
};

export default function SectionHeader({ timecode, label, title, lead }: Props) {
  return (
    <header className="mb-10 sm:mb-14">
      <Reveal>
        <div className="flex items-center gap-4">
          <span className="mono-data text-[11px] tracking-[0.1em] text-bone-3">
            {timecode}
          </span>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <span className="mono-label">{label}</span>
        </div>
      </Reveal>

      <Reveal delay={90}>
        <h2 className="display mt-6 max-w-4xl text-section text-balance">
          {title}
        </h2>
      </Reveal>

      {lead ? (
        <Reveal delay={160}>
          <p className="mt-5 max-w-2xl text-lead leading-[1.6] text-bone-2 text-pretty">
            {lead}
          </p>
        </Reveal>
      ) : null}
    </header>
  );
}
