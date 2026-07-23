-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'DIRECTOR', 'BURSAR', 'COORDINATOR', 'HOD', 'TEACHER', 'PARENT', 'STUDENT');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'DOCUMENTS_REQUESTED', 'APPROVED', 'DECLINED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "public"."AdmissionDocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'PASSPORT_PHOTO', 'REPORT_CARD', 'TRANSFER_CERTIFICATE');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('PAYSTACK', 'BANK_TRANSFER', 'CASH');

-- CreateTable
CREATE TABLE "public"."School" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "motto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdmissionApplication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "stateOfOrigin" TEXT NOT NULL,
    "lga" TEXT NOT NULL,
    "religion" TEXT,
    "bloodGroup" TEXT,
    "genotype" TEXT,
    "classApplying" TEXT NOT NULL,
    "preferredArm" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "primaryContact" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "parentEmail" TEXT NOT NULL,
    "parentAddress" TEXT NOT NULL,
    "occupation" TEXT,
    "previousSchool" TEXT NOT NULL,
    "previousClass" TEXT NOT NULL,
    "reasonForLeaving" TEXT,
    "achievements" TEXT,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "statusNote" TEXT,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "uploadTokenHash" TEXT,
    "uploadTokenExpiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdmissionDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "public"."AdmissionDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentTransaction" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "providerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "public"."School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "public"."User"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_applicationId_key" ON "public"."AdmissionApplication"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_paymentReference_key" ON "public"."AdmissionApplication"("paymentReference");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_status_createdAt_idx" ON "public"."AdmissionApplication"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_parentEmail_idx" ON "public"."AdmissionApplication"("schoolId", "parentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocument_storageKey_key" ON "public"."AdmissionDocument"("storageKey");

-- CreateIndex
CREATE INDEX "AdmissionDocument_applicationId_idx" ON "public"."AdmissionDocument"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocument_applicationId_type_key" ON "public"."AdmissionDocument"("applicationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_applicationId_key" ON "public"."PaymentTransaction"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_reference_key" ON "public"."PaymentTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "public"."PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "public"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "public"."RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_entityType_entityId_idx" ON "public"."AuditLog"("schoolId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "public"."AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

