import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Download, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { apkDownloadPath, apkFallbackUrl, apkQrUrl, apkSizeLabel, apkUrl } from "@/lib/apk";

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

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // /download/apk redirects here when the storage URL is unset, rather than
  // erroring at a link someone has already printed or forwarded.
  const { error } = await searchParams;
  const APK_URL = apkUrl();
  const FALLBACK = apkFallbackUrl();
  const SIZE = apkSizeLabel();
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  // QR encodes the PAGE, not the file: a poster on a noticeboard outlives any
  // one release, and a parent scanning it still gets the install instructions.
  const QR = SITE ? apkQrUrl(`${SITE}/download`) : null;
  return (
    <main className="grid min-h-screen place-items-center bg-brand-navy px-6 py-20">
      <div className="w-full max-w-lg">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)] backdrop-blur">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
            <Smartphone size={11} /> Get the app
          </span>

          <h1 className="mt-5 font-display text-4xl tracking-widest text-[var(--text-primary)]">
            YKAY COLLEGE <span className="text-brand-green">APP</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Check results, attendance, fees and school notices on your phone. For parents, students
            and staff of Ykay College &amp; Leadership Academy.
          </p>

          {/* ── Option A: the PWA — instant, works on iPhone AND Android ── */}
          <div className="mt-7 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">
              Option A · Install instantly — no download
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              The website is now an installable app (PWA). It installs in seconds, takes almost no
              space, updates itself, and works on{" "}
              <b className="text-[var(--text-primary)]">iPhone and Android</b> alike.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">On Android</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
                  <li>Open this site in Chrome.</li>
                  <li>
                    Tap <b className="text-[var(--text-primary)]">Install</b> on the banner, or menu{" "}
                    <b className="text-[var(--text-primary)]">⋮ → Install app</b>.
                  </li>
                  <li>Confirm — the Ykay icon appears on your home screen.</li>
                </ol>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">On iPhone</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
                  <li>Open this site in Safari.</li>
                  <li>
                    Tap the <b className="text-[var(--text-primary)]">Share</b> button.
                  </li>
                  <li>
                    Scroll down, tap{" "}
                    <b className="text-[var(--text-primary)]">Add to Home Screen</b>, then Add.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* ── Option B: the Android APK ── */}
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Option B · Android app file (APK)
          </p>

          {error === "unavailable" ? (
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4 text-sm text-brand-orange">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>
                The download is temporarily unavailable. Please try again shortly, or contact the
                school office.
              </span>
            </div>
          ) : null}

          {APK_URL ? (
            <>
              <a
                href={apkDownloadPath()}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-brand-green py-3.5 font-bold text-brand-navy transition-opacity hover:opacity-90"
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
