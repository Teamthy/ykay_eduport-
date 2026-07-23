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
 * Homepage section order (priority):
 * 1. Hero — brand promise + primary CTAs
 * 2. School hours strip
 * 3. IT flagship (product differentiator)
 * 4. Admissions CTA
 * 5. IT awareness / hub promo
 * 6. Core programmes / services
 * 7. Campus life / community
 * 8. Find us / contact strip
 */
export default function HomePage() {
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
