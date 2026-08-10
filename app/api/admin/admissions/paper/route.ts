import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus, PaymentProvider, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { admissionDraftSchema, APPLICATION_FEE_KOBO } from "@/lib/admissions";
import { prisma } from "@/lib/prisma";
import { PEOPLE_ADMIN_ROLES } from "@/lib/people";
import { getClientIp } from "@/lib/requests";
import { createApplicationId } from "@/lib/security";
import { requireRole } from "@/lib/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paper-form intake — office staff keying in a walk-in application.
 *
 * Ykay is mid-transition from paper to online. Until every parent applies
 * online, the front desk still receives handwritten forms, and those applicants
 * have to reach exactly the same review -> entrance -> enrolment pipeline as
 * online ones. Before this route there was no way in: the only creator was the
 * public /api/admissions/draft flow, which requires the parent to hold an
 * upload token.
 *
 * Reuses `admissionDraftSchema` verbatim, so a paper application is validated
 * identically to an online one — no second, weaker set of rules to drift apart.
 *
 * Records the offline fee payment at the same time. The enrolment endpoint
 * refuses any applicant whose paymentStatus is not PAID, and previously only
 * the Paystack webhook could set that — so a cash- or transfer-paying family
 * could never be enrolled at all. `feePaid: false` is allowed for schools that
 * take the form first and payment later; those applications simply wait at
 * PENDING_REVIEW until the bursar records the money.
 */
const schema = z.object({
  draft: admissionDraftSchema,
  /** Whether the application fee has already been collected at the office. */
  feePaid: z.boolean().default(false),
  feeMethod: z.enum(["CASH", "BANK_TRANSFER", "POS"]).optional(),
  /** Teller number, POS slip reference, or transfer narration. */
  feeReference: z.string().trim().max(120).optional(),
  /** Free-text note, e.g. "form received at front desk 12 Aug". */
  intakeNote: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Office staff often double-click. An Idempotency-Key makes a repeat submit
  // return the original application instead of creating a duplicate applicant.
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 16) {
    return NextResponse.json(
      { error: "An Idempotency-Key header (min. 16 chars) is required." },
      { status: 400 },
    );
  }

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch (error) {
    const issues =
      error instanceof z.ZodError
        ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).slice(0, 6)
        : [];
    return NextResponse.json(
      { error: "Some details are missing or invalid.", issues },
      { status: 400 },
    );
  }

  if (input.feePaid && !input.feeMethod) {
    return NextResponse.json(
      { error: "Select how the application fee was paid." },
      { status: 400 },
    );
  }

  const replay = await prisma.idempotencyRecord.findUnique({
    where: { schoolId_scope_key: { schoolId: user.schoolId, scope: "ADMISSION_PAPER", key } },
  });
  if (replay) {
    return NextResponse.json(
      { ...(replay.response as object), idempotentReplay: true },
      { status: replay.statusCode },
    );
  }

  const draft = input.draft;
  const applicationId = createApplicationId();
  const studentName = [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(" ");
  // Unique per application, and clearly marked as not a Paystack reference.
  const offlineReference = `OFFLINE-${applicationId}-${(input.feeReference || "NA").slice(0, 40)}`;

  try {
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.admissionApplication.create({
        data: {
          schoolId: user.schoolId,
          applicationId,
          firstName: draft.firstName,
          middleName: draft.middleName || null,
          lastName: draft.lastName,
          dateOfBirth: new Date(draft.dateOfBirth),
          gender: draft.gender,
          stateOfOrigin: draft.stateOfOrigin,
          lga: draft.lga,
          religion: draft.religion || null,
          bloodGroup: draft.bloodGroup || null,
          genotype: draft.genotype || null,
          classApplying: draft.classApplying,
          preferredArm: draft.preferredArm || null,
          fatherName: draft.fatherName || null,
          motherName: draft.motherName || null,
          guardianName: draft.guardianName || null,
          guardianRelationship: draft.guardianRelationship || null,
          primaryContact: draft.primaryContact,
          parentPhone: draft.parentPhone,
          whatsappPhone: draft.whatsappPhone || null,
          parentEmail: draft.parentEmail,
          parentAddress: draft.parentAddress,
          occupation: draft.occupation || null,
          previousSchool: draft.previousSchool,
          previousClass: draft.previousClass,
          reasonForLeaving: draft.reasonForLeaving || null,
          achievements: draft.achievements || null,
          // Straight to review — a paper form is already "submitted" by the act
          // of handing it in. There is no parent-side draft to finish.
          status: ApplicationStatus.PENDING_REVIEW,
          statusNote: input.intakeNote || "Paper application entered at the school office.",
          submittedAt: new Date(),
          paymentStatus: input.feePaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          paymentReference: input.feePaid ? offlineReference : null,
        },
      });

      // Mirror the offline payment into PaymentTransaction so admissions
      // finance reconciles the same way regardless of how the money arrived.
      // PaymentProvider has no MANUAL member, so POS is recorded as CASH (money
      // taken at the desk) with the exact method preserved in providerData.
      if (input.feePaid) {
        await tx.paymentTransaction.create({
          data: {
            applicationId: created.id,
            provider:
              input.feeMethod === "BANK_TRANSFER"
                ? PaymentProvider.BANK_TRANSFER
                : PaymentProvider.CASH,
            reference: offlineReference,
            amountKobo: APPLICATION_FEE_KOBO,
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            providerData: {
              method: input.feeMethod,
              recordedBy: user.id,
              recordedByName: user.name,
              officeReference: input.feeReference || null,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: "ADMISSION_PAPER_INTAKE",
          entityType: "AdmissionApplication",
          entityId: applicationId,
          ipAddress: getClientIp(request),
          metadata: {
            studentName,
            classApplying: draft.classApplying,
            feePaid: input.feePaid,
            feeMethod: input.feeMethod || null,
            feeReference: input.feeReference || null,
          },
        },
      });

      return created;
    });

    const response = {
      application: {
        applicationId: application.applicationId,
        studentName,
        classApplying: application.classApplying,
        status: application.status,
        paymentStatus: application.paymentStatus,
      },
      nextStep: input.feePaid
        ? "Record the entrance score, then enrol from the admissions review page."
        : "Application saved. Record the application fee before the applicant can be enrolled.",
    };

    await prisma.idempotencyRecord.create({
      data: {
        schoolId: user.schoolId,
        scope: "ADMISSION_PAPER",
        key,
        requestHash: "v1",
        response,
        statusCode: 201,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("Paper admission intake failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not save the application. No partial record was created." },
      { status: 500 },
    );
  }
}
