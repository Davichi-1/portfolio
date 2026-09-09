import { NextResponse } from "next/server";
import { contactSchema, type ContactResponse } from "@/lib/contact-schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendContactEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: ContactResponse, status: number, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers });

export async function POST(request: Request) {
  // 1. Throttle before doing any work.
  const ip = clientIp(request.headers);
  const limit = rateLimit(`contact:${ip}`);

  if (!limit.allowed) {
    return json(
      {
        ok: false,
        message: `That's a few messages in a short window. Try again in ${Math.ceil(
          limit.retryAfterSeconds / 60,
        )} minutes, or email me directly.`,
      },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  // 2. Parse the body defensively — malformed JSON is a client error, not a crash.
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(
      { ok: false, message: "That request wasn't readable. Try again." },
      400,
    );
  }

  // 3. The schema is the only thing trusted here.
  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    // Honeypot tripped: answer as if it succeeded so bots learn nothing.
    if (fieldErrors.company) {
      return json(
        { ok: true, message: "Message received.", delivered: false },
        200,
      );
    }

    return json(
      {
        ok: false,
        message: "Some fields need another look.",
        fieldErrors: fieldErrors as Record<string, string[]>,
      },
      422,
    );
  }

  // 4. Deliver. A provider failure must not lose the enquiry, so the mailer
  //    logs it server-side and we still confirm receipt to the visitor.
  const result = await sendContactEmail(parsed.data);

  return json(
    {
      ok: true,
      message: result.delivered
        ? "Message sent. I reply within two working days."
        : "Message received. I reply within two working days.",
      delivered: result.delivered,
    },
    200,
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "POST a contact enquiry to this endpoint." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
