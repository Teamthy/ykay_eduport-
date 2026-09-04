import LoadingScreen from "@/components/LoadingScreen";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Marquee } from "@/components/AnimatedText";
import ServiceInfo from "@/components/ServiceInfo";
import ITFlagshipSection from "@/components/ITFlagshipSection";
import AdmissionsBanner from "@/components/AdmissionsBanner";
import Services from "@/components/Services";
import MobileAppCTA from "@/components/MobileAppCTA";
import Groups from "@/components/Groups";
import VirtualBridge from "@/components/VirtualBridge";
import FindUs from "@/components/FindUs";
import Footer from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

/**
 * A school's public home page (tenant portal landing).
 * Shown when a specific school is resolved from the hostname.
 */
export default function SchoolHome() {
  return (
    <>
      <LoadingScreen />
      <Header />
      <main className="flex flex-col">
        <Hero />
        <Reveal>
          <ServiceInfo />
        </Reveal>
        <Reveal delay={60}>
          <ITFlagshipSection />
        </Reveal>
        <Reveal delay={60}>
          <AdmissionsBanner />
        </Reveal>
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

        <Reveal>
          <Services />
        </Reveal>
        <Reveal delay={60}>
          <Groups />
        </Reveal>
        <MobileAppCTA />
        <Reveal delay={60}>
          <VirtualBridge />
        </Reveal>
        <Reveal delay={60}>
          <FindUs />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
