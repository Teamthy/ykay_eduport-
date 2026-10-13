import { describe, expect, it } from "vitest";
import {
  AI_MODELS,
  AI_WORKLOADS,
  DEFAULT_PROFILE,
  RATES,
  RECURRING_DETAIL,
  buildRoutes,
  computeContentCost,
  computeExamLab,
  computeOneOff,
  computeRecurring,
  computeTco,
  fixedMonthlyUsd,
  gatewayFeesNgn,
  infraAnnualNgn,
  infraMonthlyUsd,
  parseArgs,
  smsCostNgn,
  whatsappCost,
} from "../../scripts/cost-model";

const DEFAULT = computeRecurring();

describe("cost model — infrastructure", () => {
  it("carries $96/month of infrastructure at the default profile", () => {
    expect(infraMonthlyUsd()).toBe(96);
  });

  it("turns that into ₦1,728,000 a year at ₦1,500/$", () => {
    expect(infraAnnualNgn(1500)).toBe(1_728_000);
  });

  it("counts storage as usage-scaled, not fixed", () => {
    expect(fixedMonthlyUsd()).toBe(infraMonthlyUsd() - RATES.infra.storage);
  });
});

describe("cost model — WhatsApp", () => {
  it("prices utility messages at the Nigerian rate", () => {
    expect(whatsappCost(DEFAULT.profile).utility).toBeCloseTo(241.2, 6);
  });

  it("prices marketing messages conservatively above the published rate", () => {
    expect(RATES.whatsapp.marketingUsd).toBeGreaterThanOrEqual(0.0516);
    expect(whatsappCost(DEFAULT.profile).marketing).toBeCloseTo(468, 6);
  });

  it("prices service conversations at 6,000 messages a year", () => {
    expect(whatsappCost(DEFAULT.profile).service).toBeCloseTo(40.2, 6);
  });

  it("totals $749.40 and ₦1,124,100 for the default profile", () => {
    expect(whatsappCost(DEFAULT.profile).totalUsd).toBeCloseTo(749.4, 6);
    expect(DEFAULT.whatsappNgn).toBe(1_124_100);
  });

  it("responds to a lower marketing volume", () => {
    const quieter = computeRecurring({ ...DEFAULT_PROFILE, marketingMessages: 6000 });
    expect(quieter.whatsappNgn).toBeLessThan(DEFAULT.whatsappNgn);
  });
});

describe("cost model — SMS and gateways", () => {
  it("costs SMS in naira, not dollars", () => {
    expect(smsCostNgn()).toBe(54_000);
    expect(DEFAULT.sms).toBe(54_000);
  });

  it("charges ₦560,000 on ₦80m collected", () => {
    expect(gatewayFeesNgn()).toBe(560_000);
  });

  it("scales gateway fees with collections", () => {
    expect(gatewayFeesNgn(40_000_000)).toBe(280_000);
  });
});

describe("cost model — AI", () => {
  it("prices every workload against a named model", () => {
    for (const workload of AI_WORKLOADS) {
      const model = AI_MODELS[workload.model];
      expect(model.input).toBeGreaterThan(0);
      expect(model.output).toBeGreaterThan(0);
      expect(model.output).toBeGreaterThan(model.input);
    }
  });

  it("totals $93.50 across the annual token schedule", () => {
    expect(DEFAULT.aiDetail.totalUsd).toBeCloseTo(93.5, 6);
    expect(DEFAULT.aiDetail.lines).toHaveLength(AI_WORKLOADS.length);
  });

  it("converts the AI line to ₦140,250 at the default FX", () => {
    expect(DEFAULT.aiNgn).toBe(140_250);
  });

  it("keeps AI a small share of the running cost", () => {
    expect(DEFAULT.aiNgn / DEFAULT.annualNgn).toBeLessThan(0.1);
  });
});

describe("cost model — the school's year", () => {
  it("totals ₦3,046,350 to run the school for a year", () => {
    expect(DEFAULT.annualNgn).toBe(3_046_350);
  });

  it("breaks the year into infrastructure, WhatsApp, SMS and AI", () => {
    expect(DEFAULT.annualNgn).toBe(
      DEFAULT.infra + DEFAULT.whatsappNgn + DEFAULT.sms + DEFAULT.aiNgn,
    );
  });

  it("reports a per-student cost a bursar can argue with", () => {
    expect(DEFAULT.perStudentYearNgn).toBe(1325);
    expect(DEFAULT.perStudentMonthNgn).toBe(110);
  });

  it("splits fixed and usage-scaled spend", () => {
    expect(DEFAULT.usageScaledNgn).toBe(DEFAULT.annualNgn - DEFAULT.fixedNgn);
    expect(DEFAULT.fixedShare).toBeGreaterThan(0.4);
    expect(DEFAULT.fixedShare).toBeLessThan(0.7);
  });

  it("keeps the paid-API total above the running total's API lines", () => {
    // gateway fees are collected on the school's behalf, so they sit outside
    // the running cost but inside what the school pays third parties.
    expect(DEFAULT.paidApisNgn).toBe(
      DEFAULT.whatsappNgn + DEFAULT.gateway + DEFAULT.aiNgn + DEFAULT.sms,
    );
    expect(DEFAULT.paidApisNgn).toBeGreaterThan(DEFAULT.annualNgn - DEFAULT.infra);
  });

  it("moves the USD-denominated lines with the exchange rate", () => {
    const weakerNaira = computeRecurring({ ...DEFAULT_PROFILE, fx: 2000 });
    expect(weakerNaira.infra).toBe(2_304_000);
    expect(weakerNaira.sms).toBe(54_000); // naira-denominated: unchanged
    expect(weakerNaira.gateway).toBe(560_000); // naira-denominated: unchanged
    expect(weakerNaira.annualNgn).toBeGreaterThan(DEFAULT.annualNgn);
  });
});

describe("cost model — one-off and content", () => {
  it("totals ₦1,370,000 of setup and compliance", () => {
    const o = RATES.oneOff;
    expect(computeOneOff()).toBe(
      o.ndpcRegistrationNgn +
        o.ndpcProcessorFeeNgn * o.ndpcProcessors +
        o.domainYearsNgn +
        o.legalNgn +
        o.brandNgn,
    );
    expect(computeOneOff()).toBe(1_370_000);
  });

  it("prices the 15,000-question bank and 300 lessons", () => {
    expect(computeContentCost()).toBe(15_000 * 350 + 300 * 10_000 + 500_000);
    expect(computeContentCost()).toBe(8_750_000);
  });

  it("costs the offline exam lab separately, because it is optional", () => {
    expect(computeExamLab(20)).toBe(20 * 180_000 + 180_000 + 350_000);
    expect(computeExamLab(20)).toBe(4_130_000);
  });

  it("scales the exam lab with the number of machines", () => {
    expect(computeExamLab(30) - computeExamLab(20)).toBe(10 * 180_000);
  });
});

describe("cost model — build routes and five-year TCO", () => {
  it("offers three routes with honest trade-offs", () => {
    const routes = buildRoutes();
    expect(routes.map((r) => r.id)).toEqual(["self", "team", "agency"]);
    expect(routes.every((r) => r.note.length > 0)).toBe(true);
  });

  it("prices the dedicated team at ₦23,100,000", () => {
    const team = buildRoutes().find((r) => r.id === "team")!;
    expect(team.buildNgn).toBe(23_100_000);
    expect(team.months).toBe(7);
  });

  it("prices the agency route at ₦60,000,000 and the self-build at nothing", () => {
    const routes = buildRoutes();
    expect(routes.find((r) => r.id === "agency")!.buildNgn).toBe(60_000_000);
    expect(routes.find((r) => r.id === "self")!.buildNgn).toBe(0);
  });

  it("computes TCO as build + five years of running + setup + content", () => {
    const team = buildRoutes().find((r) => r.id === "team")!;
    expect(computeTco(team, DEFAULT.annualNgn)).toBe(
      team.buildNgn + DEFAULT.annualNgn * 5 + computeOneOff() + computeContentCost(),
    );
  });

  it("ranks the routes self < team < agency", () => {
    const routes = buildRoutes();
    const tco = Object.fromEntries(routes.map((r) => [r.id, computeTco(r, DEFAULT.annualNgn)]));
    expect(tco.self).toBeLessThan(tco.team);
    expect(tco.team).toBeLessThan(tco.agency);
    expect(tco.self).toBe(DEFAULT.annualNgn * 5 + computeOneOff() + computeContentCost());
  });
});

describe("cost model — CLI", () => {
  it("parses profile overrides and display flags", () => {
    const { profile, breakdown, json } = parseArgs([
      "--students",
      "800",
      "--fx",
      "1600",
      "--marketing",
      "3000",
      "--lab-computers",
      "12",
      "--breakdown",
      "--json",
    ]);
    expect(profile.students).toBe(800);
    expect(profile.fx).toBe(1600);
    expect(profile.marketingMessages).toBe(3000);
    expect(profile.labComputers).toBe(12);
    expect(breakdown).toBe(true);
    expect(json).toBe(true);
  });

  it("falls back to the documented defaults", () => {
    const { profile, breakdown, json } = parseArgs([]);
    expect(profile).toEqual(DEFAULT_PROFILE);
    expect(breakdown).toBe(false);
    expect(json).toBe(false);
  });

  it("re-costs a smaller school without touching the rate card", () => {
    const small = computeRecurring({
      ...DEFAULT_PROFILE,
      students: 800,
      families: 600,
      teachers: 90,
      marketingMessages: 3000,
    });
    expect(small.annualNgn).toBeLessThan(DEFAULT.annualNgn);
    expect(small.perStudentYearNgn).toBeGreaterThan(0);
    expect(RATES.infra.appHosting).toBe(20); // rates are shared, not per-school
  });

  it("keeps RECURRING_DETAIL volumes aligned with the WhatsApp model", () => {
    expect(RECURRING_DETAIL.whatsappUtilityMessages).toBeGreaterThan(
      RECURRING_DETAIL.whatsappServiceMessages,
    );
    expect(RECURRING_DETAIL.smsMessages).toBeGreaterThan(0);
  });
});
