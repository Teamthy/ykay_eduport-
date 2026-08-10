import { NextRequest } from "next/server";
import { confirmDocumentSchema, DOCUMENT_RULES } from "@/lib/admissions";
import { findAuthorizedApplication } from "@/lib/admission-service";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyStoredDocument } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  const limit = await enforceRateLimit("upload", ipAddress);
  if (!limit.success) {
    return jsonNoStore(
      { error: "Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const payload = confirmDocumentSchema.parse(await request.json());
    const rule = DOCUMENT_RULES[payload.documentType];
    if (!rule.acceptedTypes.includes(payload.contentType) || payload.sizeBytes > rule.maxBytes) {
      return jsonNoStore(
        { error: "This file does not meet the document requirements." },
        { status: 422 },
      );
    }

    const application = await findAuthorizedApplication(payload.applicationId, payload.uploadToken);
    if (!application || application.status !== "DRAFT") {
      return jsonNoStore(
        { error: "Your upload session has expired. Please restart your application." },
        { status: 401 },
      );
    }

    const expectedPrefix = `${(process.env.S3_ADMISSIONS_PREFIX || "admissions").replace(/^\/+|\/+$/g, "")}/${payload.applicationId}/`;
    if (!payload.storageKey.startsWith(expectedPrefix)) {
      return jsonNoStore({ error: "Invalid upload location." }, { status: 422 });
    }

    const exists = await verifyStoredDocument(payload.storageKey, payload.sizeBytes);
    if (!exists) {
      return jsonNoStore(
        { error: "We could not confirm the uploaded file. Please upload it again." },
        { status: 422 },
      );
    }

    await prisma.admissionDocument.upsert({
      where: {
        applicationId_type: {
          applicationId: application.id,
          type: payload.documentType,
        },
      },
      create: {
        applicationId: application.id,
        type: payload.documentType,
        fileName: payload.fileName,
        contentType: payload.contentType,
        sizeBytes: payload.sizeBytes,
        storageKey: payload.storageKey,
      },
      update: {
        fileName: payload.fileName,
        contentType: payload.contentType,
        sizeBytes: payload.sizeBytes,
        storageKey: payload.storageKey,
        uploadedAt: new Date(),
      },
    });

    return jsonNoStore({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "issues" in error) {
      return jsonNoStore({ error: "Please check the file and try again." }, { status: 422 });
    }
    logger.error("Admission document confirmation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonNoStore(
      { error: "We could not save this document. Please try again." },
      { status: 500 },
    );
  }
}
