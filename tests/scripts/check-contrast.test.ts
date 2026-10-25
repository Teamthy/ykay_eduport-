import { describe, expect, it } from "vitest";

import { contrastRatio, inlineFindings, nestedFindings } from "../../scripts/check-contrast";

/**
 * These tests exist so `npm run check:contrast` cannot quietly pass by
 * accident. Each case below is a bug that shipped once; if someone weakens a
 * regex to make the guard green, the guard stops catching it and this suite
 * fails instead.
 */
describe("contrast maths", () => {
  it("matches the WCAG reference ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 2);
    // The two colours the portal got wrong.
    expect(contrastRatio("#ffffff", "#4ec54d")).toBeCloseTo(2.23, 1);
    expect(contrastRatio("#ffffff", "#ef4444")).toBeCloseTo(3.76, 1);
  });
});

describe("same-element literal pairs", () => {
  const findings = (markup: string) => inlineFindings(markup, "fixture.tsx");

  it("flags white text on a white card", () => {
    const found = findings('<div className="rounded-2xl bg-white p-6 text-white">x</div>');
    expect(found).toHaveLength(1);
    expect(found[0].detail).toBe("bg-white with text-white");
    expect(found[0].ratio).toBeCloseTo(1, 2);
  });

  it("flags white on brand green and accepts navy on brand green", () => {
    expect(findings('<button className="bg-brand-green text-white">Go</button>')).toHaveLength(1);
    expect(findings('<button className="bg-brand-green text-brand-navy">Go</button>')).toHaveLength(
      0,
    );
  });

  it("flags the red badge that measured 3.76:1 and accepts red-600", () => {
    expect(findings('<span className="bg-red-500 text-white">URGENT</span>')).toHaveLength(1);
    expect(findings('<span className="bg-red-600 text-white">URGENT</span>')).toHaveLength(0);
  });

  it("reads arbitrary hex values", () => {
    const found = findings('<button className="bg-[#25D366] text-white">Chat</button>');
    expect(found).toHaveLength(1);
    expect(found[0].ratio).toBeCloseTo(1.98, 1);
  });

  it("treats bg-[var(--color-brand-green)] as brand green, not as unknown", () => {
    expect(
      findings('<button className="bg-[var(--color-brand-green)] text-white">Go</button>'),
    ).toHaveLength(1);
  });

  it("pairs a ternary arm's background with its own text colour", () => {
    const found = findings(
      '<button className={`px-4 ${active ? "bg-brand-green text-white" : "border"}`}>Go</button>',
    );
    expect(found).toHaveLength(1);
  });

  it("ignores translucent fills, which composite with the page", () => {
    expect(findings('<div className="bg-white/5 text-white">x</div>')).toHaveLength(0);
    expect(findings('<div className="bg-[#4EC54D]/10 text-[#4EC54D]">x</div>')).toHaveLength(0);
  });

  it("allows 3:1 for large display text but not for body text", () => {
    // 3.76:1 — below the 4.5:1 body threshold, above the 3:1 large-text one.
    expect(findings('<h1 className="bg-red-500 text-white text-4xl">Hi</h1>')).toHaveLength(0);
    expect(findings('<span className="bg-red-500 text-white text-xs">Hi</span>')).toHaveLength(1);
  });
});

describe("nested literal pairs", () => {
  const findings = (markup: string) => nestedFindings(markup, "fixture.tsx");

  it("flags translucent white inside a light checkout header", () => {
    const found = findings(
      '<div className="bg-[#0ea5e9]"><div className="text-xs text-white/70">a@b.co</div></div>',
    );
    expect(found).toHaveLength(1);
    expect(found[0].detail).toContain("text-white/70");
  });

  it("flags body text under an inherited literal background", () => {
    const found = findings(
      '<div className="bg-white"><p className="text-xs text-slate-400">note</p></div>',
    );
    expect(found).toHaveLength(1);
  });

  it("stops at a token surface instead of climbing to the page shell", () => {
    expect(
      findings(
        '<main className="bg-brand-navy"><div className="bg-[var(--bg-elevated)]">' +
          '<h2 className="text-brand-navy">Welcome</h2></div></main>',
      ),
    ).toHaveLength(0);
  });

  it("ignores text sitting over a photo", () => {
    expect(
      findings(
        '<section className="text-white"><img src="/x.png" alt="" />' +
          '<h1 className="text-white">Hi</h1></section>',
      ),
    ).toHaveLength(0);
  });

  it("measures icons at the 3:1 UI threshold", () => {
    const icon = '<a className="bg-white"><ArrowRight className="text-brand-green-dark" /></a>';
    expect(findings(icon)).toHaveLength(0);
    const weak = '<a className="bg-white"><ArrowRight className="text-brand-green" /></a>';
    expect(findings(weak)).toHaveLength(1);
  });
});
