/**
 * Internal-only endpoint used by middleware to record auth denial events.
 * Protected by the AUTH_SECRET shared between middleware and the API.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Verify the internal secret
  const header = request.headers.get("x-internal-secret");
  const secret = process.env.AUTH_SECRET;
  if (!secret || !header || header !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { eventType, targetPath, userEmail, reason, ipAddress } = body;

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    await prisma.securityEvent.create({
      data: {
        eventType,
        userEmail: userEmail ?? null,
        ipAddress: ipAddress ?? null,
        targetPath: targetPath ?? null,
        reason: reason ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
