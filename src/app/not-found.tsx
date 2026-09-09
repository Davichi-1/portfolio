import Link from "next/link";
import { profile } from "@/lib/profile";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-4">
          <span className="mono-data text-[11px] text-bone-3">404</span>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <span className="mono-label">No signal</span>
        </div>

        <h1 className="display mt-6 text-[clamp(2rem,7vw,3.5rem)]">
          Nothing on this channel
        </h1>

        <p className="mt-4 text-[1.0625rem] leading-[1.6] text-bone-2">
          That page doesn&apos;t exist, or it moved. The work, the approach and
          the contact form are all on the front page.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="mono-label bg-amber px-5 py-3.5 text-ink transition-colors hover:bg-bone"
          >
            Back to the reel
          </Link>
          <a
            href={`mailto:${profile.email}`}
            className="mono-label border border-line-bright px-5 py-3.5 text-bone transition-colors hover:border-bone hover:bg-ink-3"
          >
            Email instead
          </a>
        </div>
      </div>
    </main>
  );
}
