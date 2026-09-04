import LoadingScreen from "@/components/LoadingScreen";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ServiceInfo from "@/components/ServiceInfo";
import ITFlagshipSection from "@/components/ITFlagshipSection";
import AdmissionsBanner from "@/components/AdmissionsBanner";
import Services from "@/components/Services";
import MobileAppCTA from "@/components/MobileAppCTA";
import Groups from "@/components/Groups";
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
        <Reveal>
          <Services />
        </Reveal>
        <Reveal delay={60}>
          <Groups />
        </Reveal>
        <MobileAppCTA />
        <Reveal delay={60}>
          <FindUs />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
