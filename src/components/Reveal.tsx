"use client";

import { useRef } from "react";
import { useInView } from "@/lib/hooks";

type Props = {
  children: React.ReactNode;
  /** Stagger in ms, for revealing a group in sequence. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "tr";
};

/**
 * Reveals on scroll with a film wipe rather than a fade-up — the transition
 * belongs to the subject's world. Content is visible by default if
 * IntersectionObserver is missing, and the wipe is disabled under reduced
 * motion by CSS.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal ${className}`}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
