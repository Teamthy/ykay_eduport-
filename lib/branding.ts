import { prisma } from "@/lib/prisma";

/**
 * Default branding/palette used when a tenant hasn't configured their own.
 * These mirror Ykay's identity so the platform looks correct out of the box.
 */
export const DEFAULT_BRANDING = {
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: "#00072D",
  secondaryColor: "#051650",
  accentColor: "#123499",
  fontDisplay: null as string | null,
  fontBody: null as string | null,
  heroImageUrl: null as string | null,
  displayName: null as string | null,
  tagline: null as string | null,
} as const;

/**
 * Fetch a tenant's branding row (or null if the tenant hasn't customised yet).
 * The theming layer (server component) merges this with DEFAULT_BRANDING and
 * injects the palette as CSS variables at the root layout.
 */
export async function getTenantBranding(schoolId: string) {
  return prisma.tenantBranding.findUnique({ where: { schoolId } });
}
