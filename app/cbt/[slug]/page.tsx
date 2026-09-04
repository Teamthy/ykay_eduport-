import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CbtRunner from "@/components/cbt/CbtRunner";

export const dynamic = "force-dynamic";

async function getSubject(slug: string) {
  return prisma.cbtSubject.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      classLevel: true,
      _count: { select: { questions: { where: { status: "published" } } } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const subject = await getSubject(slug);
  if (!subject) return { title: "CBT Practice" };
  return {
    title: `${subject.name} CBT Practice — ${subject._count.questions} questions`,
    description: `Exam-style ${subject.name} practice: timed CBT papers and instant-feedback questions with explanations.`,
  };
}

export default async function CbtSubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subject = await getSubject(slug);
  if (!subject || subject._count.questions === 0) notFound();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] px-6 pb-20 pt-28 md:px-10 md:pt-32">
        <div className="mx-auto mb-8 w-full max-w-6xl">
          <Link
            href="/cbt"
            className="inline-flex items-center gap-2 font-body text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-brand-green"
          >
            <ArrowLeft size={13} /> All subjects
          </Link>
          <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4.5rem)] leading-[0.88] tracking-[-0.01em] text-[var(--text-primary)]">
            {subject.name.toUpperCase()}
            <span className="block text-brand-green">CBT PRACTICE</span>
          </h1>
        </div>
        <CbtRunner subject={{ slug: subject.slug, name: subject.name }} />
      </main>
      <Footer />
    </>
  );
}
