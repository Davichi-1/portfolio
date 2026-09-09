"use client";

import { useEffect, useState } from "react";
import { profile } from "@/lib/profile";

const LINKS = [
  { href: "#craft", label: "Craft" },
  { href: "#work", label: "Reel" },
  { href: "#approach", label: "Approach" },
  { href: "#about", label: "About" },
];

export default function Nav() {
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 lg:pl-20 xl:pl-24 ${
        lifted ? "border-b border-line bg-ink/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#signal" className="group flex min-w-0 items-baseline gap-2.5">
          <span className="display truncate text-[15px] tracking-[-0.01em] text-bone transition-colors group-hover:text-amber">
            {profile.fullName}
          </span>
          <span className="mono-label hidden shrink-0 sm:inline">
            {profile.location}
          </span>
        </a>

        <nav className="flex items-center gap-1" aria-label="Sections">
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="mono-label px-3 py-2 text-bone-2 transition-colors hover:text-bone"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#contact"
            className="mono-label ml-1 flex items-center gap-2 border border-amber/45 bg-amber/10 px-3 py-2 text-amber transition-colors hover:bg-amber hover:text-ink sm:px-4"
          >
            <span
              className="led-live h-1 w-1 rounded-full bg-current"
              aria-hidden="true"
            />
            Start a project
          </a>
        </nav>
      </div>

      {/* Mobile section links — a scrollable row beats a hamburger for six items */}
      <div
        className={`overflow-x-auto border-t border-line md:hidden ${lifted ? "block" : "hidden"}`}
      >
        <ul className="flex w-max items-center gap-1 px-4 py-1.5">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="mono-label block px-3 py-1.5 text-bone-2"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
