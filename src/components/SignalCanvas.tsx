"use client";

import { useEffect, useRef } from "react";
import { disciplines, type TraceKind } from "@/lib/disciplines";
import { useReducedMotion } from "@/lib/hooks";

/**
 * ============================================================================
 * THE SIGNATURE ELEMENT
 * ============================================================================
 * Five simultaneous signal traces, one per discipline, each drawn with the
 * character of the thing it represents:
 *
 *   bezier   graphics       a drawn curve, smooth and deliberate
 *   step     software       quantised — logic moves in discrete states
 *   sine     sound          summed harmonics, the shape of pressure
 *   ramp     cinematography a travelling exposure bloom, light over time
 *   impulse  photography    flat, then one decisive spike
 *
 * Together they are the argument the whole site makes: five disciplines, one
 * practice — shaping signal. A single-discipline portfolio could not use this.
 *
 * The trace nearest the pointer brightens and the pointer displaces all five
 * locally, like a finger touching a string. Under reduced motion it renders
 * one static frame and never animates.
 * ============================================================================
 */

/** Per-discipline waveform character. Returns a -1..1 offset. */
function traceValue(kind: TraceKind, x: number, t: number, seed: number): number {
  switch (kind) {
    // Sound — three summed harmonics.
    case "sine":
      return (
        0.58 * Math.sin(x * 0.017 + t * 1.5 + seed) +
        0.28 * Math.sin(x * 0.043 - t * 2.1) +
        0.14 * Math.sin(x * 0.006 + t * 0.7)
      );

    // Software — quantised into discrete states.
    case "step": {
      const smooth =
        0.7 * Math.sin(x * 0.009 + t * 0.8 + seed) +
        0.3 * Math.sin(x * 0.021 - t * 1.1);
      const levels = 7;
      return Math.round(smooth * levels) / levels;
    }

    // Cinematography — a travelling gaussian bloom. Light over time.
    case "ramp": {
      const period = 620;
      const head = ((t * 78 + seed * 200) % (period * 1.7)) - period * 0.35;
      const sigma = 96;
      const bloom = Math.exp(-((x - head) ** 2) / (2 * sigma ** 2));
      const falloff = 0.16 * Math.sin(x * 0.011 + t * 0.5);
      return -bloom * 0.95 + falloff;
    }

    // Photography — flat, then one sharp decaying spike. The decisive instant.
    case "impulse": {
      const cycle = 3.4;
      const phase = (t + seed * 2) % cycle;
      // Spike position walks so it doesn't fire in the same place each time.
      const at = 120 + ((Math.floor((t + seed * 2) / cycle) * 197) % 640);
      const age = phase;
      if (age > 0.9) return 0.035 * Math.sin(x * 0.05 + t);
      const decay = Math.exp(-age * 5.5);
      const width = 9;
      const spike = Math.exp(-((x - at) ** 2) / (2 * width ** 2));
      const ring = Math.exp(-((x - at) ** 2) / (2 * 46 ** 2)) * Math.sin((x - at) * 0.12);
      return (spike * 1.05 + ring * 0.22) * decay + 0.03 * Math.sin(x * 0.05 + t);
    }

    // Graphics — one long, deliberate drawn arc.
    case "bezier": {
      const drift = t * 0.35 + seed;
      return (
        0.72 * Math.sin(x * 0.0042 + drift) +
        0.2 * Math.sin(x * 0.0115 + drift * 1.6)
      );
    }
  }
}

export default function SignalCanvas({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;
    let t = 0;

    // Pointer state, in canvas-local pixels. -1 means "no pointer".
    const pointer = { x: -1, y: -1, strength: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** Vertical centre of trace i, as a fraction of height. */
    const centreOf = (i: number) => (height * (i + 0.85)) / (disciplines.length + 0.7);

    const drawGrid = () => {
      // Baseline reference for each trace, plus an edge tick scale. The point
      // is that the traces read as measured against something.
      ctx.save();
      ctx.strokeStyle = "rgba(34,52,58,0.85)";
      ctx.lineWidth = 1;

      for (let i = 0; i < disciplines.length; i++) {
        const y = Math.round(centreOf(i)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(34,52,58,0.7)";
      for (let x = 0; x < width; x += 24) {
        const tall = x % 120 === 0;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, height);
        ctx.lineTo(Math.round(x) + 0.5, height - (tall ? 11 : 5));
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawTrace = (index: number, time: number) => {
      const discipline = disciplines[index]!;
      const centre = centreOf(index);
      const gap = height / (disciplines.length + 0.7);
      const amplitude = gap * 0.4;

      // Brighten the trace the pointer is closest to. The resting state still
      // has to read confidently on its own — this is the first thing anyone
      // sees, and hover is not guaranteed to happen at all.
      const proximity =
        pointer.y < 0 ? 0 : Math.max(0, 1 - Math.abs(pointer.y - centre) / (gap * 0.85));
      const alpha = 0.62 + proximity * 0.38;

      ctx.save();
      ctx.strokeStyle = discipline.hex;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.6 + proximity * 0.9;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      if (proximity > 0.5) {
        ctx.shadowColor = discipline.hex;
        ctx.shadowBlur = 12 * proximity;
      }

      ctx.beginPath();

      const stepPx = discipline.trace === "step" ? 4 : 2;

      for (let x = 0; x <= width; x += stepPx) {
        let value = traceValue(discipline.trace, x, time, index * 0.9);

        // Pointer displacement — a local bump, strongest at the cursor.
        if (pointer.x >= 0 && pointer.strength > 0) {
          const reach = 130;
          const dx = x - pointer.x;
          const bump = Math.exp(-(dx * dx) / (2 * (reach / 2.4) ** 2));
          value -= bump * pointer.strength * (0.55 + proximity * 0.5);
        }

        const y = centre + value * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.restore();
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      drawGrid();
      for (let i = 0; i < disciplines.length; i++) drawTrace(i, time);
    };

    const loop = () => {
      if (!running) return;
      t += 1 / 60;
      pointer.strength += ((pointer.x >= 0 ? 1 : 0) - pointer.strength) * 0.08;
      render(t);
      frame = window.requestAnimationFrame(loop);
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) render(1.2);
    });
    observer.observe(canvas);

    // Static single frame — nothing moves, nothing is lost.
    if (reduced) {
      render(1.2);
      return () => observer.disconnect();
    }

    // Stop the loop whenever the canvas is off screen or the tab is hidden.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        const shouldRun = !!entry?.isIntersecting && !document.hidden;
        if (shouldRun && !running) {
          running = true;
          frame = window.requestAnimationFrame(loop);
        } else if (!shouldRun) {
          running = false;
          if (frame) window.cancelAnimationFrame(frame);
        }
      },
      { threshold: 0 },
    );
    visibility.observe(canvas);

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const onPointerLeave = () => {
      pointer.x = -1;
      pointer.y = -1;
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (frame) window.cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = window.requestAnimationFrame(loop);
      }
    };

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    frame = window.requestAnimationFrame(loop);

    return () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="block h-[240px] w-full touch-none sm:h-[300px] lg:h-[340px]"
        role="img"
        aria-label="Five animated signal traces, one for each discipline: graphic design, software engineering, sound engineering, cinematography and mobile photography."
      />

      {/* Trace labels, keyed to the same order the canvas draws in. */}
      <ul
        className="pointer-events-none absolute inset-0 hidden md:block"
        aria-hidden="true"
      >
        {disciplines.map((d, i) => (
          <li
            key={d.id}
            className="mono-data absolute right-0 -translate-y-1/2 pr-1 text-[10px] tracking-[0.16em] uppercase"
            style={{
              top: `${((i + 0.85) / (disciplines.length + 0.7)) * 100}%`,
              color: d.hex,
              opacity: 0.72,
            }}
          >
            {d.trace}
          </li>
        ))}
      </ul>
    </div>
  );
}
