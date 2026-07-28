/**
 * Ykay College — GLOBAL brand theme (production palette).
 *
 * Mirrors the official web globals.css exactly:
 *  - Dark mode (only theme). Dark navy backgrounds.
 *  - GREEN primary accent (#4ec54d / #62d35e)
 *  - ORANGE secondary accent (#ff6e00 / #ff9133)
 *  - Anton (display) + DM Sans (body)
 *
 * Single source of truth — every screen imports from here.
 */
export const theme = {
  colors: {
    // ── Backgrounds (dark navy) ──
    bgPrimary: "#050c14", // --bg-primary
    bgSecondary: "#071019", // --bg-secondary
    bgTertiary: "#09131d", // --bg-tertiary
    bgCard: "#0c1824", // --bg-elevated / brand-navy
    bgCardHover: "#1a2e4d", // --brand-navy-light
    bgLight: "#f1f5f9",

    // ── Brand ──
    primary: "#4ec54d", // --btn-primary-bg (GREEN) — primary buttons & fills
    primaryDark: "#3aa93a", // --color-brand-green-dark
    primaryLight: "#62d35e", // --color-brand-green-light
    accent: "#62d35e", // --accent-primary (GREEN) — active tints, icons, links
    secondary: "#ff6e00", // --btn-secondary-bg (ORANGE)
    secondaryDark: "#e65f00", // --color-brand-orange-dark
    accentSecondary: "#ff9133", // --accent-secondary (ORANGE)

    // ── Text ──
    textPrimary: "#f1f5f9", // --text-primary
    textSecondary: "#cbd5e1", // --text-secondary
    textMuted: "#94a3b8", // --text-muted
    textFaint: "#94a3b8", // labels / captions
    textGhost: "#64748b", // ink-500 — faintest text
    textInverse: "#0c1824", // --text-inverse
    textLink: "#62d35e", // --text-link

    // ── Status ──
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    error: "#ef4444",
    info: "#3b82f6",

    // ── Lines / surfaces ──
    border: "rgba(255,255,255,0.08)", // --border-subtle
    borderDefault: "rgba(255,255,255,0.15)", // --border-default
    borderStrong: "rgba(255,255,255,0.25)", // --border-strong
    surface: "#0c1824", // elevated navy card (solid, readable)
    surfaceHover: "#1a2e4d",
    surfaceAlt: "#071019",
    overlay: "rgba(0,0,0,0.75)", // --bg-overlay
  },

  /** --gradient-banner: navy → deep green → green */
  gradient: ["#050c14", "#184b18", "#4ec54d"] as const,

  fonts: {
    display: "Anton",
    body: "DM Sans",
  },

  radius: { xs: 8, sm: 10, md: 12, lg: 18, xl: 32, pill: 999 }, // --radius-btn 12px, --radius-card 32px
  spacing: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },

  card: {
    backgroundColor: "#0c1824",
    borderRadius: 18,
    padding: 16,
  } as const,

  buttonPrimary: {
    backgroundColor: "#4ec54d",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  } as const,

  tabBar: {
    backgroundColor: "#0c1824",
    borderTopColor: "rgba(255,255,255,0.08)",
    activeTintColor: "#62d35e",
    inactiveTintColor: "#64748b",
  } as const,
} as const;

export type Theme = typeof theme;
