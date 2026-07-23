import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_PATH: Record<string, string> = {
  word: "microsoft-word",
  excel: "microsoft-excel",
  powerpoint: "microsoft-powerpoint",
  "ms-word": "microsoft-word",
  "ms-excel": "microsoft-excel",
  "ms-powerpoint": "microsoft-powerpoint",
  "microsoft-word": "microsoft-word",
  "microsoft-excel": "microsoft-excel",
  "microsoft-powerpoint": "microsoft-powerpoint",
  python: "python",
  ai: "ai",
  cybersecurity: "cybersecurity",
  "digital-literacy": "digital-literacy",
  "excel-expert": "excel-expert",
};

/** Public course catalog for the IT Education marketing hub. */
export async function GET() {
  try {
    const courses = await prisma.itCourse.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        modules: { select: { id: true } },
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json({
      courses: courses.map((c) => {
        const pathSlug = SLUG_PATH[c.slug] || c.slug;
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          tagline: c.tagline,
          description: c.description,
          level: c.level,
          certification: c.certification,
          durationWeeks: c.durationWeeks,
          moduleCount: c.modules.length,
          enrollmentCount: c._count.enrollments,
          href: `/it-education/${pathSlug}`,
        };
      }),
    });
  } catch (error) {
    console.error("IT catalog failed", error);
    return NextResponse.json({ courses: [], error: "Catalog temporarily unavailable." }, { status: 200 });
  }
}

