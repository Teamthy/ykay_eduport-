import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="relative w-full bg-[var(--bg-primary)] pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4">
              ABOUT US
            </p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-[var(--text-primary)] mb-6">
              OUR STORY
            </h1>
            <p className="font-body text-base md:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Founded with a vision to raise leaders through excellence in education, Ykay College has grown into one of the most respected secondary schools in Ogun State.
            </p>
          </div>
        </section>

        {/* Vision + Image */}
        <section className="w-full bg-[var(--bg-primary)] pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start mb-16">
              <div>
                <h2 className="font-display text-[28px] md:text-[36px] tracking-[2px] text-[var(--text-primary)] mb-6">
                  A VISION FOR EXCELLENCE
                </h2>
                <div className="space-y-5 text-[var(--text-secondary)] font-body text-base leading-relaxed">
                  <p>
                    Ykay College &amp; Leadership Academy was established on the conviction that education, when combined with moral formation and leadership training, creates students who will transform their communities.
                  </p>
                  <p>
                    Located in Sango Ota — a vibrant educational corridor along the Lagos-Abeokuta Expressway — the school serves families across Ogun State and beyond. Our campus is designed to support both rigorous academic work and holistic personal development.
                  </p>
                  <p>
                    Every student at Ykay College is seen not just as a learner, but as a future leader. Our teachers are selected for both their subject mastery and their commitment to mentoring young people. Our curriculum is aligned with the Nigerian Educational Research and Development Council (NERDC) and prepares students for WAEC, NECO, BECE, and university entrance examinations.
                  </p>
                </div>
              </div>
              <div className="relative rounded-[2rem] overflow-hidden shadow-[var(--card-shadow-hover)]">
                <img
                  src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80"
                  alt="Modern classroom"
                  className="w-full h-full object-cover min-h-[400px]"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
              {[
                { value: "2012", label: "Year Founded" },
                { value: "420+", label: "Students Enrolled" },
                { value: "85%", label: "WAEC Pass Rate" },
                { value: "JSS1–SS3", label: "Programmes Offered" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] p-8 md:p-10"
                >
                  <h3 className="font-display text-4xl md:text-5xl tracking-[2px] text-[var(--accent-primary)] mb-2">
                    {stat.value}
                  </h3>
                  <p className="font-body text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Vision / Mission / Values */}
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  title: "Vision",
                  desc: "To be the leading secondary school in Ogun State, recognized nationally for academic excellence, digital innovation, ethical leadership, and student achievement.",
                },
                {
                  title: "Mission",
                  desc: "To provide a rigorous, technology-enhanced education that develops intellectual capacity, moral integrity, and leadership skills — preparing every student for university success and civic responsibility.",
                },
                {
                  title: "Values",
                  desc: "Excellence. Integrity. Leadership. Innovation. Service. These are the principles that guide our curriculum, our teachers, and our students every day.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-[var(--accent-primary)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-1 transition-all duration-300 p-8 md:p-10"
                >
                  <h3 className="font-display text-2xl tracking-[2px] text-[var(--text-primary)] mb-4">
                    {card.title}
                  </h3>
                  <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}