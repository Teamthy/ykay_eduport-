import { headers } from "next/headers";
import { resolveTenantFromHost } from "@/lib/tenant";
import SchoolHome from "@/components/SchoolHome";
import EduOsLanding from "@/components/EduOsLanding";

/**
 * Root page — for this single-tenant Ykay College deployment, the Ykay portal
 * home page is shown by default on every host (production, preview, branch,
 * localhost). The generic EDUos platform landing is only shown when
 * PLATFORM_MODE=true is explicitly set (future multi-tenant SaaS use).
 *
 * Tenant/branding resolution still runs so authenticated users get their own
 * school's palette — but the *landing* is always Ykay here.
 */
export default async function HomePage() {
  const host = (await headers()).get("host");
  const { matched } = await resolveTenantFromHost(host);

  // Single-tenant Ykay deployment: show the Ykay portal unless platform mode
  // is explicitly enabled. matched is ignored as a gate — SchoolHome renders
  // fine with the default Ykay tenant regardless.
  const platformMode = process.env.PLATFORM_MODE === "true";

  if (platformMode && !matched) {
    // Platform context — show the EDUos landing page
    return <EduOsLanding />;
  }

  // Ykay College portal (default for this deployment)
  return <SchoolHome />;
}
