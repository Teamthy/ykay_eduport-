import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  const school = await prisma.school.findFirst({ orderBy: { createdAt: "asc" } });
  if (!school) return NextResponse.json({ posts: [] });

  if (slug) {
    const post = await prisma.newsPost.findFirst({
      where: { schoolId: school.id, slug, isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        excerpt: true,
        content: true,
        publishedAt: true,
      },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ post });
  }

  const posts = await prisma.newsPost.findMany({
    where: { schoolId: school.id, isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      publishedAt: true,
    },
  });

  return NextResponse.json({ posts });
}
