"use client";

import { useEffect, useState } from "react";

/** Tracks the OS-level reduced-motion preference, and reacts to changes. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * True once the element has entered the viewport. Never flips back.
 *
 * threshold stays at 0 on purpose. Elements using the `.reveal` wipe are
 * clip-path'd down to a 2px sliver while hidden, and IntersectionObserver
 * measures the clipped box — so any ratio-based threshold would never be met.
 * The negative bottom rootMargin is what delays the trigger instead: the
 * element has to be properly on screen, not just grazing the bottom edge.
 */
export function useInView<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  { rootMargin = "0px 0px -12% 0px", threshold = 0 } = {},
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver — show content rather than hide it.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
}

/**
 * Which section is currently in the reading position, plus overall scroll
 * progress. Drives the channel strip readout.
 */
export function useSectionTracker(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;

      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);

      // The reading line sits a third down the viewport.
      const line = window.innerHeight * 0.33;
      let current = ids[0] ?? "";

      for (const id of ids) {
        const node = document.getElementById(id);
        if (!node) continue;
        if (node.getBoundingClientRect().top <= line) current = id;
      }

      setActive(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);

  return { active, progress };
}

/**
 * Formats scroll progress as SMPTE-style timecode across a notional 6-minute
 * reel — one minute per year of experience.
 */
export function timecodeFromProgress(progress: number, totalMinutes = 6) {
  const totalFrames = totalMinutes * 60 * 24;
  const frame = Math.floor(progress * totalFrames);

  const hh = String(Math.floor(frame / (3600 * 24))).padStart(2, "0");
  const mm = String(Math.floor(frame / (60 * 24)) % 60).padStart(2, "0");
  const ss = String(Math.floor(frame / 24) % 60).padStart(2, "0");
  const ff = String(frame % 24).padStart(2, "0");

  return `${hh}:${mm}:${ss}:${ff}`;
}
