import LoadingScreen from "@/components/LoadingScreen";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ServiceInfo from "@/components/ServiceInfo";
import AdmissionsBanner from "@/components/AdmissionsBanner";
import ITFlagshipSection from "@/components/ITFlagshipSection";
import ITAwarenessCTA from "@/components/ITAwarenessCTA";
import Services from "@/components/Services";
import Churches from "@/components/Churches";
import Groups from "@/components/Groups";
import FindUs from "@/components/FindUs";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <LoadingScreen />
      <Header />
      <main>
        <Hero />
        <ITFlagshipSection />
        <ServiceInfo />
        <AdmissionsBanner />
        <ITAwarenessCTA />
        <Services />
        <Churches />
        <Groups />
        <FindUs />
      </main>
      <Footer />
    </>
  );
}
