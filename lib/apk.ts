/**
 * Where the Android APK lives.
 *
 * The app is distributed as a direct download rather than through the Play
 * Store, so this URL appears in four places: the homepage CTA, the hero
 * button, the /download page and the mobile version-gate API. It was drifting
 * across two different env var names (`NEXT_PUBLIC_APK_URL` and
 * `MOBILE_APK_URL`), which meant setting one left the others silently pointing
 * at nothing.
 *
 * `NEXT_PUBLIC_` is required because the homepage CTA and hero are client
 * components — a server-only variable is simply `undefined` there, which is
 * exactly how the hero ended up linking to `#download-app`.
 */

/** Public URL of the current APK, or null when not configured. */
export function apkUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_APK_URL || process.env.MOBILE_APK_URL || "";
  return value.trim() || null;
}

/**
 * A secondary link (e.g. the GitHub release page) for anyone whose browser
 * blocks the direct download, or who wants to see the release notes.
 */
export function apkFallbackUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_APK_FALLBACK_URL || "";
  return value.trim() || null;
}

/**
 * Human-readable size shown next to the button.
 *
 * Worth stating plainly: this is ~89 MB and many parents are on metered mobile
 * data. Someone who taps a download of unknown size on a slow connection and
 * watches it stall will assume the app is broken.
 */
export function apkSizeLabel(): string | null {
  const value = process.env.NEXT_PUBLIC_APK_SIZE || "";
  return value.trim() || null;
}

/**
 * The stable, publishable download link.
 *
 * ALWAYS share this, never the storage URL. It survives the file moving
 * between hosts — which it will: the repo goes private after launch, so
 * GitHub Release assets stop working and the APK moves to R2 or similar.
 * Printed letters, QR codes and forwarded WhatsApp messages cannot be edited
 * afterwards.
 */
export function apkDownloadPath(): string {
  return "/download/apk";
}

/** QR image for the download URL, so a parent on a laptop can scan it. */
export function apkQrUrl(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`;
}
