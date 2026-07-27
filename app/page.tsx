import { headers } from "next/headers";
import { resolveTenantFromHost } from "@/lib/tenant";
import SchoolHome from "@/components/SchoolHome";
import EduOsLanding from "@/components/EduOsLanding";

/**
 * Root page — routes between the EDUos platform landing and a specific school's
 * portal based on the hostname.
 *
 * - Platform domain (eduos.app, localhost without SCHOOL_CUSTOM_DOMAIN):
 *   → EDUos landing page (marketing, pricing, signup).
 * - Tenant domain (portal.school.edu.ng, slug.eduos.app):
 *   → that school's portal (home page, admissions, login).
 */
export default async function HomePage() {
  const host = (await headers()).get("host");
  const { matched } = await resolveTenantFromHost(host);

  if (!matched) {
    // Platform context — show the EDUos landing page
    return <EduOsLanding />;
  }

  // A specific school was resolved — show their portal
  return <SchoolHome />;
}
