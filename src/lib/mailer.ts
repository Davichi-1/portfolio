import { profile } from "./profile";
import { disciplineById } from "./disciplines";
import { budgetLabel, type ContactInput } from "./contact-schema";

/**
 * Email delivery for the contact form.
 *
 * Degrades on purpose: with no RESEND_API_KEY the enquiry is logged to the
 * server console and the submission is still reported as successful to the
 * visitor. That keeps local development working with zero setup, and means a
 * missing env var in production loses the notification rather than the lead.
 */

type SendResult =
  | { delivered: true }
  | { delivered: false; reason: "not-configured" | "provider-error" };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buildSubject(input: ContactInput) {
  const discipline =
    input.discipline === "unsure"
      ? "General"
      : (disciplineById(input.discipline)?.name ?? "General");
  return `[Portfolio] ${discipline} — ${input.name}`;
}

function buildHtml(input: ContactInput, receivedAt: string) {
  const discipline =
    input.discipline === "unsure"
      ? "Not sure yet"
      : (disciplineById(input.discipline)?.name ?? input.discipline);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #22343a;color:#6d7877;
                 font:500 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
                 letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;
                 vertical-align:top;">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #22343a;color:#e7e2d7;
                 font:400 15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        ${value}
      </td>
    </tr>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0b1114;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         style="max-width:640px;margin:0 auto;width:100%;background:#0f181c;
                border:1px solid #22343a;border-radius:4px;overflow:hidden;">
    <tr>
      <td style="padding:20px 16px;border-bottom:1px solid #22343a;background:#141f24;">
        <div style="color:#e8b33c;font:500 11px/1 ui-monospace,Menlo,monospace;
                    letter-spacing:.2em;text-transform:uppercase;">
          ● New enquiry
        </div>
        <div style="color:#6d7877;font:400 11px/1.6 ui-monospace,Menlo,monospace;
                    margin-top:6px;">${escapeHtml(receivedAt)}</div>
      </td>
    </tr>
    ${row("From", escapeHtml(input.name))}
    ${row(
      "Email",
      `<a href="mailto:${escapeHtml(input.email)}" style="color:#3fbfd1;text-decoration:none;">${escapeHtml(input.email)}</a>`,
    )}
    ${row("Discipline", escapeHtml(discipline))}
    ${row("Budget", escapeHtml(budgetLabel(input.budget ?? "")))}
    <tr>
      <td colspan="2" style="padding:20px 16px;">
        <div style="color:#6d7877;font:500 11px/1 ui-monospace,Menlo,monospace;
                    letter-spacing:.14em;text-transform:uppercase;margin-bottom:12px;">
          Message
        </div>
        <div style="color:#e7e2d7;font:400 15px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    white-space:pre-wrap;">${escapeHtml(input.message)}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:16px;border-top:1px solid #22343a;background:#0b1114;
                             color:#6d7877;font:400 11px/1.5 ui-monospace,Menlo,monospace;">
        Sent from ${escapeHtml(profile.fullName.toLowerCase())} portfolio contact form.
        Reply directly to reach ${escapeHtml(input.name)}.
      </td>
    </tr>
  </table>
</body></html>`;
}

function buildText(input: ContactInput, receivedAt: string) {
  const discipline =
    input.discipline === "unsure"
      ? "Not sure yet"
      : (disciplineById(input.discipline)?.name ?? input.discipline);

  return [
    "NEW ENQUIRY",
    receivedAt,
    "",
    `From:       ${input.name}`,
    `Email:      ${input.email}`,
    `Discipline: ${discipline}`,
    `Budget:     ${budgetLabel(input.budget ?? "")}`,
    "",
    "Message",
    "-------",
    input.message,
  ].join("\n");
}

export async function sendContactEmail(
  input: ContactInput,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || profile.email;
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";

  const receivedAt = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  if (!apiKey) {
    console.info(
      "\n[contact] RESEND_API_KEY not set — enquiry logged instead of emailed:\n" +
        buildText(input, receivedAt) +
        "\n",
    );
    return { delivered: false, reason: "not-configured" };
  }

  try {
    // Imported lazily so the module is never loaded when email is unconfigured.
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: `Portfolio <${from}>`,
      to: [to],
      replyTo: input.email,
      subject: buildSubject(input),
      html: buildHtml(input, receivedAt),
      text: buildText(input, receivedAt),
    });

    if (error) {
      console.error("[contact] Resend rejected the send:", error);
      return { delivered: false, reason: "provider-error" };
    }

    return { delivered: true };
  } catch (error) {
    console.error("[contact] Email send threw:", error);
    return { delivered: false, reason: "provider-error" };
  }
}
