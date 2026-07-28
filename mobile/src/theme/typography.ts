/** Ykay College — typography. Anton for display, DM Sans for body. */
export const Typography = {
  display: "Anton",
  body: "DM Sans",

  // sizes (px)
  fontSize: {
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    caption: 13,
    label: 12,
    micro: 11,
  },
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight: 0.02,
    normal: 0,
    wide: 0.15,
  },
} as const;

export type Typography = typeof Typography;
