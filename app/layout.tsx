import { Anton, DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import DemoIndicator from "@/components/DemoIndicator";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ykaycollege.com"),
  title: {
    default: "Ykay College & Leadership Academy — Excellence in Education",
    template: "%s | Ykay College",
  },
  description: "A premium day secondary school (JSS1–SS3) in Sango Ota, Ogun State. NERDC-aligned curriculum, digital learning, leadership development.",
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
    icon: [
      { url: "/ykay-logo.png", sizes: "any", type: "image/png" },
    ],
    apple: [
      { url: "/ykay-logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/ykay-logo.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${anton.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/ykay-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/ykay-logo.png" />
        {/* ANTI-FLASH: force dark mode as default before hydration */}
        <script dangerouslySetInnerHTML={{ __html: `
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
        `}} />
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
