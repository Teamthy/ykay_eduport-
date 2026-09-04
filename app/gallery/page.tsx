import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export default function GalleryPage() {
  const images = [
    {
      src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
      caption: "Classroom Learning",
      category: "Academics",
    },
    {
      src: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
      caption: "Student Collaboration",
      category: "Campus Life",
    },
    {
      src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
      caption: "Modern Facilities",
      category: "Campus",
    },
    {
      src: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80",
      caption: "Sports Day",
      category: "Sports",
    },
    {
      src: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      caption: "Arts & Music",
      category: "Arts",
    },
    {
      src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
      caption: "STEM Club",
      category: "Academics",
    },
  ];

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <Reveal>
          <section className="relative w-full bg-[var(--bg-primary)] pt-32 pb-12 md:pt-40 md:pb-16">
            <div className="mx-auto max-w-7xl px-6">
              <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4">
                GALLERY
              </p>
              <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-[var(--text-primary)] mb-4">
                CAMPUS GALLERY
              </h1>
              <p className="font-body text-base md:text-lg text-[var(--text-secondary)] max-w-xl">
                A visual journey through our facilities, events, and student life at Ykay College.
              </p>
            </div>
          </section>
        </Reveal>

        {/* Gallery grid */}
        <Reveal>
          <section className="w-full bg-[var(--bg-primary)] pb-20 md:pb-32">
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {images.map((img, i) => (
                  <a
                    key={i}
                    href="#"
                    className="group relative block rounded-[2rem] overflow-hidden aspect-[4/3] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-300"
                  >
                    <img
                      src={img.src}
                      alt={img.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Always dark overlay for readability of caption */}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-dark/80 via-brand-navy-dark/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      <span className="font-body text-[10px] font-bold tracking-[0.2em] uppercase text-brand-green mb-2 block">
                        {img.category}
                      </span>
                      <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-white">
                        {img.caption}
                      </h3>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
