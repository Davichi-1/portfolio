"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";

/**
 * A viewfinder reticle in place of the pointer. Justified by the brief — he
 * frames shots for a living — and kept to a hairline crosshair so it reads as
 * an instrument rather than a novelty cursor.
 *
 * Fine pointers only. Under reduced motion the real cursor comes back.
 */
export default function Reticle() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    setEnabled(true);
    document.documentElement.classList.add("cursor-host");

    let frame = 0;
    let x = -100;
    let y = -100;

    const paint = () => {
      frame = 0;
      const node = ref.current;
      if (node) node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      setVisible(true);

      // Grow over anything the visitor can actually act on.
      const target = event.target as Element | null;
      setActive(
        !!target?.closest?.(
          'a, button, input, textarea, select, [role="button"], [data-reticle="grow"]',
        ),
      );

      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("cursor-host");
    };
  }, [reduced]);

  if (!enabled) return null;

  const size = active ? 46 : 22;

  return (
    <div
      ref={ref}
      className="reticle"
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 46 46"
        style={{
          transform: "translate(-50%, -50%)",
          transition: "width .28s cubic-bezier(.16,1,.3,1), height .28s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* Corner brackets — a frame being set */}
        <g stroke="#e7e2d7" strokeWidth={1.5} fill="none" opacity={active ? 1 : 0}
           style={{ transition: "opacity .2s linear" }}>
          <path d="M4 13V4h9M33 4h9v9M42 33v9h-9M13 42H4v-9" />
        </g>
        {/* Crosshair */}
        <g stroke="#e7e2d7" strokeWidth={1}>
          <line x1="23" y1="15" x2="23" y2="21" />
          <line x1="23" y1="25" x2="23" y2="31" />
          <line x1="15" y1="23" x2="21" y2="23" />
          <line x1="25" y1="23" x2="31" y2="23" />
        </g>
        <circle cx="23" cy="23" r="1.25" fill="#e7e2d7" />
      </svg>
    </div>
  );
}
