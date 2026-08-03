import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Download, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { apkFallbackUrl, apkQrUrl, apkSizeLabel, apkUrl } from "@/lib/apk";

export const metadata: Metadata = {
  title: "Download the Ykay College app",
  description:
    "Install the Ykay College EduPortal app for Android. Check results, attendance and fees on your phone.",
};

/**
 * APK download page.
 *
 * The Android app is distributed directly rather than through the Play Store,
 * so this page is the single link staff share with parents. Two things it has
 * to do that a store listing would otherwise handle:
 *
 *   1. Explain the "unsafe file" warning. Android always shows it for a
 *      sideloaded APK, and a parent who is not expecting it will stop there.
 *   2. Reassure. A link to a .apk in a WhatsApp group looks exactly like the
 *      thing people are warned about, so it must clearly come from the school
 *      on the school's own domain.
 */

export default function DownloadPage() {
  const APK_URL = apkUrl();
  const FALLBACK = apkFallbackUrl();
  const SIZE = apkSizeLabel();
  const QR = APK_URL ? apkQrUrl(APK_URL) : null;
  return (
    <main className="grid min-h-screen place-items-center bg-brand-navy px-6 py-20">
      <div className="w-full max-w-lg">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)] backdrop-blur">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
            <Smartphone size={11} /> Android app
          </span>

          <h1 className="mt-5 font-display text-4xl tracking-widest text-[var(--text-primary)]">
            YKAY COLLEGE <span className="text-brand-green">APP</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Check results, attendance, fees and school notices on your phone. For parents, students
            and staff of Ykay College &amp; Leadership Academy.
          </p>

          {APK_URL ? (
            <>
              <a
                href={APK_URL}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-brand-green py-3.5 font-bold text-white transition-opacity hover:opacity-90"
              >
                <Download size={17} /> Download for Android
                {SIZE ? <span className="font-normal opacity-80">({SIZE})</span> : null}
              </a>
              {/* Many parents are on metered data. A download of unknown size
                  that stalls on a slow connection reads as "the app is
                  broken", so say the size and say to use Wi-Fi. */}
              {SIZE ? (
                <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                  Best downloaded on Wi-Fi.
                </p>
              ) : null}
              {FALLBACK ? (
                <a
                  href={FALLBACK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-brand-green"
                >
                  Alternative download ↗
                </a>
              ) : null}
              {/* A parent reading this on a laptop needs it on their phone. */}
              {QR ? (
                <div className="mt-6 flex flex-col items-center">
                  <span className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    <QrCode size={12} /> Scan on your phone
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={QR}
                    alt="QR code linking to this download page"
                    width={160}
                    height={160}
                    className="rounded-xl bg-white p-2"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4 text-sm text-brand-orange">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>
                The download link is not configured yet. Set <code>NEXT_PUBLIC_APK_URL</code> to the
                hosted .apk and this button will appear.
              </span>
            </div>
          )}

          {/* Android shows a scary warning for any sideloaded APK. A parent who
              is not told to expect it will simply stop. */}
          <div className="mt-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Installing
            </p>
            <ol className="mt-3 space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <b className="text-[var(--text-primary)]">1.</b> Tap Download. The file saves to
                your Downloads folder.
              </li>
              <li>
                <b className="text-[var(--text-primary)]">2.</b> Open it. Android will warn that the
                file is from an unknown source —{" "}
                <b className="text-[var(--text-primary)]">this is expected</b> for apps not
                installed from the Play Store.
              </li>
              <li>
                <b className="text-[var(--text-primary)]">3.</b> Choose{" "}
                <b className="text-[var(--text-primary)]">Install anyway</b>, or allow installs from
                your browser if prompted.
              </li>
              <li>
                <b className="text-[var(--text-primary)]">4.</b> Sign in with the email address the
                school has on record for you.
              </li>
            </ol>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] p-4">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-green" />
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Only install this app from this page. The school will never send you an app file
              directly in a message. After installing, the app updates itself — you will not need to
              download it again for most changes.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            iPhone users can use the{" "}
            <Link href="/portal" className="text-brand-green hover:underline">
              web portal
            </Link>{" "}
            — it works in Safari with all the same features.
          </p>
        </div>
      </div>
    </main>
  );
}
