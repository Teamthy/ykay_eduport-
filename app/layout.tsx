import { Anton, DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import DemoIndicator from "@/components/DemoIndicator";
import OfflineIndicator from "@/components/OfflineIndicator";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  // Derived from env so a preview deployment does not advertise production
  // URLs. The literal was ykaycollege.com — a domain the school does not own,
  // which made every canonical link and social card point at the wrong site.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ykaycollege.edu.ng"),
  title: {
    default: "Ykay College & Leadership Academy — Excellence in Education",
    template: "%s | Ykay College",
  },
  description:
    "A premium day secondary school (JSS1–SS3) in Sango Ota, Ogun State. NERDC-aligned curriculum, digital learning, leadership development.",
  keywords: "Ykay College, secondary school, Sango Ota, Ogun State, NERDC, WAEC, BECE, JSS, SS",
  openGraph: {
    title: "Ykay College & Leadership Academy",
    description: "Excellence in education for JSS1 to SS3.",
    siteName: "Ykay College",
    locale: "en_NG",
    type: "website",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://ykaycollege.edu.ng",
    images: [{ url: "/ykay-logo.png", width: 800, height: 800, alt: "Ykay College Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ykay College & Leadership Academy",
    description: "Excellence in education for JSS1 to SS3.",
    images: ["/ykay-logo.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/ykay-logo.png", sizes: "any", type: "image/png" }],
    apple: [{ url: "/ykay-logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/ykay-logo.png",
  },
  manifest: "/manifest.json",
};

import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { resolveTenantFromHost } from "@/lib/tenant";
import { getTenantBranding, DEFAULT_BRANDING } from "@/lib/branding";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ── EDUos: resolve branding ──
  // For AUTHENTICATED users, use THEIR school's branding (from the session's
  // schoolId — so a new school's colours show immediately after signup, even
  // on localhost where host resolution falls back to the default school).
  // For PUBLIC pages (no session), resolve from hostname.
  const host = (await headers()).get("host");
  const session = await getSession();

  let schoolId: string | null = null;
  let fallbackName = "EduPortal";

  if (session) {
    schoolId = session.schoolId;
  } else {
    const { tenant } = await resolveTenantFromHost(host);
    schoolId = tenant?.id ?? null;
    fallbackName = tenant?.name ?? "EduPortal";
  }

  const branding = schoolId ? await getTenantBranding(schoolId) : null;

  const primary = branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor;
  const secondary = branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor;
  const accent = branding?.accentColor ?? DEFAULT_BRANDING.accentColor;
  const logoUrl = branding?.logoUrl ?? "/ykay-logo.png";
  const faviconUrl = branding?.faviconUrl ?? "/ykay-logo.png";
  const displayName = branding?.displayName ?? fallbackName;

  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${anton.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href={faviconUrl} type="image/png" />
        <link rel="apple-touch-icon" href={faviconUrl} />
        {/* EDUos: inject per-tenant brand palette as CSS variable overrides.
            Only navy / navy-light / green are driven by tenant branding so the
            nuanced green-dark/light + full orange shades in globals.css are
            preserved (gives Ykay its proper depth, not flat blue). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--color-brand-navy:${primary};--color-brand-navy-light:${secondary};--color-brand-green:${accent};}`,
          }}
        />
        {/* ANTI-FLASH: force dark mode as default before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              var saved = localStorage.getItem('ykay-theme');
              // Default to dark unless user explicitly chose light
              var resolved = (saved === 'light') ? 'light' : 'dark';
              document.documentElement.setAttribute('data-theme', resolved);
            } catch (e) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          })();
        `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] theme-transition">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <CookieConsent />
              <WhatsAppFloat />
              <DemoIndicator />
              <OfflineIndicator />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
