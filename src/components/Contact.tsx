"use client";

import { useId, useState } from "react";
import { disciplines } from "@/lib/disciplines";
import { profile } from "@/lib/profile";
import {
  budgetOptions,
  contactSchema,
  type ContactResponse,
} from "@/lib/contact-schema";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

type Status = "idle" | "sending" | "sent" | "error";

const EMPTY = {
  name: "",
  email: "",
  discipline: "unsure",
  budget: "",
  message: "",
  company: "",
};

const fieldClass =
  "mt-2 w-full border border-line bg-ink-3/60 px-3.5 py-3 text-[0.9375rem] text-bone " +
  "transition-colors placeholder:text-bone-3 hover:border-line-bright " +
  "focus:border-amber focus:outline-none disabled:opacity-55";

export default function Contact() {
  const uid = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState("");

  const set = (field: keyof typeof EMPTY) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear the error the moment the visitor starts addressing it.
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    // Validate with the same schema the server uses, so the rules can't drift.
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: Record<string, string> = {};
      for (const [key, list] of Object.entries(flat)) {
        if (list?.[0]) next[key] = list[0];
      }
      setErrors(next);
      setStatus("error");
      setNotice("Some fields need another look.");
      return;
    }

    setStatus("sending");
    setNotice("");
    setErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result: ContactResponse = await response.json();

      if (!result.ok) {
        if (result.fieldErrors) {
          const next: Record<string, string> = {};
          for (const [key, list] of Object.entries(result.fieldErrors)) {
            if (list?.[0]) next[key] = list[0];
          }
          setErrors(next);
        }
        setStatus("error");
        setNotice(result.message);
        return;
      }

      setStatus("sent");
      setNotice(result.message);
      setValues(EMPTY);
    } catch {
      setStatus("error");
      setNotice(
        `That didn't go through. Email me directly at ${profile.email}.`,
      );
    }
  }

  const sending = status === "sending";

  const Error = ({ field }: { field: string }) =>
    errors[field] ? (
      <p
        id={`${uid}-${field}-error`}
        className="mono-data mt-2 text-[11px] text-magenta"
      >
        {errors[field]}
      </p>
    ) : null;

  const describedBy = (field: string) =>
    errors[field] ? `${uid}-${field}-error` : undefined;

  return (
    <section id="contact" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeader
        timecode="00:05:00:00"
        label="Contact"
        title="Tell me what you're making"
        lead="A few lines is enough to start. What it's for, roughly when you need it, and which channel you think it lives on — I'll come back with questions and a price."
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
        {/* The form */}
        <Reveal>
          <form onSubmit={onSubmit} noValidate className="panel p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-name`} className="mono-label">
                  Your name
                </label>
                <input
                  id={`${uid}-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={sending}
                  value={values.name}
                  onChange={(e) => set("name")(e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={describedBy("name")}
                  placeholder="David Tobias"
                  className={fieldClass}
                />
                <Error field="name" />
              </div>

              <div>
                <label htmlFor={`${uid}-email`} className="mono-label">
                  Email
                </label>
                <input
                  id={`${uid}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={sending}
                  value={values.email}
                  onChange={(e) => set("email")(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={describedBy("email")}
                  placeholder="you@studio.com"
                  className={fieldClass}
                />
                <Error field="email" />
              </div>

              <div>
                <label htmlFor={`${uid}-discipline`} className="mono-label">
                  Which channel
                </label>
                <select
                  id={`${uid}-discipline`}
                  name="discipline"
                  disabled={sending}
                  value={values.discipline}
                  onChange={(e) => set("discipline")(e.target.value)}
                  aria-invalid={!!errors.discipline}
                  aria-describedby={describedBy("discipline")}
                  className={fieldClass}
                >
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                  <option value="unsure">Not sure yet — help me scope it</option>
                </select>
                <Error field="discipline" />
              </div>

              <div>
                <label htmlFor={`${uid}-budget`} className="mono-label">
                  Budget
                </label>
                <select
                  id={`${uid}-budget`}
                  name="budget"
                  disabled={sending}
                  value={values.budget}
                  onChange={(e) => set("budget")(e.target.value)}
                  className={fieldClass}
                >
                  {budgetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={`${uid}-message`} className="mono-label">
                  The brief
                </label>
                <textarea
                  id={`${uid}-message`}
                  name="message"
                  rows={6}
                  required
                  disabled={sending}
                  value={values.message}
                  onChange={(e) => set("message")(e.target.value)}
                  aria-invalid={!!errors.message}
                  aria-describedby={describedBy("message")}
                  placeholder="What you're making, who it's for, and the deadline you're working to."
                  className={`${fieldClass} resize-y`}
                />
                <div className="mt-2 flex items-baseline justify-between gap-4">
                  <Error field="message" />
                  <span className="mono-data ml-auto text-[10px] text-bone-3">
                    {values.message.trim().length} / 4000
                  </span>
                </div>
              </div>
            </div>

            {/* Honeypot — hidden from people and assistive tech, not from bots */}
            <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor={`${uid}-company`}>Company</label>
              <input
                id={`${uid}-company`}
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={values.company}
                onChange={(e) => set("company")(e.target.value)}
              />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-line pt-6">
              <button
                type="submit"
                disabled={sending}
                className="mono-label group flex items-center gap-3 bg-amber px-5 py-3.5 text-ink transition-colors hover:bg-bone disabled:cursor-wait disabled:opacity-60"
              >
                {sending ? "Sending" : status === "sent" ? "Send another" : "Send it"}
                <span
                  className={`transition-transform duration-300 ${sending ? "" : "group-hover:translate-x-1"}`}
                  aria-hidden="true"
                >
                  {sending ? "•••" : "→"}
                </span>
              </button>

              {/* One live region for every outcome, so nothing is announced twice */}
              <p
                role="status"
                aria-live="polite"
                className={`mono-data flex-1 text-[11px] leading-relaxed ${
                  status === "sent"
                    ? "text-mint"
                    : status === "error"
                      ? "text-magenta"
                      : "text-bone-3"
                }`}
              >
                {notice ||
                  (sending ? "Sending…" : "Two working days, usually sooner.")}
              </p>
            </div>
          </form>
        </Reveal>

        {/* Direct routes, for anyone who would rather skip the form */}
        <Reveal delay={120}>
          <div className="flex flex-col gap-4">
            <div className="panel">
              <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <span className="mono-label">Direct</span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>

              <ul className="px-5 py-1">
                <li className="border-b border-line/60 py-4">
                  <span className="mono-label block">Email</span>
                  <a
                    href={`mailto:${profile.email}`}
                    className="link-wipe mt-1.5 inline-block text-[0.9375rem] break-all text-bone transition-colors hover:text-amber"
                  >
                    {profile.email}
                  </a>
                </li>
                <li className="border-b border-line/60 py-4">
                  <span className="mono-label block">Phone / WhatsApp</span>
                  <a
                    href={`tel:${profile.phoneHref}`}
                    className="link-wipe mono-data mt-1.5 inline-block text-[0.9375rem] text-bone transition-colors hover:text-amber"
                  >
                    {profile.phoneDisplay}
                  </a>
                  <span className="mono-data mt-1 block text-[11px] text-bone-3">
                    {profile.phoneInternational}
                  </span>
                </li>
                <li className="py-4">
                  <span className="mono-label block">Based</span>
                  <span className="mt-1.5 block text-[0.9375rem] text-bone">
                    {profile.locationLong}
                  </span>
                  <span className="mono-data mt-1 block text-[11px] text-bone-3">
                    {profile.timezone} — remote worldwide
                  </span>
                </li>
              </ul>
            </div>

            <div className="panel p-5">
              <p className="text-[0.9375rem] leading-[1.6] text-bone-2 text-pretty">
                Working to a tight deadline? Say so in the first line. I&apos;d
                rather turn something down than take it and miss the date.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
