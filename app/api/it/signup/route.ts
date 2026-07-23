import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { getSchool } from "@/lib/school";
import { sessionCookie, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128)
    .regex(/[0-9]/, "Password must include at least one number."),
});

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid sign-up details."
        : "Invalid sign-up details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in instead." },
      { status: 409 }
    );
  }

  const school = await getSchool();
  const passwordHash = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: payload.email,
      name: payload.name,
      role: UserRole.IT_STUDENT,
      passwordHash,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: school.id,
      actorUserId: user.id,
      action: "IT_STUDENT_SIGNED_UP",
      entityType: "User",
      entityId: user.id,
      ipAddress: getClientIp(request),
    },
  });

  const token = await signSession({
    id: user.id,
    schoolId: user.schoolId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const response = NextResponse.json({
    user: { name: user.name, email: user.email, role: user.role },
  });
  const cookie = sessionCookie(token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
