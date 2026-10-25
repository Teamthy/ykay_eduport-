import { Download } from "lucide-react";
import { Marquee } from "@/components/Marquee";

/**
 * College home hero — full-bleed navy band, prebuiltui-style copy on the left,
 * Ykay student identity photograph on the right.
 */
export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-brand-navy-dark">
      <div className="absolute inset-0 z-0">
        {/* Decorative backdrop as a CSS background, not an <img>.
            As an <img> it was the largest in-viewport element and therefore
            the LCP candidate — while being a 20%-opacity texture behind a
            92%-opaque navy gradient. That made the LCP budget measure a
            decoration at Slow-4G speed instead of the headline. CSS
            backgrounds are not LCP candidates, so the paint that is measured
            is the headline instead of the texture.

            A background cannot carry a srcset, so this always uses the 750w
            variant even on wide screens. It is a 20%-opacity layer under a
            92%-opaque gradient, where the extra pixels are invisible; the
            content photograph below keeps its srcset. app/page.tsx still
            preloads this image (same srcset/sizes) so the fetch starts before
            this element is parsed. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('/home/hero-campus-750.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-dark via-brand-navy-dark/92 to-brand-navy-dark/70" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-none items-center gap-7 px-4 pb-8 pt-8 sm:gap-8 sm:px-6 sm:pt-10 md:grid-cols-2 md:gap-10 md:px-12 md:pb-14 md:pt-24 lg:px-16">
        <div>
          <span className="anim-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-body text-[11px] font-semibold text-white/90">
            <span className="h-2 w-2 rounded-full bg-brand-orange" />
            Raising Role Models · Est. 2021
          </span>

          <h1
            className="anim-rise mt-5 font-display text-[clamp(2.15rem,8.5vw,5.2rem)] leading-[0.94] tracking-[-0.02em] text-white sm:mt-7 sm:text-[clamp(2.4rem,6.5vw,5.2rem)]"
            style={{ animationDelay: "0.08s" }}
          >
            Excellence in Education.
            <span className="mt-1 block text-brand-green">Leadership. Character.</span>
          </h1>

          <p
            className="anim-rise mt-4 max-w-xl font-body text-base leading-relaxed text-white/90 sm:mt-5 md:text-lg"
            style={{ animationDelay: "0.18s" }}
          >
            A premium day secondary school — JSS1 to SS3 with science laboratories, sports, clubs
            and a full IT academy built into the timetable.
          </p>

          <div
            className="anim-rise mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center"
            style={{ animationDelay: "0.28s" }}
          >
            <a
              href="/admissions"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3.5 font-body text-sm font-bold uppercase tracking-[0.12em] text-brand-navy sm:px-8 shadow-lg shadow-black/30 transition hover:scale-[1.03] hover:bg-white/90"
            >
              Apply Now
            </a>
            <a
              href="/portal"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/45 bg-white/10 px-6 py-3.5 font-body text-sm font-bold uppercase tracking-[0.12em] text-white sm:px-8 transition hover:bg-white/15"
            >
              Student Portal
            </a>
            <a
              href="/download"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-3.5 font-body text-sm font-bold uppercase tracking-[0.12em] text-brand-navy shadow-lg sm:px-8 transition hover:scale-[1.03] hover:bg-brand-orange-dark"
            >
              <Download size={16} /> Get the app
            </a>
          </div>

          <p className="mt-7 font-body text-sm text-white/70">
            WAEC · NECO · JAMB · NERDC curriculum
          </p>
        </div>

        <div className="anim-rise relative" style={{ animationDelay: "0.2s" }}>
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[2rem] border border-brand-green/30"
          />
          {/* The identity photograph is now the first *content* image on the
              page (the backdrop is a CSS background), so keep it preloaded
              with high priority and its intrinsic size declared, or it
              becomes the paint that misses the budget. */}
          <img
            src="/home/ykay-students-750.webp"
            srcSet="/home/ykay-students-750.webp 750w, /home/ykay-students-1080.webp 1080w"
            sizes="(max-width: 768px) 100vw, 50vw"
            alt="Ykay College students in school uniform"
            fetchPriority="high"
            decoding="async"
            width={533}
            height={408}
            className="relative aspect-[4/3] w-full rounded-[1.75rem] object-cover object-[center_20%] shadow-2xl"
          />
        </div>
      </div>

      <div className="relative z-10 border-t border-dashed border-white/20">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 px-4 py-5 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 sm:gap-x-10 sm:px-6 sm:py-7 sm:tracking-[0.22em]">
          <span>NERDC</span>
          <span>STEM</span>
          <span>IT Academy</span>
          <span>Leadership</span>
          <span>Character</span>
        </div>
      </div>

      {/* No backdrop-blur on this band: it sits on an almost-opaque navy fill
          and a 20%-opacity photo, so the blur was invisible while forcing the
          compositor to re-read the backdrop on every marquee frame. The hero
          is the first viewport on every visit. */}
      <Marquee
        items={["ADMISSIONS OPEN", "WAEC", "NECO", "JAMB", "IT ACADEMY"]}
        className="relative z-10 border-t border-white/15 bg-brand-navy-dark/80 py-3"
        itemClassName="font-body text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-brand-green"
      />
    </section>
  );
}
