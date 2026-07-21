import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        {
          success: true,
          message: "If the email is registered, you will receive a reset link shortly.",
        },
        { status: 200 }
      );
    }

    // In production:
    // 1. Check if user exists (silently — do not reveal)
    // 2. Generate a secure reset token
    // 3. Store hashed token in DB with 30-min expiry
    // 4. Send email with reset link via SendGrid/Resend
    // Always return the same generic response for security

    return NextResponse.json(
      {
        success: true,
        message: "If the email is registered, you will receive a reset link shortly.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Password reset request failed" },
      { status: 500 }
    );
  }
}
