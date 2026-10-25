import { preload } from "react-dom";
import { headers } from "next/headers";
import { resolveTenantFromHost } from "@/lib/tenant";
import SchoolHome from "@/components/SchoolHome";
import PlatformLanding from "@/components/PlatformLanding";

/**
 * Root page — for this single-tenant Ykay College deployment, the Ykay portal
 * home page is shown by default on every host (production, preview, branch,
 * localhost). The generic Ykay Platform landing is only shown when
 * PLATFORM_MODE=true is explicitly set (future multi-tenant SaaS use).
 *
 * Tenant/branding resolution still runs so authenticated users get their own
 * school's palette — but the *landing* is always Ykay here.
 */
export default async function HomePage() {
  // Preload the two above-the-fold hero images before their markup is parsed.
  //
  // The backdrop is the wider of the two; the student photograph is the one
  // Hero.tsx documents as the LCP element on mobile. Only the backdrop used to
  // be preloaded, so the actual LCP image was discovered during HTML parsing
  // and competed with a decorative `opacity-20` fill for the connection. The
  // `images` descriptor must match the rendered <img> exactly (same srcset,
  // same `sizes`) or the browser fetches a second, different candidate.
  preload("/home/hero-campus-750.webp", {
    as: "image",
    imageSrcSet: "/home/hero-campus-750.webp 750w, /home/hero-campus-1200.webp 1200w",
    imageSizes: "100vw",
    fetchPriority: "high",
  });
  preload("/home/ykay-students-750.webp", {
    as: "image",
    imageSrcSet: "/home/ykay-students-750.webp 750w, /home/ykay-students-1080.webp 1080w",
    imageSizes: "(max-width: 768px) 100vw, 50vw",
    fetchPriority: "high",
  });
  const host = (await headers()).get("host");
  const { matched } = await resolveTenantFromHost(host);

  // Single-tenant Ykay deployment: show the Ykay portal unless platform mode
  // is explicitly enabled. matched is ignored as a gate — SchoolHome renders
  // fine with the default Ykay tenant regardless.
  const platformMode = process.env.PLATFORM_MODE === "true";

  if (platformMode && !matched) {
    // Platform context — show the Ykay Platform landing page
    return <PlatformLanding />;
  }

  // Ykay College portal (default for this deployment)
  return <SchoolHome />;
}
