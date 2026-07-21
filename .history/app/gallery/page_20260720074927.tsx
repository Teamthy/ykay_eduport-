import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function GalleryPage() {
  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="relative w-full bg-white pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-ykay-navy/30 mb-4">GALLERY</p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-ykay-navy mb-4">CAMPUS GALLERY</h1>
            <p className="font-body text-base md:text-lg text-ykay-navy/50 max-w-xl">A visual journey through our facilities, events, and student life at Ykay College.</p>
          </div>
        </section>
        <section className="w-full bg-white pb-20 md:pb-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              {[
                { src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80", caption: "Classroom Learning" },
                { src: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80", caption: "Student Collaboration" },
                { src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80", caption: "Modern Facilities" },
                { src: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80", caption: "Sports Day" },
                { src: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80", caption: "Arts & Music" },
                { src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80", caption: "STEM Club" },
              ].map((img, i) => (
                <a key={i} href="#" className="group relative block rounded-[2rem] overflow-hidden aspect-[4/3]">
                  <img src={img.src} alt={img.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-ykay-navy">{img.caption}</h3>
                  </div>
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
