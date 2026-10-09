"use client";

// HomeSections — the below-the-fold marketing sections of the home page.
//
// Each section is a separate, asynchronously loaded chunk (next/dynamic),
// and the chunk request is held back until the page has fully loaded (see
// afterLoad below). On a mobile connection the hero fills the whole first
// viewport, so this code is not needed for the first paint: keeping it out
// of the initial render-blocking load is what lets the LCP image paint in
// time (the Lighthouse budget in lighthouserc.json measures exactly that).
//
// ssr stays on (the default), so the section markup is still in the
// server-rendered HTML — search engines and no-JS visitors see the full
// page, and hydration simply attaches once the chunk arrives while the
// server HTML stays on screen.

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { afterLoad } from "@/lib/after-lcp";

const ServiceInfo = dynamic(afterLoad(() => import("@/components/ServiceInfo")));
const ITFlagshipSection = dynamic(afterLoad(() => import("@/components/ITFlagshipSection")));
const AdmissionsBanner = dynamic(afterLoad(() => import("@/components/AdmissionsBanner")));
const Services = dynamic(afterLoad(() => import("@/components/Services")));
const Groups = dynamic(afterLoad(() => import("@/components/Groups")));
const VirtualBridge = dynamic(afterLoad(() => import("@/components/VirtualBridge")));
const FindUs = dynamic(afterLoad(() => import("@/components/FindUs")));

/** Sections between the hero and the marquee. */
export function HomeSectionsTop() {
  return (
    <>
      <Reveal variant="up">
        <ServiceInfo />
      </Reveal>
      <Reveal variant="left" delay={60}>
        <ITFlagshipSection />
      </Reveal>
      <Reveal variant="right" delay={60}>
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
      <Reveal variant="zoom">
        <Services />
      </Reveal>
      <Reveal variant="blur" delay={60}>
        <Groups />
      </Reveal>
      {children}
      <Reveal variant="left" delay={60}>
        <VirtualBridge />
      </Reveal>
      <Reveal variant="right" delay={60}>
        <FindUs />
      </Reveal>
    </>
  );
}
