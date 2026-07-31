import { Download, Smartphone, QrCode } from "lucide-react";

/**
 * Mobile-app download section for the Ykay homepage.
 * The download URL is env-configured (NEXT_PUBLIC_APK_URL) so it can be
 * repointed (GitHub Release → Diawi → Play Store) without a redeploy.
 * When a URL is set we also render a QR code (scan-to-install) generated
 * client-side via api.qrserver.com — no extra dependency.
 */
export default function MobileAppCTA() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_URL;
  const qr = apkUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
        apkUrl,
      )}`
    : null;

  return (
    <section
      id="download-app"
      className="relative w-full overflow-hidden bg-brand-navy py-20 md:py-28"
    >
      {/* glow accents */}
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-brand-green/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-brand-orange/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-brand-green block mb-4">
              YKAY ON THE GO
            </span>
            <h2 className="font-display text-4xl md:text-6xl leading-[0.95] tracking-[2px] text-white mb-6">
              THE SCHOOL IN <br />
              <span className="text-brand-green">YOUR POCKET</span>
            </h2>
            <p className="font-body text-base md:text-lg text-white/70 max-w-lg mb-8 leading-relaxed">
              Results, attendance, fees, timetables, CBT practice and push
              notifications — all offline-ready. Download the Android app and
              sign in with your full name and the shared student password.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <a
                href={apkUrl || "#download-app"}
                className="inline-flex items-center gap-3 rounded-full bg-brand-orange px-8 py-4 font-body text-sm font-bold uppercase tracking-[0.15em] text-white transition-all duration-300 hover:scale-[1.03] hover:bg-brand-orange-dark active:scale-[0.97] shadow-lg shadow-black/30"
              >
                <Download size={18} /> Download for Android
              </a>
              <div className="flex items-center gap-2 text-white/60 font-body text-xs">
                <Smartphone size={16} className="text-brand-green" />
                Android 8+ · ~50 MB · No Play Store needed
              </div>
            </div>

            {!apkUrl && (
              <p className="mt-5 text-xs text-white/40">
                The download link will appear here once{" "}
                <code className="text-brand-green">NEXT_PUBLIC_APK_URL</code> is
                set.
              </p>
            )}
          </div>

          {/* QR + phone card */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex items-center gap-2 text-brand-green">
                  <QrCode size={18} />
                  <span className="font-body text-[10px] font-bold uppercase tracking-[0.25em]">
                    Scan to install
                  </span>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-xl">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      alt="Scan to download the Ykay College app"
                      width={196}
                      height={196}
                    />
                  ) : (
                    <div className="flex h-[196px] w-[196px] items-center justify-center text-center text-xs text-slate-400">
                      QR appears here once the download link is configured
                    </div>
                  )}
                </div>
                <p className="mt-4 max-w-[16rem] text-xs leading-relaxed text-white/55">
                  Point your phone camera at the code, tap the notification, and
                  install.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
