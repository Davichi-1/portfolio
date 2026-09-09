import { z } from "zod";
import { disciplines } from "./disciplines";

const disciplineIds = disciplines.map((d) => d.id);

/**
 * Shared between the client form and the API route, so validation rules can
 * never drift apart. The client uses it for inline errors; the server treats
 * it as the only thing it trusts.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell me what to call you.")
    .max(80, "That's longer than 80 characters."),

  email: z
    .string()
    .trim()
    .min(1, "I need an email to reply to.")
    .max(160, "That's longer than 160 characters.")
    .email("Check the email address — it doesn't look complete."),

  discipline: z
    .string()
    .refine((v) => v === "unsure" || disciplineIds.includes(v), {
      message: "Pick one of the listed options.",
    }),

  budget: z
    .enum(["under-500k", "500k-2m", "2m-plus", "not-sure", ""])
    .optional()
    .default(""),

  message: z
    .string()
    .trim()
    .min(20, "A little more detail — 20 characters at minimum.")
    .max(4000, "Keep it under 4000 characters."),

  /**
   * Honeypot. Hidden from humans and from screen readers; bots fill it in.
   * Named plausibly so autofill-style scrapers take the bait.
   */
  company: z.string().max(0, "Rejected.").optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const budgetOptions = [
  { value: "", label: "Prefer not to say" },
  { value: "under-500k", label: "Under ₦500,000" },
  { value: "500k-2m", label: "₦500,000 – ₦2,000,000" },
  { value: "2m-plus", label: "₦2,000,000+" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

export const budgetLabel = (value: string) =>
  budgetOptions.find((b) => b.value === value)?.label ?? "Not specified";

export type ContactResponse =
  | { ok: true; message: string; delivered: boolean }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
