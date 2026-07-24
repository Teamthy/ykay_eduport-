import { Resend } from "resend";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}
const from = () => process.env.EMAIL_FROM || "Ykay College <onboarding@resend.dev>";

export async function sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
  const url = `${(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(input.token)}`;
  await client().emails.send({
    from: from(),
    to: input.to,
    subject: "Reset your Ykay College EduPortal password",
    html: `<p>Hello ${input.name},</p><p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

export async function sendAdmissionDecisionEmail(input: {
  to: string;
  studentName: string;
  status: string;
  note?: string | null;
}) {
  await client().emails.send({
    from: from(),
    to: input.to,
    subject: `Admissions update for ${input.studentName}`,
    html: `<p>Hello,</p><p>There is an admissions update for <strong>${input.studentName}</strong>: <strong>${input.status.replaceAll("_", " ")}</strong>.</p>${input.note ? `<p>${input.note}</p>` : ""}<p>Please log in to the admissions status page or contact Ykay College for guidance.</p>`,
  });
}
