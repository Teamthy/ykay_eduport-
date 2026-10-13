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

export type CloudProfile = "generic" | "oci-budget" | "oci-resilient";

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
  /** Where the backend runs. `oci-*` prices Oracle Cloud + Cloudflare (see 10). */
  cloud: CloudProfile;
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
  cloud: "generic",
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

/* ── Oracle Cloud Infrastructure + Cloudflare ──────────────────────────── */

/**
 * OCI public list prices, USD, verified 2026-10-13.
 *
 * Two facts drive the whole design:
 *   1. **Block storage, not compute, is what a school database costs.** The
 *      managed PostgreSQL service lists at $273.18/month for the smallest
 *      shape (4 vCPU / 32 GB / 500 GB) — more than every other line combined.
 *      Self-managed PostgreSQL on an Ampere A1 VM is ~$32/month.
 *   2. **OCI gives 10 TB of internet egress free every month**, then $0.0085/GB
 *      — roughly 10× cheaper than AWS. A 3,000-user school will not approach it.
 *
 * The Always Free tier is deliberately *not* used for production: Oracle halved
 * it on 2026-06-15 (4→2 OCPU, 24→12 GB) and reclaims instances that stay under
 * 20% CPU/network/memory for a 7-day window. It is used for staging, where a
 * reclaim is an inconvenience rather than an outage.
 */
export const OCI_RATES = {
  compute: {
    /** Ampere A1 (Arm): cheapest shape, and Go/Node both build for arm64. */
    a1OcpuHour: 0.01,
    a1GbHour: 0.0015,
    /** x86 equivalent, for comparison. */
    e5OcpuHour: 0.03,
    e5GbHour: 0.002,
  },
  /** Balanced tier: $0.0255/GB capacity + $0.017/GB for the default 10 VPUs. */
  blockVolumeGbMonth: 0.0425,
  objectStorageGbMonth: 0.0255,
  infrequentAccessGbMonth: 0.015,
  archiveGbMonth: 0.0026,
  freeEgressTbPerMonth: 10,
  egressPerGbAfterFree: 0.0085,
  /** Flexible 10 Mbps minimum; not needed when Cloudflare Tunnel is the ingress. */
  loadBalancerHour: 0.01,
  /** OCI Database with PostgreSQL, smallest listed shape (4 vCPU / 32 GB). */
  managedPostgresSmallMonth: 273.18,
  /** Compute will be billed for ~730 hours in an average month. */
  hoursPerMonth: 730,
} as const;

export const CLOUDFLARE_RATES = {
  /** Pro moved from $20 to $25 per domain in early 2026. */
  proMonth: 25,
  freeMonth: 0,
  /** R2: zero egress. Kept in the card in case media outgrows OCI Object Storage. */
  r2StorageGbMonth: 0.015,
  r2ClassAMillion: 4.5,
  r2ClassBMillion: 0.36,
  /** Zero Trust / Access: free to 50 seats, then $7/user/month. */
  zeroTrustFreeSeats: 50,
  zeroTrustPerUserMonth: 7,
  /** Tunnel connectors, Turnstile and the Workers free tier carry no charge here. */
  tunnelMonth: 0,
  turnstileMonth: 0,
  workersFreeRequestsPerDay: 100_000,
} as const;

/** Shape of each cloud profile, so the trade-off is a table rather than an opinion. */
export const OCI_SHAPES = {
  "oci-budget": {
    label: "OCI budget",
    app: { count: 1, ocpu: 2, gb: 12 },
    db: { count: 1, ocpu: 2, gb: 16 },
    blockGb: 150,
    objectGb: 300,
    cloudflarePro: false,
    note: "One app VM (Go + Next.js + Valkey) and one database VM. No standby: a database failure means a restore, RTO 30–60 minutes. Right for development through the first phase of the money build.",
  },
  "oci-resilient": {
    label: "OCI resilient",
    app: { count: 1, ocpu: 4, gb: 16 },
    db: { count: 2, ocpu: 2, gb: 16 },
    blockGb: 300,
    objectGb: 500,
    cloudflarePro: true,
    note: "Bigger app VM with room for blue/green, database hot standby with sub-2-minute failover, Cloudflare Pro for the full WAF ruleset and 20-second analytics. The configuration the school should be on before fees and results go live.",
  },
} as const;

export type OciProfileId = keyof typeof OCI_SHAPES;

/** Monthly USD for one compute instance. */
export function ociComputeMonth(ocpu: number, gb: number, shape: "a1" | "e5" = "a1"): number {
  const { compute, hoursPerMonth } = OCI_RATES;
  const ocpuRate = shape === "a1" ? compute.a1OcpuHour : compute.e5OcpuHour;
  const gbRate = shape === "a1" ? compute.a1GbHour : compute.e5GbHour;
  return (ocpu * ocpuRate + gb * gbRate) * hoursPerMonth;
}

export function ociInfraProfile(id: OciProfileId) {
  const shape = OCI_SHAPES[id];
  const appCompute = ociComputeMonth(shape.app.ocpu, shape.app.gb) * shape.app.count;
  const dbCompute = ociComputeMonth(shape.db.ocpu, shape.db.gb) * shape.db.count;
  const block = shape.blockGb * OCI_RATES.blockVolumeGbMonth;
  const object = shape.objectGb * OCI_RATES.objectStorageGbMonth;
  const cloudflare = shape.cloudflarePro ? CLOUDFLARE_RATES.proMonth : CLOUDFLARE_RATES.freeMonth;

  const lines = [
    {
      label: `App compute (${shape.app.count} × ${shape.app.ocpu} OCPU / ${shape.app.gb} GB, Ampere A1)`,
      usd: appCompute,
    },
    {
      label: `Database compute (${shape.db.count} × ${shape.db.ocpu} OCPU / ${shape.db.gb} GB, Ampere A1)`,
      usd: dbCompute,
    },
    { label: `Block storage (${shape.blockGb} GB balanced)`, usd: block },
    { label: `Object storage (${shape.objectGb} GB standard)`, usd: object },
    { label: `Cloudflare (${shape.cloudflarePro ? "Pro" : "Free"})`, usd: cloudflare },
  ];

  return {
    id,
    label: shape.label,
    note: shape.note,
    lines,
    /** Fixed: it runs whether or not anyone uses the system. */
    fixedUsd: appCompute + dbCompute + cloudflare,
    /** Usage-scaled: storage grows with the school's documents and history. */
    usageUsd: block + object,
    monthlyUsd: appCompute + dbCompute + block + object + cloudflare,
  };
}

/** The unchanged part of the bill: mail and the domain, whichever cloud runs the app. */
export function sharedInfraMonth(): { label: string; usd: number }[] {
  return [
    { label: "Transactional email", usd: RATES.infra.email },
    { label: "Domain registration", usd: RATES.infra.domain },
  ];
}

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

export function ociProfileId(profile: Profile): OciProfileId {
  return profile.cloud === "oci-resilient" ? "oci-resilient" : "oci-budget";
}

/** Monthly USD for infrastructure, whichever cloud the profile selects. */
export function resolveInfraMonthlyUsd(profile: Profile = DEFAULT_PROFILE): number {
  if (profile.cloud === "generic") return infraMonthlyUsd();
  const oci = ociInfraProfile(ociProfileId(profile)).monthlyUsd;
  const shared = sharedInfraMonth().reduce((sum, line) => sum + line.usd, 0);
  return oci + shared;
}

/** The full monthly infrastructure bill, itemised. */
export function infraBreakdown(
  profile: Profile = DEFAULT_PROFILE,
): { label: string; usd: number }[] {
  if (profile.cloud === "generic") {
    return Object.entries(RATES.infra).map(([key, usd]) => ({ label: key, usd }));
  }
  return [...ociInfraProfile(ociProfileId(profile)).lines, ...sharedInfraMonth()];
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

  const infraMonthlyUsd = resolveInfraMonthlyUsd(profile);
  const infra = naira(infraMonthlyUsd * 12, fx);

  const fixedMonthly =
    profile.cloud === "generic"
      ? fixedMonthlyUsd()
      : ociInfraProfile(ociProfileId(profile)).fixedUsd + RATES.infra.email + RATES.infra.domain;
  const whatsappNgn = naira(whatsapp.totalUsd, fx);
  const sms = smsCostNgn();
  const aiNgn = naira(ai.totalUsd, fx);
  const gateway = gatewayFeesNgn();

  const annualNgn = infra + whatsappNgn + sms + aiNgn;
  const paidApisNgn = whatsappNgn + gateway + aiNgn + sms;
  const fixedNgn = naira(fixedMonthly * 12, fx);

  return {
    profile,
    infraMonthlyUsd,
    fixedMonthlyUsd: fixedMonthly,
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
  --cloud <id>            generic | oci-budget | oci-resilient (default generic)
                            oci-* prices Oracle Cloud Infrastructure + Cloudflare:
                            the Go/Next.js deployment target
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
      case "--cloud": {
        const value = next();
        if (value === "generic" || value === "oci-budget" || value === "oci-resilient") {
          profile.cloud = value;
        } else {
          console.error(
            `unknown --cloud '${value}' (expected generic, oci-budget or oci-resilient)`,
          );
          process.exit(2);
        }
        break;
      }
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
  console.log(`  FX                 ₦${n(profile.fx)} / $1`);
  console.log(`  Cloud              ${profile.cloud}\n`);

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
    console.log(`\n  — infrastructure (${profile.cloud}) —`);
    for (const line of infraBreakdown(profile)) {
      console.log(`    ${line.label.padEnd(52)} $${line.usd.toFixed(2)}/month`);
    }
    if (profile.cloud !== "generic") {
      const shape = OCI_SHAPES[ociProfileId(profile)];
      const perDb = ociComputeMonth(shape.db.ocpu, shape.db.gb);
      console.log(
        `    ${"managed PostgreSQL on OCI:".padEnd(52)} $${OCI_RATES.managedPostgresSmallMonth.toFixed(2)}/month`,
      );
      console.log(
        `    ${"  = this self-managed database VM ×".padEnd(52)} ${(OCI_RATES.managedPostgresSmallMonth / perDb).toFixed(1)}×`,
      );
      console.log(
        `    ${"Cloudflare Tunnel, Turnstile, Zero Trust ≤50 seats:".padEnd(52)} $0.00/month`,
      );
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
