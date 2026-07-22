import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AdmissionDocumentType } from "@/lib/admissions";
import { safeFileName } from "@/lib/security";

function getStorageConfig() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Secure document storage is not configured.");
  }

  return {
    bucket,
    region,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    accessKeyId,
    secretAccessKey,
  };
}

function getClient() {
  const config = getStorageConfig();
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function createDocumentStorageKey(applicationId: string, documentType: AdmissionDocumentType, fileName: string) {
  const prefix = (process.env.S3_ADMISSIONS_PREFIX || "admissions").replace(/^\/+|\/+$/g, "");
  return `${prefix}/${applicationId}/${documentType.toLowerCase()}-${crypto.randomUUID()}.${safeFileName(fileName)}`;
}

export async function createSecureUploadUrl(input: {
  applicationId: string;
  documentType: AdmissionDocumentType;
  fileName: string;
  contentType: string;
}) {
  const config = getStorageConfig();
  const storageKey = createDocumentStorageKey(input.applicationId, input.documentType, input.fileName);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    ContentType: input.contentType,
    Metadata: {
      applicationId: input.applicationId,
      documentType: input.documentType,
    },
  });

  return {
    storageKey,
    uploadUrl: await getSignedUrl(getClient(), command, { expiresIn: 10 * 60 }),
  };
}

export async function verifyStoredDocument(storageKey: string, expectedSize: number) {
  const config = getStorageConfig();
  const result = await getClient().send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    })
  );

  return result.ContentLength === expectedSize;
}
