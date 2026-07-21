import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.token || !body.newPassword) {
      return NextResponse.json(
        { success: false, message: "Token and new password are required" },
        { status: 400 }
      );
    }

    // In production:
    // 1. Verify the token from DB (check expiry, hash)
    // 2. Hash the new password with bcrypt
    // 3. Update the user's passwordHash
    // 4. Invalidate all existing refresh tokens for that user
    // 5. Mark the reset token as used

    return NextResponse.json(
      {
        success: true,
        message: "Password has been reset. Please log in with your new password.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Password reset failed" },
      { status: 500 }
    );
  }
}
