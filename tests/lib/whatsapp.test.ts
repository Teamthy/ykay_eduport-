import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  SERVICE_WINDOW_MS,
  buildTemplateMessage,
  buildTextMessage,
  classifyMetaError,
  countTemplateVariables,
  extractWebhookEvents,
  inServiceWindow,
  isWhatsAppConfigured,
  mapDeliveryStatus,
  maskPhone,
  normalizeNgPhone,
  parseVerifyHandshake,
  renderTemplateBody,
  serviceWindowClosesAt,
  templateVariablesMatch,
  toWaRecipient,
  verifyWebhookSignature,
} from "@/lib/whatsapp";

describe("Nigerian phone normalisation", () => {
  it("accepts every format a spreadsheet or a parent will produce", () => {
    const expected = "+2348012345678";
    expect(normalizeNgPhone("08012345678")).toBe(expected);
    expect(normalizeNgPhone("8012345678")).toBe(expected);
    expect(normalizeNgPhone("+2348012345678")).toBe(expected);
    expect(normalizeNgPhone("2348012345678")).toBe(expected);
    expect(normalizeNgPhone("23408012345678")).toBe(expected); // the Excel double-prefix
    expect(normalizeNgPhone("+234 801 234 5678")).toBe(expected);
    expect(normalizeNgPhone("0801-234-5678")).toBe(expected);
    expect(normalizeNgPhone("  0801 234 5678  ")).toBe(expected);
  });

  it("accepts the 7xx/8xx/9xx prefixes and rejects everything else", () => {
    expect(normalizeNgPhone("07012345678")).toBe("+2347012345678");
    expect(normalizeNgPhone("09123456789")).toBe("+2349123456789");

    expect(normalizeNgPhone("03012345678")).toBeNull(); // not a mobile prefix
    expect(normalizeNgPhone("0801234567")).toBeNull(); // too short
    expect(normalizeNgPhone("080123456789")).toBeNull(); // too long
    expect(normalizeNgPhone("not a phone")).toBeNull();
    expect(normalizeNgPhone("")).toBeNull();
    expect(normalizeNgPhone(null)).toBeNull();
    expect(normalizeNgPhone(undefined)).toBeNull();
  });

  it("strips the plus for the Cloud API and masks numbers in logs", () => {
    expect(toWaRecipient("+2348012345678")).toBe("2348012345678");
    expect(toWaRecipient("08012345678")).toBe("2348012345678");
    expect(toWaRecipient("nonsense")).toBeNull();
    expect(maskPhone("+2348012345678")).toBe("+234•••678");
    expect(maskPhone(null)).toBe("—");
  });
});

describe("outbound message shapes", () => {
  it("builds a free-form text message", () => {
    const message = buildTextMessage({ to: "08012345678", body: "  Your receipt is ready.  " });
    expect(message).toMatchObject({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "2348012345678",
      type: "text",
      text: { preview_url: false, body: "Your receipt is ready." },
    });
  });

  it("refuses to build a message for an invalid number or empty body", () => {
    expect(buildTextMessage({ to: "123", body: "hi" })).toBeNull();
    expect(buildTextMessage({ to: "08012345678", body: "   " })).toBeNull();
  });

  it("builds a template message with positional variables", () => {
    const message = buildTemplateMessage({
      to: "08012345678",
      templateName: "fee_reminder",
      variables: ["Amina Okafor", "₦45,000.00", "31 Oct 2026"],
    });
    expect(message?.template).toMatchObject({
      name: "fee_reminder",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Amina Okafor" },
            { type: "text", text: "₦45,000.00" },
            { type: "text", text: "31 Oct 2026" },
          ],
        },
      ],
    });
  });

  it("omits components for a template with no variables", () => {
    const message = buildTemplateMessage({ to: "08012345678", templateName: "welcome" });
    expect(message?.template?.components).toBeUndefined();
  });
});

describe("template body rendering and pre-flight checks", () => {
  const body = "Dear {{1}}, the balance for {{2}} is {{3}}. Pay before {{4}}.";

  it("counts distinct variables, not occurrences", () => {
    expect(countTemplateVariables(body)).toBe(4);
    expect(countTemplateVariables("Hi {{1}}, hi again {{1}}")).toBe(1);
    expect(countTemplateVariables("No variables here")).toBe(0);
  });

  it("renders variables for the message log", () => {
    expect(renderTemplateBody(body, ["Amina", "JSS 2", "₦5,000", "31 Oct"])).toBe(
      "Dear Amina, the balance for JSS 2 is ₦5,000. Pay before 31 Oct.",
    );
  });

  it("leaves placeholders intact when a variable is missing", () => {
    expect(renderTemplateBody("Hi {{1}} {{2}}", ["only-one"])).toBe("Hi only-one {{2}}");
  });

  it("catches a parameter-count mismatch before the queue, not at send time", () => {
    expect(templateVariablesMatch(body, ["a", "b", "c", "d"])).toBe(true);
    expect(templateVariablesMatch(body, ["a", "b"])).toBe(false);
    expect(templateVariablesMatch(body, ["a", "b", "c", "d", "e"])).toBe(false);
  });
});

describe("webhook signature verification", () => {
  const appSecret = "super-secret-app-secret";
  const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const goodSignature = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;

  it("accepts Meta's own signature over the raw body", () => {
    expect(verifyWebhookSignature({ rawBody, signatureHeader: goodSignature, appSecret })).toBe(
      true,
    );
  });

  it("accepts the bare hex form too", () => {
    const bare = goodSignature.replace("sha256=", "");
    expect(verifyWebhookSignature({ rawBody, signatureHeader: bare, appSecret })).toBe(true);
  });

  it("rejects a tampered body — the whole point of the check", () => {
    const tampered = rawBody.replace("whatsapp_business_account", "whatsapp_business_account2");
    expect(
      verifyWebhookSignature({ rawBody: tampered, signatureHeader: goodSignature, appSecret }),
    ).toBe(false);
  });

  it("rejects a wrong secret, a missing header, a missing secret and junk", () => {
    expect(
      verifyWebhookSignature({ rawBody, signatureHeader: goodSignature, appSecret: "other" }),
    ).toBe(false);
    expect(verifyWebhookSignature({ rawBody, signatureHeader: null, appSecret })).toBe(false);
    expect(
      verifyWebhookSignature({ rawBody, signatureHeader: goodSignature, appSecret: null }),
    ).toBe(false);
    expect(verifyWebhookSignature({ rawBody, signatureHeader: "sha256=zzzz", appSecret })).toBe(
      false,
    );
  });

  it("would fail if the signature were computed over a re-serialised body", () => {
    const reserialised = JSON.stringify(JSON.parse(rawBody), null, 2);
    expect(
      verifyWebhookSignature({ rawBody: reserialised, signatureHeader: goodSignature, appSecret }),
    ).toBe(false);
  });
});

describe("GET verification handshake", () => {
  it("echoes the challenge when the token matches", () => {
    const result = parseVerifyHandshake({
      mode: "subscribe",
      token: "expected-token",
      challenge: "1158201444",
      expectedToken: "expected-token",
    });
    expect(result).toEqual({ ok: true, challenge: "1158201444" });
  });

  it("refuses a wrong or missing token", () => {
    expect(
      parseVerifyHandshake({
        mode: "subscribe",
        token: "nope",
        challenge: "1",
        expectedToken: "expected-token",
      }).ok,
    ).toBe(false);
    expect(
      parseVerifyHandshake({
        mode: "subscribe",
        token: "x",
        challenge: "1",
        expectedToken: undefined,
      }).ok,
    ).toBe(false);
    expect(
      parseVerifyHandshake({
        mode: "unsubscribe",
        token: "expected-token",
        challenge: "1",
        expectedToken: "expected-token",
      }).ok,
    ).toBe(false);
  });
});

describe("webhook payload parsing", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "1234567890" },
              statuses: [
                { id: "wamid.AAA", status: "delivered", timestamp: "1770000000" },
                {
                  id: "wamid.BBB",
                  status: "failed",
                  timestamp: "1770000001",
                  errors: [{ code: 131026, title: "Message undeliverable" }],
                },
                { id: "wamid.CCC", status: "unknown-status" },
              ],
              messages: [
                {
                  id: "wamid.DDD",
                  from: "2348012345678",
                  timestamp: "1770000002",
                  type: "text",
                  text: { body: "Good afternoon, has the result been released?" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  it("extracts statuses with error detail and skips unknown states", () => {
    const { statuses } = extractWebhookEvents(payload);
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toMatchObject({ waMessageId: "wamid.AAA", status: "DELIVERED" });
    expect(statuses[0].timestamp?.getTime()).toBe(1_770_000_000_000);
    expect(statuses[1]).toMatchObject({ status: "FAILED", errorCode: 131026 });
  });

  it("extracts inbound parent replies for the message inbox", () => {
    const { messages } = extractWebhookEvents(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      waMessageId: "wamid.DDD",
      from: "2348012345678",
      type: "text",
      text: "Good afternoon, has the result been released?",
    });
  });

  it("never throws on a malformed payload — Meta retries hard on a 500", () => {
    expect(extractWebhookEvents(null)).toEqual({ statuses: [], messages: [] });
    expect(extractWebhookEvents({ entry: "not-an-array" })).toEqual({ statuses: [], messages: [] });
    expect(extractWebhookEvents({ entry: [{ changes: [{ value: {} }] }] })).toEqual({
      statuses: [],
      messages: [],
    });
    expect(extractWebhookEvents({ entry: [{ changes: [{}] }, null, "x"] })).toEqual({
      statuses: [],
      messages: [],
    });
  });
});

describe("delivery status and error classification", () => {
  it("maps Cloud API statuses onto the queue's vocabulary", () => {
    expect(mapDeliveryStatus("sent")).toBe("SENT");
    expect(mapDeliveryStatus("DELIVERED")).toBe("DELIVERED");
    expect(mapDeliveryStatus("read")).toBe("READ");
    expect(mapDeliveryStatus("failed")).toBe("FAILED");
    expect(mapDeliveryStatus("deleted")).toBeNull();
    expect(mapDeliveryStatus(null)).toBeNull();
  });

  it("marks recipient/template errors permanent so they are never retried", () => {
    expect(classifyMetaError(131026)).toMatchObject({ permanent: true, retryable: false });
    expect(classifyMetaError(132000)).toMatchObject({ permanent: true, retryable: false });
    expect(classifyMetaError(131047)).toMatchObject({ permanent: true, retryable: false });
  });

  it("treats rate limits as retryable and unknown failures as retryable", () => {
    expect(classifyMetaError(130429)).toMatchObject({ permanent: false, retryable: true });
    expect(classifyMetaError(80007)).toMatchObject({ permanent: false, retryable: true });
    expect(classifyMetaError(500)).toMatchObject({ permanent: false, retryable: true });
    expect(classifyMetaError(null)).toMatchObject({ permanent: false, retryable: true });
  });
});

describe("configuration and the 24-hour service window", () => {
  it("is only configured when both token and phone number id are present", () => {
    expect(isWhatsAppConfigured({ WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "123" })).toBe(
      true,
    );
    expect(isWhatsAppConfigured({ WHATSAPP_TOKEN: "t" })).toBe(false);
    expect(isWhatsAppConfigured({ WHATSAPP_PHONE_NUMBER_ID: "123" })).toBe(false);
    expect(isWhatsAppConfigured({})).toBe(false);
  });

  it("allows free-form replies only inside 24 hours of the parent's message", () => {
    const now = new Date("2026-10-13T12:00:00.000Z");
    expect(inServiceWindow(new Date("2026-10-13T11:00:00.000Z"), now)).toBe(true);
    expect(inServiceWindow(new Date(now.getTime() - SERVICE_WINDOW_MS + 1000), now)).toBe(true);
    expect(inServiceWindow(new Date(now.getTime() - SERVICE_WINDOW_MS - 1000), now)).toBe(false);
    expect(inServiceWindow(null, now)).toBe(false);
    expect(inServiceWindow(new Date("2026-10-13T12:05:00.000Z"), now)).toBe(false); // future timestamp
  });

  it("tells staff exactly when the window closes", () => {
    const lastInbound = new Date("2026-10-13T09:15:00.000Z");
    expect(serviceWindowClosesAt(lastInbound).toISOString()).toBe("2026-10-14T09:15:00.000Z");
  });
});
