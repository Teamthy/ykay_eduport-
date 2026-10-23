// Server-render the public marketing sections. Only the few sections that
// consume client context remain client components; static copy, links, and
// icon markup do not need hydration just because they appear below the hero.

import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import ServiceInfo from "@/components/ServiceInfo";
import ITFlagshipSection from "@/components/ITFlagshipSection";
import AdmissionsBanner from "@/components/AdmissionsBanner";
import Services from "@/components/Services";
import Groups from "@/components/Groups";
import VirtualBridge from "@/components/VirtualBridge";
import FindUs from "@/components/FindUs";

/** Sections between the hero and the marquee. */
export function HomeSectionsTop() {
  return (
    <>
      <Reveal variant="up" className="cv-auto">
        <ServiceInfo />
      </Reveal>
      <Reveal variant="left" delay={60} className="cv-auto">
        <ITFlagshipSection />
      </Reveal>
      <Reveal variant="right" delay={60} className="cv-auto">
        <AdmissionsBanner />
      </Reveal>
    </>
  );
}

/** Sections after the marquee. `children` is the server-rendered app CTA
 *  (it builds its QR code from request headers, so it must stay a server
 *  component) — passed through so it keeps its place in the page order. */
export function HomeSectionsBottom({ children }: { children: ReactNode }) {
  return (
    <>
      <Reveal variant="zoom" className="cv-auto">
        <Services />
      </Reveal>
      <Reveal variant="blur" delay={60} className="cv-auto">
        <Groups />
      </Reveal>
      {children}
      <Reveal variant="left" delay={60} className="cv-auto">
        <VirtualBridge />
      </Reveal>
      <Reveal variant="right" delay={60} className="cv-auto">
        <FindUs />
      </Reveal>
    </>
  );
}
