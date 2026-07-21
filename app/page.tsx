import LoadingScreen from "@/components/LoadingScreen";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ServiceInfo from "@/components/ServiceInfo";
import AdmissionsBanner from "@/components/AdmissionsBanner";
import ITAwarenessCTA from "@/components/ITAwarenessCTA";  // <-- NEW

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
        <ServiceInfo />
        <AdmissionsBanner />
        <ITAwarenessCTA />  {/* <-- ADD THIS WHERE YOU WANT */}

        <Services />
        <Churches />
        <Groups />
        <FindUs />
      </main>
      <Footer />
    </>
  );
}