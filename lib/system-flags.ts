import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type SystemFlags = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: string | null;
  updatedByUserId: string | null;
};

const DEFAULT_FLAGS: SystemFlags = {
  maintenanceMode: false,
  maintenanceMessage:
    "Ykay EduPortal is undergoing scheduled maintenance. Please try again shortly.",
  updatedAt: null,
  updatedByUserId: null,
};

function flagsPath() {
  return join(process.cwd(), ".data", "system-flags.json");
}

export function readSystemFlags(): SystemFlags {
  try {
    const path = flagsPath();
    if (!existsSync(path)) return { ...DEFAULT_FLAGS };
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<SystemFlags>;
    return {
      maintenanceMode: Boolean(parsed.maintenanceMode),
      maintenanceMessage:
        typeof parsed.maintenanceMessage === "string" && parsed.maintenanceMessage.trim()
          ? parsed.maintenanceMessage
          : DEFAULT_FLAGS.maintenanceMessage,
      updatedAt: parsed.updatedAt || null,
      updatedByUserId: parsed.updatedByUserId || null,
    };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

export function writeSystemFlags(
  next: Partial<SystemFlags>,
  actorUserId?: string | null,
): SystemFlags {
  const current = readSystemFlags();
  const merged: SystemFlags = {
    ...current,
    ...next,
    maintenanceMode: next.maintenanceMode ?? current.maintenanceMode,
    maintenanceMessage: next.maintenanceMessage ?? current.maintenanceMessage,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actorUserId ?? current.updatedByUserId,
  };
  const dir = join(process.cwd(), ".data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(flagsPath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

/** Env + runtime flags for super-admin system panel (never exposes secret values). */
export function readPublicSystemConfig() {
  const present = (key: string) => Boolean(process.env[key] && String(process.env[key]).trim());
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    nodeEnv: process.env.NODE_ENV || null,
    schoolTimezone: process.env.SCHOOL_TIMEZONE || "Africa/Lagos",
    staffLateCutoff: process.env.STAFF_LATE_CUTOFF || "08:00",
    showDemoBadge: process.env.NEXT_PUBLIC_SHOW_DEMO_BADGE === "true",
    configured: {
      database: present("DATABASE_URL"),
      authSecret: present("AUTH_SECRET"),
      paystackPublic: present("PAYSTACK_PUBLIC_KEY"),
      paystackSecret: present("PAYSTACK_SECRET_KEY"),
      resend: present("RESEND_API_KEY"),
      upstash: present("UPSTASH_REDIS_REST_URL") && present("UPSTASH_REDIS_REST_TOKEN"),
      s3: present("S3_BUCKET") && present("S3_ACCESS_KEY_ID"),
      jobsSecret: present("JOBS_SECRET"),
    },
  };
}
