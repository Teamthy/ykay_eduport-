import { Anton, DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import CookieConsent from "@/components/CookieConsent";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  title: "Ykay College & Leadership Academy — Excellence in Education",
  description:
    "A premium day secondary school (JSS1–SS3) located in Sango Ota, Ogun State, Nigeria. Offering NERDC-aligned curriculum, digital learning, and leadership development.",
  keywords:
    "Ykay College, secondary school, Sango Ota, Ogun State, JSS1, JSS2, JSS3, SS1, SS2, SS3, admissions, Nigerian education, NERDC, WAEC, BECE",
  openGraph: {
    title: "Ykay College & Leadership Academy",
    description: "A premium day secondary school in Sango Ota. Excellence in education for JSS1 to SS3.",
    siteName: "Ykay College",
    locale: "en_NG",
    images: [{ url: "/images/ykay-college-hero.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ykay College & Leadership Academy",
    description: "Excellence in education. Day secondary school — JSS1 to SS3. Sango Ota, Ogun State.",
    images: ["/images/ykay-college-hero.jpg"],
  },
  icons: {
    icon: [
      { url: "/logo-ykay.svg", type: "image/svg+xml" },
      { url: "/logo-ykay.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    apple: [{ url: "/logo-ykay.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
  verification: {
    google: "google-site-verification-placeholder",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ykay-theme') || 'system';
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] theme-transition">
        <ThemeProvider>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "EducationalOrganization",
                "name": "Ykay Training College & Leadership Academy",
                "alternateName": "Ykay College",
                "url": "https://ykaycollege.com",
                "logo": "https://ykaycollege.com/logo-ykay.svg",
                "description": "A premium day secondary school (JSS1–SS3) in Sango Ota, Ogun State, Nigeria. Offering NERDC-aligned curriculum, digital learning, and leadership development.",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Km 38, Lagos-Abeokuta Expressway, No 1 Iwalewa Street",
                  "addressLocality": "Sango Ota",
                  "addressRegion": "Ogun State",
                  "addressCountry": "Nigeria",
                  "postalCode": "",
                },
                "telephone": "+2347015374411",
                "email": "info@ykaycollege.com",
              }),
            }}
          />
          {children}
          <CookieConsent />
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
