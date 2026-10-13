/**
 * Famex OS — running-cost model.
 *
 *   npx tsx scripts/cost-model.ts
 *   npx tsx scripts/cost-model.ts --breakdown
 *   npx tsx scripts/cost-model.ts --json
 *   npx tsx scripts/cost-model.ts --students 800 --fx 1600 --marketing 6000
 *
 * Dependency-free on purpose: this must run on a laptop with no `.env`, no
 * database and no network, because the school's bursar will want to re-run it
 * with their own assumptions.
 *
 * Money rules
 *   - Naira figures are integers (rounded at the end of each computation).
 *   - USD rates are carried as decimals, converted once at `fx`.
 *   - Nothing here is a quote: `06-quotation.md` is the quote. This is the
 *     arithmetic behind it, so that when a rate changes we can see exactly
 *     which line moved.
 *
 * Sources for the rate card (verified 2026-10-13, see `05-cost-model.md`):
 *   - WhatsApp Business (Nigeria, effective 2026-10-01): utility $0.0067,
 *     marketing $0.0516, service $0.0067 with the first 1,000 conversations per
 *     number per month free, authentication-international $0.0750.
 *   - SMS (Nigerian aggregators): promotional ₦5.95–8.00, transactional
 *     ₦6.65–9.00 per message.
 *   - LLM tokens: Gemini 2.5 Flash-Lite $0.10/$0.40, GPT-5 mini $0.25/$2.00,
 *     Claude Haiku 4.5 $1.00/$5.00, Gemini 3.6–3.8 Flash $0.75/$3.75
 *     (introductory through 2026-12-31).
 *   - Paystack: 1.5% + ₦100 (₦2,500 and above, capped ₦2,000); the model uses a
 *     blended 0.70% of collections, which is what a school actually pays once
 *     transfers, POS and cash are mixed in.
 *   - NDPC registration: MDP-EHL ₦100,000 (1,000–5,000 data subjects — a
 *     3,000-user school), ₦5,000 processor activity fee each.
 *   - Lagos developer salaries (2026): mid-level ₦500k–1.5M/month, senior
 *     ₦1.2M–2.5M+/month.
 */

export type Profile = {
  students: number;
  families: number;
  staff: number;
  teachers: number;
  labComputers: number;
  /** Naira per US dollar. */
  fx: number;
  /** Marketing-category WhatsApp messages per year (see the warning in W4). */
  marketingMessages: number;
};

export const DEFAULT_PROFILE: Profile = {
  students: 2300,
  families: 1500,
  staff: 300,
  teachers: 250,
  labComputers: 20,
  /** Naira per US dollar. */
  fx: 1500,
  /** Marketing-category WhatsApp messages per year (see the warning in W4). */
  marketingMessages: 9000,
};

/* ── rate card ─────────────────────────────────────────────────────────── */

export const RATES = {
  /** Monthly USD, paid to vendors abroad. */
  infra: {
    appHosting: 20,
    postgres: 35,
    redis: 5,
    storage: 10,
    email: 20,
    domain: 6,
  },
  /** Optional infrastructure that a growing school triggers. */
  infraOptional: {
    monitoring: 26,
    secondAppInstance: 20,
    videoCdn: 45,
  },
  whatsapp: {
    utilityUsd: 0.0067,
    /** Published rate is $0.0516; rounded up so the estimate cannot flatter us. */
    marketingUsd: 0.052,
    serviceUsd: 0.0067,
    /** First 1,000 service conversations per number per month are free. */
    serviceFreePerNumberPerMonth: 1000,
  },
  smsNgn: 6,
  /** Blended share of collections paid to payment gateways. */
  gatewayShare: 0.007,
  /** Naira collected through the system in a year. */
  annualCollectionsNgn: 80_000_000,
  salaries: {
    midMonthlyNgn: 700_000,
    seniorMonthlyNgn: 1_500_000,
    designerMonthlyNgn: 400_000,
  },
  oneOff: {
    ndpcRegistrationNgn: 100_000,
    ndpcProcessorFeeNgn: 5_000,
    ndpcProcessors: 2,
    domainYearsNgn: 60_000,
    legalNgn: 400_000,
    brandNgn: 800_000,
  },
  content: {
    cbtItemNgn: 350,
    cbtItems: 15_000,
    lessonNgn: 10_000,
    lessons: 300,
    equipmentNgn: 500_000,
  },
  examLab: {
    computerNgn: 180_000,
    lanNgn: 180_000,
    upsNgn: 350_000,
  },
  build: {
    teamMonths: 7,
    mids: 2,
    seniors: 1,
    designers: 1,
    agencyNgn: 60_000_000,
  },
} as const;

/* ── message volumes ───────────────────────────────────────────────────── */

/** What the school sends in a year at the default profile. */
export const RECURRING_DETAIL = {
  whatsappUtilityMessages: 36_000,
  whatsappServiceMessages: 6_000,
  smsMessages: 9_000,
} as const;

/**
 * AI workloads — annual token volumes in millions.
 *
 * These are estimates, not measurements: the point is that each line has a
 * named model with a published price, so when a provider changes its rate card
 * the effect on the school's running cost is one multiplication away.
 */
export const AI_WORKLOADS = [
  { id: "tutor", label: "AI tutor & study chat", model: "flashLite", inputM: 12, outputM: 6 },
  { id: "practice", label: "Practice feedback", model: "flashLite", inputM: 8, outputM: 3 },
  { id: "questions", label: "Question drafting", model: "mini", inputM: 20, outputM: 8 },
  { id: "remarks", label: "Remarks & insight reports", model: "mini", inputM: 6, outputM: 2 },
  { id: "comms", label: "Parent message composition", model: "haiku", inputM: 10, outputM: 4 },
  { id: "lessons", label: "Lesson plans & schemes", model: "flash", inputM: 15, outputM: 5 },
  {
    id: "summaries",
    label: "Summaries & rewrite tools",
    model: "flashLite",
    inputM: 6,
    outputM: 2,
  },
] as const;

/** USD per million tokens, input/output. */
export const AI_MODELS = {
  flashLite: { input: 0.1, output: 0.4 },
  mini: { input: 0.25, output: 2.0 },
  haiku: { input: 1.0, output: 5.0 },
  flash: { input: 0.75, output: 3.75 },
} as const;

/* ── computations ──────────────────────────────────────────────────────── */

const naira = (usd: number, fx: number) => Math.round(usd * fx);

export function infraMonthlyUsd(): number {
  return Object.values(RATES.infra).reduce((sum, v) => sum + v, 0);
}

export function infraAnnualNgn(fx: number): number {
  return naira(infraMonthlyUsd() * 12, fx);
}

/** Fixed infrastructure = the lines that do not move with usage. */
export function fixedMonthlyUsd(): number {
  const { appHosting, postgres, redis, email, domain } = RATES.infra;
  return appHosting + postgres + redis + email + domain;
}

export function whatsappCost(profile: Profile) {
  const { utilityUsd, marketingUsd, serviceUsd } = RATES.whatsapp;
  const utility = RECURRING_DETAIL.whatsappUtilityMessages * utilityUsd;
  const marketing = profile.marketingMessages * marketingUsd;
  const service = RECURRING_DETAIL.whatsappServiceMessages * serviceUsd;
  return { utility, marketing, service, totalUsd: utility + marketing + service };
}

export function smsCostNgn(): number {
  return RECURRING_DETAIL.smsMessages * RATES.smsNgn;
}

export function aiCostUsd() {
  const lines = AI_WORKLOADS.map((w) => {
    const model = AI_MODELS[w.model];
    const input = w.inputM * model.input;
    const output = w.outputM * model.output;
    return { ...w, inputUsd: input, outputUsd: output, totalUsd: input + output };
  });
  return { lines, totalUsd: lines.reduce((sum, l) => sum + l.totalUsd, 0) };
}

export function gatewayFeesNgn(collectedNgn = RATES.annualCollectionsNgn): number {
  return Math.round(collectedNgn * RATES.gatewayShare);
}

/** The school's year: what it costs to run, month after month. */
export function computeRecurring(profile: Profile = DEFAULT_PROFILE) {
  const whatsapp = whatsappCost(profile);
  const ai = aiCostUsd();
  const fx = profile.fx;

  const infra = infraAnnualNgn(fx);
  const whatsappNgn = naira(whatsapp.totalUsd, fx);
  const sms = smsCostNgn();
  const aiNgn = naira(ai.totalUsd, fx);
  const gateway = gatewayFeesNgn();

  const annualNgn = infra + whatsappNgn + sms + aiNgn;
  const paidApisNgn = whatsappNgn + gateway + aiNgn + sms;
  const fixedNgn = naira(fixedMonthlyUsd() * 12, fx);

  return {
    profile,
    infraMonthlyUsd: infraMonthlyUsd(),
    fixedMonthlyUsd: fixedMonthlyUsd(),
    infra,
    whatsappNgn,
    whatsappDetail: whatsapp,
    sms,
    aiNgn,
    aiDetail: ai,
    gateway,
    annualNgn,
    paidApisNgn,
    fixedNgn,
    usageScaledNgn: annualNgn - fixedNgn,
    fixedShare: fixedNgn / annualNgn,
    perStudentYearNgn: Math.round(annualNgn / profile.students),
    perStudentMonthNgn: Math.round(annualNgn / profile.students / 12),
    serverAndDbMonthlyNgn: naira(
      RATES.infra.appHosting + RATES.infra.postgres + RATES.infra.redis,
      fx,
    ),
  };
}

export function computeOneOff(): number {
  const o = RATES.oneOff;
  return (
    o.ndpcRegistrationNgn +
    o.ndpcProcessorFeeNgn * o.ndpcProcessors +
    o.domainYearsNgn +
    o.legalNgn +
    o.brandNgn
  );
}

export function computeContentCost(): number {
  const c = RATES.content;
  return c.cbtItemNgn * c.cbtItems + c.lessonNgn * c.lessons + c.equipmentNgn;
}

export function computeExamLab(labComputers = DEFAULT_PROFILE.labComputers): number {
  const e = RATES.examLab;
  return e.computerNgn * labComputers + e.lanNgn + e.upsNgn;
}

export type RouteId = "self" | "team" | "agency";

export type BuildRoute = {
  id: RouteId;
  label: string;
  buildNgn: number;
  months: number;
  note: string;
};

export function buildRoutes(): BuildRoute[] {
  const { salaries, build } = RATES;
  const monthly =
    salaries.midMonthlyNgn * build.mids +
    salaries.seniorMonthlyNgn * build.seniors +
    salaries.designerMonthlyNgn * build.designers;

  return [
    {
      id: "self",
      label: "Self-build (school's own team)",
      buildNgn: 0,
      months: 0,
      note: "No cash cost, but the school carries the schedule risk and the hiring risk.",
    },
    {
      id: "team",
      label: "Small dedicated team (recommended)",
      buildNgn: monthly * build.teamMonths,
      months: build.teamMonths,
      note: "2 mid-level + 1 senior + part-time designer, 7 months.",
    },
    {
      id: "agency",
      label: "Agency turnkey",
      buildNgn: build.agencyNgn,
      months: 9,
      note: "Fastest start, least control, highest cost; handover is the risk.",
    },
  ];
}

/** Build + five years of running + one-off setup + content. */
export function computeTco(route: BuildRoute, annualNgn: number, years = 5): number {
  return route.buildNgn + annualNgn * years + computeOneOff() + computeContentCost();
}

/* ── CLI ───────────────────────────────────────────────────────────────── */

function usage() {
  console.log(`Famex OS cost model

  npx tsx scripts/cost-model.ts [options]

  --fx <naira>            Naira per US dollar (default ${DEFAULT_PROFILE.fx})
  --students <n>          Student headcount (default ${DEFAULT_PROFILE.students})
  --families <n>          Family count (default ${DEFAULT_PROFILE.families})
  --teachers <n>          Teacher count (default ${DEFAULT_PROFILE.teachers})
  --marketing <n>         WhatsApp marketing messages per year (default ${DEFAULT_PROFILE.marketingMessages})
  --lab-computers <n>     Machines in the offline exam lab (default ${DEFAULT_PROFILE.labComputers})
  --breakdown             Show every line item
  --json                  Machine-readable output
  -h, --help              This message`);
}

export function parseArgs(argv: string[]) {
  const profile: Profile = { ...DEFAULT_PROFILE };
  let breakdown = false;
  let json = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) {
        console.error(`missing value for ${arg}`);
        process.exit(2);
      }
      i += 1;
      return value;
    };
    switch (arg) {
      case "--fx":
        profile.fx = Number(next());
        break;
      case "--students":
        profile.students = Number(next());
        break;
      case "--families":
        profile.families = Number(next());
        break;
      case "--teachers":
        profile.teachers = Number(next());
        break;
      case "--marketing":
        profile.marketingMessages = Number(next());
        break;
      case "--lab-computers":
        profile.labComputers = Number(next());
        break;
      case "--breakdown":
        breakdown = true;
        break;
      case "--json":
        json = true;
        break;
      case "-h":
      case "--help":
        usage();
        process.exit(0);
      default:
        console.error(`unknown option '${arg}' (try --help)`);
        process.exit(2);
    }
  }
  return { profile, breakdown, json };
}

const n = (value: number) => value.toLocaleString("en-NG");
const nairaFmt = (value: number) => `₦${n(Math.round(value))}`;
const usdFmt = (value: number) => `$${value.toFixed(2)}`;

function main() {
  const { profile, breakdown, json } = parseArgs(process.argv.slice(2));
  const r = computeRecurring(profile);
  const routes = buildRoutes();
  const oneOff = computeOneOff();
  const content = computeContentCost();
  const examLab = computeExamLab(profile.labComputers);

  if (json) {
    console.log(
      JSON.stringify(
        {
          profile,
          recurring: {
            annualNgn: r.annualNgn,
            infraNgn: r.infra,
            whatsappNgn: r.whatsappNgn,
            smsNgn: r.sms,
            aiNgn: r.aiNgn,
            gatewayNgn: r.gateway,
            paidApisNgn: r.paidApisNgn,
            fixedNgn: r.fixedNgn,
            usageScaledNgn: r.usageScaledNgn,
            fixedShare: Number(r.fixedShare.toFixed(4)),
            perStudentYearNgn: r.perStudentYearNgn,
            perStudentMonthNgn: r.perStudentMonthNgn,
            infraMonthlyUsd: r.infraMonthlyUsd,
          },
          oneOffNgn: oneOff,
          contentNgn: content,
          examLabNgn: examLab,
          routes: routes.map((route) => ({
            ...route,
            tco5yNgn: computeTco(route, r.annualNgn),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Famex OS — running cost\n`);
  console.log(
    `  Profile            ${n(profile.students)} students · ${n(profile.families)} families · ${n(profile.teachers)} teachers · ${n(profile.staff)} staff`,
  );
  console.log(`  FX                 ₦${n(profile.fx)} / $1\n`);

  console.log(`  Annual running     ${nairaFmt(r.annualNgn)}`);
  console.log(`    Infrastructure   ${nairaFmt(r.infra)}   (${usdFmt(r.infraMonthlyUsd)}/month)`);
  console.log(`    WhatsApp         ${nairaFmt(r.whatsappNgn)}`);
  console.log(`    SMS              ${nairaFmt(r.sms)}`);
  console.log(`    AI               ${nairaFmt(r.aiNgn)}`);
  console.log(
    `  Per student        ${nairaFmt(r.perStudentYearNgn)}/year · ${nairaFmt(r.perStudentMonthNgn)}/month`,
  );
  console.log(
    `  Fixed vs usage     ${(r.fixedShare * 100).toFixed(0)}% fixed · ${(100 - r.fixedShare * 100).toFixed(0)}% usage-scaled`,
  );
  console.log(
    `  Payment gateway    ${nairaFmt(r.gateway)}   (on ${nairaFmt(RATES.annualCollectionsNgn)} collected)`,
  );

  if (breakdown) {
    console.log(`\n  — infrastructure —`);
    for (const [key, value] of Object.entries(RATES.infra)) {
      console.log(`    ${key.padEnd(18)} $${value}/month`);
    }
    console.log(`\n  — messages —`);
    console.log(
      `    utility   ${n(RECURRING_DETAIL.whatsappUtilityMessages)} × $${RATES.whatsapp.utilityUsd}`,
    );
    console.log(`    marketing ${n(profile.marketingMessages)} × $${RATES.whatsapp.marketingUsd}`);
    console.log(
      `    service   ${n(RECURRING_DETAIL.whatsappServiceMessages)} × $${RATES.whatsapp.serviceUsd}`,
    );
    console.log(`    SMS       ${n(RECURRING_DETAIL.smsMessages)} × ₦${RATES.smsNgn}`);
    console.log(`\n  — AI workloads (annual tokens, millions) —`);
    for (const line of r.aiDetail.lines) {
      console.log(
        `    ${line.label.padEnd(30)} ${line.inputM}M in / ${line.outputM}M out  ${usdFmt(line.totalUsd)}`,
      );
    }
    console.log(`    ${"subtotal".padEnd(30)} ${usdFmt(r.aiDetail.totalUsd)}`);
  }

  console.log(`\n  — one-off —`);
  console.log(`    setup & compliance            ${nairaFmt(oneOff)}`);
  console.log(`    content (CBT bank + lessons)  ${nairaFmt(content)}`);
  console.log(
    `    offline exam lab (${profile.labComputers} machines) ${nairaFmt(examLab)}  [optional]`,
  );

  console.log(`\n  — build routes & 5-year total cost of ownership —`);
  for (const route of routes) {
    console.log(
      `    ${route.label.padEnd(38)} build ${nairaFmt(route.buildNgn).padStart(14)}   TCO ${nairaFmt(computeTco(route, r.annualNgn))}`,
    );
  }
  console.log(`\n  Rates and sources: docs/famex/05-cost-model.md`);
}

if (process.argv[1]?.includes("cost-model")) main();
