import { profile } from "@/lib/profile";
import { disciplines } from "@/lib/disciplines";

export default function Footer() {
  const socials = profile.socials.filter((s) => s.href);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-ink-2/50">
      {/* Colour bars — the sign-off card at the end of a reel */}
      <div className="flex h-1.5" aria-hidden="true">
        {disciplines.map((d) => (
          <span key={d.id} className="flex-1" style={{ backgroundColor: d.hex }} />
        ))}
      </div>

      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <p className="display text-[clamp(1.5rem,4vw,2.5rem)] leading-[0.95]">
              {profile.fullName}
            </p>
            <p className="mono-label mt-3 text-bone-2">{profile.roleLong}</p>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              <a
                href={`mailto:${profile.email}`}
                className="link-wipe text-[0.9375rem] break-all text-bone transition-colors hover:text-amber"
              >
                {profile.email}
              </a>
              <a
                href={`tel:${profile.phoneHref}`}
                className="link-wipe mono-data text-[0.9375rem] text-bone transition-colors hover:text-amber"
              >
                {profile.phoneDisplay}
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8">
            {socials.length > 0 ? (
              <div>
                <span className="mono-label">Elsewhere</span>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {socials.map((social) => (
                    <li key={social.label}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-wipe mono-label text-bone-2 transition-colors hover:text-bone"
                      >
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <a
              href="#signal"
              className="mono-label group flex w-fit items-center gap-2 text-bone-2 transition-colors hover:text-bone"
            >
              <span
                className="transition-transform duration-300 group-hover:-translate-y-0.5"
                aria-hidden="true"
              >
                ↑
              </span>
              Back to top
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6">
          <span className="mono-data text-[11px] text-bone-3">
            © {year} {profile.fullName}. All rights reserved.
          </span>
          <span className="mono-data text-[11px] text-bone-3">
            {profile.locationLong} — {profile.timezone}
          </span>
          <span className="mono-data text-[11px] text-bone-3">
            End of reel — 00:06:00:00
          </span>
        </div>
      </div>
    </footer>
  );
}
