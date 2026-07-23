-- CreateEnum
CREATE TYPE "public"."FeeInvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."FeePaymentMethod" AS ENUM ('PAYSTACK', 'BANK_TRANSFER', 'CASH', 'CARD', 'USSD');

-- CreateEnum
CREATE TYPE "public"."FeePaymentStatus" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "public"."FeeInvoice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "termLabel" TEXT NOT NULL,
    "status" "public"."FeeInvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "balanceDue" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeePayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "amount" INTEGER NOT NULL,
    "method" "public"."FeePaymentMethod" NOT NULL,
    "status" "public"."FeePaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "providerData" JSONB,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeInvoice_invoiceNumber_key" ON "public"."FeeInvoice"("invoiceNumber");
CREATE INDEX "FeeInvoice_schoolId_status_dueDate_idx" ON "public"."FeeInvoice"("schoolId", "status", "dueDate");
CREATE INDEX "FeeInvoice_studentProfileId_issuedAt_idx" ON "public"."FeeInvoice"("studentProfileId", "issuedAt");
CREATE INDEX "FeeInvoice_parentProfileId_issuedAt_idx" ON "public"."FeeInvoice"("parentProfileId", "issuedAt");

-- CreateIndex
CREATE INDEX "FeeInvoiceItem_invoiceId_sortOrder_idx" ON "public"."FeeInvoiceItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_reference_key" ON "public"."FeePayment"("reference");
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "public"."FeePayment"("receiptNumber");
CREATE INDEX "FeePayment_schoolId_paidAt_idx" ON "public"."FeePayment"("schoolId", "paidAt");
CREATE INDEX "FeePayment_invoiceId_paidAt_idx" ON "public"."FeePayment"("invoiceId", "paidAt");
CREATE INDEX "FeePayment_parentProfileId_paidAt_idx" ON "public"."FeePayment"("parentProfileId", "paidAt");

-- AddForeignKey
ALTER TABLE "public"."FeeInvoice" ADD CONSTRAINT "FeeInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeeInvoice" ADD CONSTRAINT "FeeInvoice_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeeInvoice" ADD CONSTRAINT "FeeInvoice_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."FeeInvoiceItem" ADD CONSTRAINT "FeeInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."FeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."FeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;