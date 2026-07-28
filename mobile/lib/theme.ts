/**
 * Ykay College — global brand theme.
 *
 * Single source of truth for the EDUos/Ykay palette + design tokens.
 * Every screen should import from here instead of hardcoding colours,
 * so the app stays visually consistent with the web portal.
 */

export const theme = {
  colors: {
    // Backgrounds
    bgPrimary: "#00072D", // rich black
    bgSecondary: "#051650", // dark navy
    bgCard: "#0A2472", // card blue
    bgCardHover: "#123499", // primary button blue
    bgLight: "#E5EAF3",

    // Brand
    primary: "#123499",
    accent: "#2840E8",
    accentHover: "#2E4FC3",
    accentDeep: "#2419C7",

    // Text
    textPrimary: "#FFFFFF",
    textSecondary: "#D7E1F7",
    textMuted: "#A8B6D8",
    textFaint: "#ffffff60",
    textGhost: "#ffffff40",

    // Status
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ff4444",
    info: "#2840E8",

    // Lines / surfaces
    border: "#ffffff10",
    borderStrong: "#ffffff20",
    surface: "#051650",
    surfaceAlt: "#0A2472",
    overlay: "rgba(0,7,45,0.85)",
  },

  /** Brand gradient stops (rich black → dark navy → card blue). */
  gradient: ["#00072D", "#051650", "#0A2472"] as const,

  radius: { xs: 8, sm: 10, md: 14, lg: 18, xl: 22, pill: 999 },
  spacing: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },

  /** Reusable surface (card) style. */
  card: {
    backgroundColor: "#051650",
    borderRadius: 16,
    padding: 16,
  } as const,

  /** Primary call-to-action button style. */
  buttonPrimary: {
    backgroundColor: "#123499",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
  } as const,

  /** Tab bar chrome (used by every portal's Tabs). */
  tabBar: {
    backgroundColor: "#00072D",
    borderTopColor: "#ffffff10",
    activeTintColor: "#2840E8",
    inactiveTintColor: "#ffffff40",
  } as const,
} as const;

export type Theme = typeof theme;
