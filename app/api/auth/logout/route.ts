import { NextResponse } from "next/server";

export async function POST() {
  // In production, invalidate the refresh token here
  return NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );
}
