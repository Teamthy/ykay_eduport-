import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, ArrowRight } from "lucide-react";

interface NewsItem {
  title: string;
  date: string;
  category: string;
  summary: string;
  file: string;
}

function loadNewsContent(): NewsItem[] {
  try {
    const contentDir = join(process.cwd(), "content", "news");
    const files = readdirSync(contentDir).filter((f: string) => f.endsWith(".md"));
    return files
      .map((file: string) => {
        const raw = readFileSync(join(contentDir, file), "utf8");
        const titleMatch = raw.match(/title: "([^"]+)"/);
        const dateMatch = raw.match(/date: "([^"]+)"/);
        const categoryMatch = raw.match(/category: "([^"]+)"/);
        const body = raw.split("---").pop() || "";
        return {
          title: titleMatch ? titleMatch[1] : file,
          date: dateMatch ? dateMatch[1] : "",
          category: categoryMatch ? categoryMatch[1] : "News",
          summary:
            body.trim().substring(0, 160) +
            (body.trim().length > 160 ? "..." : ""),
          file,
        };
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  } catch {
    return [];
  }
}

export default function NewsPage() {
  const news = loadNewsContent();

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="relative w-full bg-[var(--bg-primary)] pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4">
              NEWS &amp; EVENTS
            </p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-[var(--text-primary)] mb-4">
              LATEST NEWS
            </h1>
            <p className="font-body text-base md:text-lg text-[var(--text-secondary)] max-w-xl">
              Updates from campus, events, achievements, and announcements.
            </p>
          </div>
        </section>

        {/* News list */}
        <section className="w-full bg-[var(--bg-primary)] pb-20 md:pb-32">
          <div className="mx-auto max-w-5xl px-6">
            {news.length > 0 ? (
              <div className="space-y-6">
                {news.map((item) => (
                  <a
                    key={item.title}
                    href="#"
                    className="group block rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-[var(--accent-primary)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-300 p-8 md:p-10"
                  >
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-green/10 font-body text-[10px] font-bold tracking-[0.2em] uppercase text-brand-green">
                        {item.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-body text-xs text-[var(--text-muted)]">
                        <Calendar size={12} /> {item.date}
                      </span>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-[var(--text-primary)] mb-3 group-hover:text-[var(--accent-primary)] transition-colors">
                      {item.title}
                    </h3>
                    <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                      {item.summary}
                    </p>
                    <span className="inline-flex items-center gap-2 font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--accent-primary)] group-hover:gap-3 transition-all">
                      Read More <ArrowRight size={12} />
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] p-12 text-center">
                <Calendar
                  size={40}
                  className="mx-auto mb-4 text-[var(--text-muted)]"
                />
                <h3 className="font-display text-xl tracking-[2px] text-[var(--text-primary)] mb-2">
                  No News Articles Yet
                </h3>
                <p className="font-body text-sm text-[var(--text-secondary)]">
                  Check back soon for the latest updates from Ykay College.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}