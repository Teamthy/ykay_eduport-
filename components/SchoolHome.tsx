import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { HomeSectionsTop, HomeSectionsBottom } from "@/components/HomeSections";
import MobileAppCTA from "@/components/MobileAppCTA";
import Footer from "@/components/Footer";

/**
 * A school's public home page (tenant portal landing).
 * Shown when a specific school is resolved from the hostname.
 *
 * The hero (the first viewport on mobile) is visible immediately; the
 * sections below it arrive as async chunks via HomeSections. Do not put a
 * timed splash over the page: it obscures the first viewport for seconds
 * without improving hydration or access to the portal.
 */
export default function SchoolHome() {
  return (
    <>
      <Header />
      {/* overflow-x-clip: the Reveal scroll animations hold sections at
          translateX(±48px) until they enter the viewport; without this the
          translated boxes inflate the body's scroll extent past the viewport
          (audit finding AUD-F6 — clipped globally by html/body overflow-x,
          but better never to escape the page container). */}
      <main className="flex flex-col overflow-x-clip">
        <Hero />
        <HomeSectionsTop />
        <Marquee
          items={[
            "JSS1 — SS3",
            "NERDC CURRICULUM",
            "STEM & DIGITAL LITERACY",
            "LEADERSHIP TRAINING",
            "CHARACTER FORMATION",
          ]}
          className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-3 md:py-4"
          itemClassName="font-display text-[clamp(1rem,2.2vw,1.9rem)] tracking-[-0.01em] text-[var(--text-accent)]"
          duration={32}
        />

        <HomeSectionsBottom>
          <MobileAppCTA />
        </HomeSectionsBottom>
      </main>
      <Footer />
    </>
  );
}
