import { Anton, DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import DemoIndicator from "@/components/DemoIndicator";

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
  metadataBase: new URL("https://ykaycollege.com"),
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
    url: "https://ykaycollege.com",
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
import { resolveTenantFromHost } from "@/lib/tenant";
import { getTenantBranding, DEFAULT_BRANDING } from "@/lib/branding";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ── EDUos: resolve the tenant's branding (per-school palette, logo) ──
  const host = (await headers()).get("host");
  const { tenant } = await resolveTenantFromHost(host);
  const branding = tenant ? await getTenantBranding(tenant.id) : null;

  const primary = branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor;
  const secondary = branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor;
  const accent = branding?.accentColor ?? DEFAULT_BRANDING.accentColor;
  const logoUrl = branding?.logoUrl ?? "/ykay-logo.png";
  const faviconUrl = branding?.faviconUrl ?? "/ykay-logo.png";
  const displayName = branding?.displayName ?? tenant?.name ?? "EduPortal";

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
        {/* EDUos: inject per-tenant brand palette as CSS variable overrides */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--color-brand-navy:${primary};--color-brand-navy-light:${secondary};--color-brand-green:${accent};--color-brand-green-dark:${accent};--color-brand-green-light:${accent};}`,
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
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
