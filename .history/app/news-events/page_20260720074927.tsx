import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function loadNewsContent() {
  try {
    const contentDir = join(process.cwd(), "content", "news");
    const files = readdirSync(contentDir).filter((f: string) => f.endsWith(".md"));
    return files.map((file: string) => {
      const raw = readFileSync(join(contentDir, file), "utf8");
      const titleMatch = raw.match(/title: "([^"]+)"/);
      const dateMatch = raw.match(/date: "([^"]+)"/);
      const categoryMatch = raw.match(/category: "([^"]+)"/);
      const body = raw.split("---").pop() || "";
      return {
        title: titleMatch ? titleMatch[1] : file,
        date: dateMatch ? dateMatch[1] : "",
        category: categoryMatch ? categoryMatch[1] : "News",
        summary: body.trim().substring(0, 160) + (body.trim().length > 160 ? "..." : ""),
        file,
      };
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export default function NewsPage() {
  const news = loadNewsContent();
    { title: "Ykay College Opens 2025 / 2026 Admissions", date: "March 15, 2025", category: "Admissions", summary: "Applications are now open for JSS1 through SS3. Apply online and track your status in real time." },
    { title: "BECE Preparation Workshop — April 2025", date: "March 10, 2025", category: "Academics", summary: "A two-week intensive workshop for JSS3 students preparing for the Basic Education Certificate Examination." },
    { title: "New STEM Lab Unveiled", date: "February 28, 2025", category: "Campus", summary: "The school unveils a fully equipped STEM and robotics laboratory, the first of its kind in the Sango Ota corridor." },
    { title: "Student Leadership Council Elections", date: "February 15, 2025", category: "Student Life", summary: "Elections for the 2025 student leadership council will take place on March 5. All students are encouraged to vote." },
  ];

  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="relative w-full bg-white pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-ykay-navy/30 mb-4">NEWS &amp; EVENTS</p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-ykay-navy mb-4">LATEST NEWS</h1>
            <p className="font-body text-base md:text-lg text-ykay-navy/50 max-w-xl">Updates from campus, events, achievements, and announcements.</p>
          </div>
        </section>
        <section className="w-full bg-white pb-20 md:pb-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="space-y-6">
              {news.map((item) => (
                <a key={item.title} href="#" className="group block rounded-[2rem] bg-card-bg border border-white/5 p-8 md:p-10 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mb-4">
                    <span className="font-body text-[10px] font-bold tracking-[0.2em] uppercase text-[#C2185B]">{item.category}</span>
                    <span className="font-body text-xs text-ykay-navy/20">|</span>
                    <span className="font-body text-xs text-ykay-navy/30">{item.date}</span>
                  </div>
                  <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-ykay-navy mb-3 group-hover:text-ykay-navy/90 transition-colors">{item.title}</h3>
                  <p className="font-body text-sm text-ykay-navy/40 leading-relaxed">{item.summary}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
