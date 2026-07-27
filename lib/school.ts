import { prisma } from "@/lib/prisma";

const schoolSlug = process.env.SCHOOL_SLUG || "ykay-college";

/**
 * Returns (and auto-creates/updates) the default school for single-tenant
 * deployments. For EDUos multi-tenant, each school is created via onboarding.
 *
 * When SCHOOL_CUSTOM_DOMAIN is set (e.g. "portal.ykaycollege.edu.ng"), the
 * school's customDomain is kept in sync so that resolveTenantFromHost finds
 * this school directly — even before EDUos has a platform domain.
 */
export async function getSchool() {
  const customDomain = process.env.SCHOOL_CUSTOM_DOMAIN?.trim() || undefined;

  return prisma.school.upsert({
    where: { slug: schoolSlug },
    update: {
      ...(customDomain ? { customDomain } : {}),
    },
    create: {
      slug: schoolSlug,
      subdomain: schoolSlug,
      customDomain,
      name: process.env.SCHOOL_NAME || "Ykay College & Leadership Academy",
      address: process.env.SCHOOL_ADDRESS || "Sango Ota, Ogun State, Nigeria",
      phone: process.env.SCHOOL_PHONE || "+2347015374411",
      email: process.env.SCHOOL_EMAIL || "info@ykaycollege.com",
      motto: process.env.SCHOOL_MOTTO || "Excellence in Education",
    },
  });
}
