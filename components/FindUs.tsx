"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, MapPin, Newspaper, ShieldCheck } from "lucide-react";
import { AnimatedText } from "@/components/AnimatedTextStatic";
import { useSchoolProfile } from "@/components/SchoolProfileContext";

export default function FindUs() {
  const { address, campusLatitude, campusLongitude } = useSchoolProfile();
  const hasCoordinates =
    campusLatitude !== null &&
    campusLongitude !== null &&
    Number.isFinite(campusLatitude) &&
    campusLatitude >= -90 &&
    campusLatitude <= 90 &&
    Number.isFinite(campusLongitude) &&
    campusLongitude >= -180 &&
    campusLongitude <= 180;
  const mapQuery = hasCoordinates ? `${campusLatitude},${campusLongitude}` : address;
  const directionsUrl = mapQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <section
      id="find-us"
      className="w-full bg-[var(--bg-primary)] py-12 theme-transition sm:py-16 md:py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-10">
        {/* A useful, timeless featured card instead of a dated hard-coded news item. */}
        <div className="min-w-0">
          <span className="mb-3 block font-body text-[10px] font-bold uppercase tracking-[0.25em] text-brand-green">
            FEATURED AT YKAY
          </span>
          <h2 className="mb-6 font-display text-[clamp(2.1rem,6.5vw,5rem)] leading-[0.9] tracking-[-0.015em] text-[var(--text-primary)] sm:mb-8">
            <AnimatedText heavy stagger={0.03} text="YOUR NEXT STEP" className="block" />
            <span className="block text-brand-green">
              <AnimatedText heavy stagger={0.03} text="STARTS HERE" delay={0.12} />
            </span>
          </h2>

          <article className="group relative isolate flex min-h-[390px] flex-col justify-end overflow-hidden rounded-[1.5rem] border border-[var(--border-subtle)] bg-brand-navy-dark shadow-2xl sm:min-h-[440px] sm:rounded-[2rem]">
            {/* A small pre-compressed WebP keeps this below-fold feature light on mobile data. */}
            <img
              src="/home/ykay-students-750.webp"
              alt="Ykay College students learning together"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-navy-dark via-brand-navy-dark/75 to-brand-navy-dark/10"
            />

            <div className="p-5 sm:p-8">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-brand-navy-dark/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                <ShieldCheck size={13} className="text-brand-green" /> A school for learning and
                leadership
              </span>
              <h3 className="max-w-xl font-display text-3xl leading-[0.98] tracking-wide text-white sm:text-4xl md:text-5xl">
                Find the right path for your learner.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
                Explore the school, learn about admissions, and keep up with what is happening at
                Ykay College.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/admissions"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-bold text-brand-navy shadow-lg transition hover:bg-brand-orange-dark focus-visible:outline-white"
                >
                  Admissions <ArrowRight size={16} />
                </Link>
                <Link
                  href="/academics"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <BookOpen size={16} /> Explore academics
                </Link>
              </div>
              <Link
                href="/news-events"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline decoration-white/60 underline-offset-4 transition hover:text-brand-green"
              >
                <Newspaper size={15} /> School news and events <ArrowRight size={14} />
              </Link>
            </div>
          </article>
        </div>

        {/* Campus location: use confirmed coordinates first, then the confirmed address. */}
        <div className="min-w-0 lg:pt-2">
          <span className="mb-3 block font-body text-[10px] font-bold uppercase tracking-[0.25em] text-brand-green">
            FIND US
          </span>
          <h2 className="mb-6 font-display text-[clamp(2.1rem,6.5vw,5rem)] leading-[0.9] tracking-[-0.015em] text-[var(--text-primary)] sm:mb-8">
            <AnimatedText heavy stagger={0.03} text="VISIT THE" className="block" />
            <span className="block text-brand-green">
              <AnimatedText heavy stagger={0.03} text="CAMPUS" delay={0.12} />
            </span>
          </h2>

          {mapQuery ? (
            <div className="mb-5 aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-lg sm:rounded-[2rem]">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                title={address ? `Map showing ${address}` : "Map showing Ykay College campus"}
              />
            </div>
          ) : (
            <div className="mb-5 flex aspect-[4/3] min-h-[280px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] px-6 text-center sm:rounded-[2rem]">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
                <MapPin size={22} />
              </div>
              <p className="font-semibold text-[var(--text-primary)]">
                Campus map not configured yet
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
                The school has not published a confirmed campus address or map pin.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:border-brand-green hover:text-[var(--text-accent)]"
              >
                Contact the school <ArrowRight size={14} />
              </Link>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                <MapPin size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-accent)]">
                  Our campus
                </div>
                <p className="break-words text-sm font-medium leading-relaxed text-[var(--text-primary)]">
                  {address ||
                    (hasCoordinates
                      ? "Campus pin shown on the map."
                      : "Location details are being set up.")}
                </p>
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--text-accent)] underline decoration-[var(--border-default)] underline-offset-4 hover:decoration-[var(--text-accent)]"
                  >
                    Get directions <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
