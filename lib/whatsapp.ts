/**
 * WhatsApp Business (Meta Cloud API) plumbing.
 *
 * See docs/rebuild/06-whatsapp-business.md. This module is deliberately free of
 * network calls and of Prisma: it holds the parts that are easy to get wrong and
 * expensive to get wrong — Nigerian phone-number normalisation, template
 * payload shape, webhook signature verification, delivery/stall classification —
 * so that the adapter in lib/notifications.ts stays a thin transport shell and
 * every rule below is unit-testable.
 *
 * No migration was needed to reach this point: `AlertChannel.WHATSAPP` already
 * exists in the Prisma schema and the dispatcher already treats an unconfigured
 * channel as SKIPPED rather than SENT.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------
   Phone numbers
   ------------------------------------------------------------------ */

/**
 * Normalise any Nigerian number a parent types or a spreadsheet contains into
 * E.164 (`+2348012345678`). Returns null when the input is not a Nigerian
 * mobile number — callers must skip, not guess.
 *
 * Handles: 08012345678 · 8012345678 · 2348012345678 · +234 801 234 5678 ·
 * 23408012345678 (the double-prefix form Excel loves) · spaces, dashes, dots.
 */
export function normalizeNgPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw)
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");

  let national: string;
  if (/^0\d{10}$/.test(digits)) {
    national = digits.slice(1); // 0801… → 801…
  } else if (/^2340\d{10}$/.test(digits)) {
    national = digits.slice(4); // 2340801… → 801…
  } else if (/^234\d{10}$/.test(digits)) {
    national = digits.slice(3);
  } else if (/^\d{10}$/.test(digits)) {
    national = digits; // already stripped of the leading zero
  } else {
    return null;
  }

  // Nigerian mobile numbers are 7xx/8xx/9xx after the country code.
  if (!/^[789]\d{9}$/.test(national)) return null;
  return `+234${national}`;
}

/** Cloud API wants the number without "+", e.g. "2348012345678". */
export function toWaRecipient(e164: string): string | null {
  const normalized = normalizeNgPhone(e164);
  return normalized ? normalized.slice(1) : null;
}

export function maskPhone(e164: string | null): string {
  if (!e164) return "—";
  const digits = e164.replace(/\D/g, "");
  return digits.length < 6 ? "—" : `+${digits.slice(0, 3)}•••${digits.slice(-3)}`;
}

/* ------------------------------------------------------------------
   Outbound payloads
   ------------------------------------------------------------------ */

/**
 * The two payload shapes, deliberately discriminated on `type` so callers can
 * switch on it (and so `message.template` is reachable without a cast). The
 * `?: undefined` members are what make that narrowing work.
 */
export type WhatsAppOutbound =
  | {
      messaging_product: "whatsapp";
      recipient_type: "individual";
      to: string;
      type: "text";
      text: { preview_url: boolean; body: string };
      template?: undefined;
    }
  | {
      messaging_product: "whatsapp";
      recipient_type: "individual";
      to: string;
      type: "template";
      template: {
        name: string;
        language: { code: string };
        components?: { type: "body"; parameters: { type: "text"; text: string }[] }[];
      };
      text?: undefined;
    };

export function buildTextMessage(input: { to: string; body: string }): WhatsAppOutbound | null {
  const to = toWaRecipient(input.to);
  const body = input.body?.trim();
  if (!to || !body) return null;
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body },
  };
}

/**
 * A template send. Templates are the ONLY way to message a parent outside the
 * 24-hour customer-service window, which is most fee reminders and result
 * alerts, so this is the common path rather than the exception.
 *
 * Variables are positional (`{{1}}`, `{{2}}`) and Meta rejects the send when the
 * parameter count does not match the approved template — validate before
 * queueing, not at send time.
 */
export function buildTemplateMessage(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  variables?: readonly string[];
}): WhatsAppOutbound | null {
  const to = toWaRecipient(input.to);
  const name = input.templateName?.trim();
  if (!to || !name) return null;

  const variables = (input.variables ?? []).map((v) => String(v));
  const message: WhatsAppOutbound = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name,
      language: { code: input.languageCode || "en" },
    },
  };
  if (variables.length > 0) {
    message.template.components = [
      { type: "body", parameters: variables.map((text) => ({ type: "text", text })) },
    ];
  }
  return message;
}

/** Preview/log rendering of a template body with its variables substituted. */
export function renderTemplateBody(bodyTemplate: string, variables: readonly string[]): string {
  return bodyTemplate.replace(/\{\{(\d+)\}\}/g, (_match, index: string) => {
    const value = variables[Number(index) - 1];
    return value === undefined ? `{{${index}}}` : value;
  });
}

export function countTemplateVariables(bodyTemplate: string): number {
  const found = new Set<string>();
  for (const match of bodyTemplate.matchAll(/\{\{(\d+)\}\}/g)) found.add(match[1]);
  return found.size;
}

/** Cheap pre-flight guard so a bad template never reaches the queue. */
export function templateVariablesMatch(
  bodyTemplate: string,
  variables: readonly string[],
): boolean {
  return countTemplateVariables(bodyTemplate) === variables.length;
}

/* ------------------------------------------------------------------
   Inbound webhooks
   ------------------------------------------------------------------ */

/**
 * Verify `X-Hub-Signature-256` over the RAW request body.
 *
 * Next.js route handlers parse JSON by default; the signature is computed over
 * the raw bytes, so the route must read `await request.text()` and hash that
 * exact string. Verifying a re-serialised object silently fails in production
 * only — which is why this lives here with a test.
 */
export function verifyWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  appSecret: string | null | undefined;
}): boolean {
  const { rawBody, signatureHeader, appSecret } = input;
  if (!rawBody || !signatureHeader || !appSecret) return false;

  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** GET handshake Meta performs when the webhook URL is saved. */
export function parseVerifyHandshake(input: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  expectedToken: string | null | undefined;
}): { ok: boolean; challenge: string | null } {
  const { mode, token, challenge, expectedToken } = input;
  const ok = mode === "subscribe" && Boolean(expectedToken) && token === expectedToken;
  return { ok, challenge: ok ? challenge : null };
}

export type WaStatusName = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
export type WaStatusEvent = {
  waMessageId: string;
  status: WaStatusName;
  timestamp: Date | null;
  errorCode: number | null;
  errorTitle: string | null;
};
export type WaInboundMessage = {
  waMessageId: string;
  from: string | null;
  text: string | null;
  timestamp: Date | null;
  type: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asDate(seconds: unknown): Date | null {
  const n =
    typeof seconds === "string"
      ? Number(seconds)
      : typeof seconds === "number"
        ? seconds
        : Number.NaN;
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

export function mapDeliveryStatus(status: string | null | undefined): WaStatusName | null {
  switch ((status || "").toLowerCase()) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    default:
      return null;
  }
}

/**
 * Pull delivery statuses and inbound messages out of a Cloud API webhook body.
 * Unknown shapes return empty arrays rather than throwing: Meta retries hard,
 * and a malformed payload must not 500 the endpoint into a retry storm.
 */
export function extractWebhookEvents(payload: unknown): {
  statuses: WaStatusEvent[];
  messages: WaInboundMessage[];
} {
  const statuses: WaStatusEvent[] = [];
  const messages: WaInboundMessage[] = [];

  const root = asRecord(payload);
  const entries = Array.isArray(root?.entry) ? (root.entry as unknown[]) : [];

  for (const entry of entries) {
    const changes = Array.isArray(asRecord(entry)?.changes)
      ? (asRecord(entry)!.changes as unknown[])
      : [];
    for (const change of changes) {
      const value = asRecord(asRecord(change)?.value);
      if (!value) continue;

      const rawStatuses = Array.isArray(value.statuses) ? (value.statuses as unknown[]) : [];
      for (const raw of rawStatuses) {
        const record = asRecord(raw);
        const waMessageId = asString(record?.id);
        const status = mapDeliveryStatus(asString(record?.status));
        if (!record || !waMessageId || !status) continue;
        const errors = Array.isArray(record.errors) ? (record.errors as unknown[]) : [];
        const firstError = asRecord(errors[0]);
        statuses.push({
          waMessageId,
          status,
          timestamp: asDate(record.timestamp),
          errorCode: typeof firstError?.code === "number" ? firstError.code : null,
          errorTitle: asString(firstError?.title),
        });
      }

      const rawMessages = Array.isArray(value.messages) ? (value.messages as unknown[]) : [];
      for (const raw of rawMessages) {
        const record = asRecord(raw);
        const waMessageId = asString(record?.id);
        if (!record || !waMessageId) continue;
        const text = asRecord(record.text);
        messages.push({
          waMessageId,
          from: asString(record.from),
          text: asString(text?.body),
          timestamp: asDate(record.timestamp),
          type: asString(record.type) ?? "unknown",
        });
      }
    }
  }

  return { statuses, messages };
}

/* ------------------------------------------------------------------
   Errors, configuration, windows
   ------------------------------------------------------------------ */

/**
 * Meta error codes worth treating as permanent. Anything classified permanent
 * must never be retried — the dispatcher would burn three attempts and then
 * fail anyway, while the notification history loses the real reason.
 */
const PERMANENT_META_CODES = new Set([
  131026, // message undeliverable / recipient not on WhatsApp
  131047, // re-engagement: outside the 24h window and not a template
  131051, // unsupported message type
  132000, // template parameter count mismatch
  132001, // template does not exist
  132005, // template paused/disabled
  132007, // template content violated policy
  132012, // template parameter format mismatch
  131056, // pair rate limit (same sender→recipient too fast)
]);

export function classifyMetaError(code: number | null | undefined): {
  permanent: boolean;
  retryable: boolean;
  reason: string;
} {
  if (typeof code !== "number") {
    return { permanent: false, retryable: true, reason: "Unknown transport failure" };
  }
  if (PERMANENT_META_CODES.has(code)) {
    return { permanent: true, retryable: false, reason: `Permanent WhatsApp error ${code}` };
  }
  if (code === 130429 || code === 80007) {
    return { permanent: false, retryable: true, reason: `WhatsApp rate limit ${code} — back off` };
  }
  return { permanent: false, retryable: true, reason: `WhatsApp error ${code}` };
}

export function isWhatsAppConfigured(env: Partial<NodeJS.ProcessEnv> = process.env): boolean {
  return Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Is a free-form (non-template) message allowed right now? Only inside 24 hours
 * of the parent's last inbound message. The portal's reply box uses this to tell
 * staff why a message would need a template instead.
 */
export function inServiceWindow(lastInboundAt: Date | null | undefined, now: Date): boolean {
  if (!lastInboundAt) return false;
  const elapsed = now.getTime() - lastInboundAt.getTime();
  return elapsed >= 0 && elapsed <= SERVICE_WINDOW_MS;
}

export function serviceWindowClosesAt(lastInboundAt: Date): Date {
  return new Date(lastInboundAt.getTime() + SERVICE_WINDOW_MS);
}
