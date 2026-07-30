import LoadingScreen from "@/components/LoadingScreen";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ServiceInfo from "@/components/ServiceInfo";
import ITFlagshipSection from "@/components/ITFlagshipSection";
import AdmissionsBanner from "@/components/AdmissionsBanner";
import ITAwarenessCTA from "@/components/ITAwarenessCTA";
import Services from "@/components/Services";
import Groups from "@/components/Groups";
import FindUs from "@/components/FindUs";
import Footer from "@/components/Footer";

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
        <ServiceInfo />
        <ITFlagshipSection />
        <AdmissionsBanner />
        <ITAwarenessCTA />
        <Services />
        <Groups />
        <FindUs />
      </main>
      <Footer />
    </>
  );
}
