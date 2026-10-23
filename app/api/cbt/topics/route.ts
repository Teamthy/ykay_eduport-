import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";

/** Signed-in: distinct published topics for a subject slug (SEC-02). */
export async function GET(req: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const slug = req.nextUrl.searchParams.get("subject") ?? "";
  const subject = await prisma.cbtSubject.findUnique({ where: { slug }, select: { id: true } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const rows = await prisma.cbtQuestion.findMany({
    where: { subjectId: subject.id, status: "published" },
    distinct: ["topic"],
    select: { topic: true },
    orderBy: { topic: "asc" },
    take: 200,
  });
  return NextResponse.json({ topics: rows.map((r) => r.topic).filter(Boolean) });
}
