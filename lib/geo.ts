/**
 * GPS punch evaluation for staff clock in / clock out.
 *
 * Design rules this file encodes (see docs/rebuild/03-gps-attendance.md):
 *
 *  1. The client sends *evidence*; only the server decides. Nothing here trusts
 *     a distance, a decision or a "trusted" flag computed on the device.
 *  2. A punch is never silently dropped. Every punch is recorded with the
 *     verdict and its trust flags, so an honest member of staff who genuinely
 *     was on site is never punished by a bad GPS fix — they land in a review
 *     queue with the evidence attached.
 *  3. Accuracy is a first-class input. Indoor fixes in a concrete classroom
 *     block in Nigeria routinely read 20-80m; a 20m geofence would reject
 *     correct punches, so the default radius is 150m and the accuracy gate is
 *     deliberately generous (120m, reject only beyond 3x that).
 *  4. A punch captured offline (no data, dead battery in the queue) is valid
 *     but flagged, because the device clock and the server clock will disagree.
 *
 * Everything in this module is pure: no Prisma, no network, no Date.now() — the
 * caller passes the timestamps in. That keeps it trivially testable and usable
 * from a route handler, a worker or the mobile app's sync job.
 */

export const EARTH_RADIUS_M = 6_371_008.8;

export type Coordinates = { latitude: number; longitude: number };

export function isValidCoordinate(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const c = value as { latitude?: unknown; longitude?: unknown };
  return (
    typeof c.latitude === "number" &&
    typeof c.longitude === "number" &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    c.latitude >= -90 &&
    c.latitude <= 90 &&
    c.longitude >= -180 &&
    c.longitude <= 180
  );
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance in metres between two points.
 *
 * Haversine, not the equirectangular approximation: at Lagos latitudes
 * (~6.5°N) the two agree within a metre or so, but the school's campus may sit
 * anywhere in the country and the cost difference is irrelevant for one call
 * per punch.
 */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Geofence = {
  id: string | null;
  name?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  /** Overrides the policy ceiling for this site (an annex may allow 200m). */
  maxAccuracyMeters?: number;
};

export function distanceToGeofence(coords: Coordinates, geofence: Geofence): number {
  return haversineMeters(coords, {
    latitude: geofence.latitude,
    longitude: geofence.longitude,
  });
}

/** Nearest geofence that contains the point, or null when none does. */
export function bestGeofence(
  coords: Coordinates,
  geofences: readonly Geofence[],
): { geofence: Geofence; distanceMeters: number } | null {
  let best: { geofence: Geofence; distanceMeters: number } | null = null;
  for (const geofence of geofences) {
    const distanceMeters = distanceToGeofence(coords, geofence);
    if (distanceMeters > geofence.radiusMeters) continue;
    if (!best || distanceMeters < best.distanceMeters) best = { geofence, distanceMeters };
  }
  return best;
}

export type TrustFlag =
  | "NO_LOCATION"
  | "LOW_ACCURACY"
  | "OFF_SITE"
  | "MOCK_LOCATION"
  | "STALE_PUNCH"
  | "CLOCK_SKEW"
  | "IMPOSSIBLE_TRAVEL";

export type PunchDecision = "ACCEPT" | "ACCEPT_FLAGGED" | "REQUIRE_SUPERVISOR" | "REJECT";

export type PunchMethod = "QR_GPS" | "QR_ONLY" | "GPS_ONLY" | "MANUAL" | "SUPERVISOR";

export type PunchPolicy = {
  /** Distance beyond which a punch is off-site. Default 150m — see file header. */
  radiusMeters: number;
  /** Accuracy worse than this is flagged. */
  maxAccuracyMeters: number;
  /** Accuracy worse than maxAccuracyMeters * this is rejected outright (retry). */
  rejectAccuracyMultiplier: number;
  /** Offline punches older than this need a human. */
  offlineMaxAgeMs: number;
  /** Device clock disagreement tolerated before it is worth flagging. */
  maxClockSkewMs: number;
  /** Above this implied speed between consecutive punches → impossible travel. */
  maxSpeedMps: number;
  offSiteDecision: "ACCEPT_FLAGGED" | "REQUIRE_SUPERVISOR" | "REJECT";
};

export const DEFAULT_PUNCH_POLICY: PunchPolicy = {
  radiusMeters: 150,
  maxAccuracyMeters: 120,
  rejectAccuracyMultiplier: 3,
  offlineMaxAgeMs: 6 * 60 * 60 * 1000, // 6 hours — a morning punch synced in the afternoon
  maxClockSkewMs: 5 * 60 * 1000, // 5 minutes
  maxSpeedMps: 33.4, // ~120 km/h
  offSiteDecision: "REQUIRE_SUPERVISOR",
};

export type PunchEvidence = {
  method: PunchMethod;
  coords: Coordinates | null;
  accuracyMeters?: number | null;
  /** Set by the client when the OS reports a mocked/simulated location provider. */
  mockLocation?: boolean;
  /** Device clock at the moment of the punch. Null when the client sent none. */
  capturedAtClient?: Date | null;
  /** Server clock when the punch was received. Authoritative. */
  serverReceivedAt: Date;
  deviceId?: string | null;
};

export type PreviousPunch = { coords: Coordinates; at: Date } | null;

export type PunchVerdict = {
  decision: PunchDecision;
  flags: TrustFlag[];
  /** Null when no usable coordinate was supplied. */
  distanceMeters: number | null;
  insideGeofence: boolean | null;
  matchedGeofenceId: string | null;
  /** Human-readable "why", shown to the staff member or to the reviewer. */
  reasons: string[];
};

const DECISION_RANK: Record<PunchDecision, number> = {
  ACCEPT: 0,
  ACCEPT_FLAGGED: 1,
  REQUIRE_SUPERVISOR: 2,
  REJECT: 3,
};

function worst(a: PunchDecision, b: PunchDecision): PunchDecision {
  return DECISION_RANK[a] >= DECISION_RANK[b] ? a : b;
}

/**
 * Decide what to do with a single punch.
 *
 * `previous` is the staff member's most recent punch (any type) when known;
 * it powers the impossible-travel check. Velocity is only ever a *flag* — a
 * staff member with two phones, a shared account or a bad first fix can legally
 * appear to teleport, and accusing them automatically would be wrong.
 */
export function evaluatePunch(input: {
  evidence: PunchEvidence;
  geofence: Geofence;
  policy?: Partial<PunchPolicy>;
  previous?: PreviousPunch;
}): PunchVerdict {
  const policy: PunchPolicy = { ...DEFAULT_PUNCH_POLICY, ...input.policy };
  const { evidence, geofence, previous = null } = input;

  const flags: TrustFlag[] = [];
  const reasons: string[] = [];
  let decision: PunchDecision = "ACCEPT";

  const flag = (f: TrustFlag, reason: string, next: PunchDecision) => {
    if (!flags.includes(f)) flags.push(f);
    reasons.push(reason);
    decision = worst(decision, next);
  };

  /* ── 1. Is there a usable location at all? ─────────────────────────── */
  if (!isValidCoordinate(evidence.coords)) {
    return {
      decision: "REQUIRE_SUPERVISOR",
      flags: ["NO_LOCATION"],
      distanceMeters: null,
      insideGeofence: null,
      matchedGeofenceId: null,
      reasons: [
        "No usable GPS fix was supplied with this punch — recorded and queued for a supervisor rather than dropped.",
      ],
    };
  }
  const coords = evidence.coords;

  /* ── 2. How precise was the fix? ───────────────────────────────────── */
  const accuracy = evidence.accuracyMeters ?? null;
  if (accuracy !== null && Number.isFinite(accuracy)) {
    const ceiling = geofence.maxAccuracyMeters ?? policy.maxAccuracyMeters;
    if (accuracy > ceiling * policy.rejectAccuracyMultiplier) {
      flag(
        "LOW_ACCURACY",
        `GPS accuracy was ${Math.round(accuracy)}m, far beyond the ${ceiling}m limit.`,
        "REJECT",
      );
    } else if (accuracy > ceiling) {
      flag(
        "LOW_ACCURACY",
        `GPS accuracy was ${Math.round(accuracy)}m (limit ${ceiling}m) — accepted with a flag.`,
        "ACCEPT_FLAGGED",
      );
    }
  }

  /* ── 3. Distance from the geofence ─────────────────────────────────── */
  const radius = geofence.radiusMeters || policy.radiusMeters;
  const distanceMeters = distanceToGeofence(coords, geofence);
  const inside = distanceMeters <= radius;
  if (!inside) {
    flag(
      "OFF_SITE",
      `${Math.round(distanceMeters)}m from ${geofence.name ?? "the campus centre"} (radius ${radius}m).`,
      policy.offSiteDecision,
    );
  }

  /* ── 4. Mocked location ────────────────────────────────────────────── */
  if (evidence.mockLocation === true) {
    flag(
      "MOCK_LOCATION",
      "The device reported a simulated/mock location provider.",
      "REQUIRE_SUPERVISOR",
    );
  }

  /* ── 5. Device clock vs server clock ───────────────────────────────── */
  const captured = evidence.capturedAtClient ?? null;
  if (captured && Number.isFinite(captured.getTime())) {
    const delta = evidence.serverReceivedAt.getTime() - captured.getTime();

    if (delta > policy.offlineMaxAgeMs) {
      // Genuine offline punch (queue synced later) — valid, needs a human.
      flag(
        "STALE_PUNCH",
        `Captured on the device ${Math.round(delta / 60_000)} minutes before it reached the server.`,
        "REQUIRE_SUPERVISOR",
      );
    } else if (delta < -policy.maxClockSkewMs) {
      // Device clock is *ahead* of the server: wrong time, not a stale punch.
      flag(
        "CLOCK_SKEW",
        `Device clock is ${Math.round(-delta / 60_000)} minutes ahead of the server clock.`,
        "ACCEPT_FLAGGED",
      );
    }
  }

  /* ── 6. Impossible travel since the previous punch ─────────────────── */
  if (previous && isValidCoordinate(previous.coords)) {
    const gapMs = evidence.serverReceivedAt.getTime() - previous.at.getTime();
    if (gapMs > 0) {
      const travelled = haversineMeters(previous.coords, coords);
      const speedMps = travelled / (gapMs / 1000);
      if (speedMps > policy.maxSpeedMps) {
        flag(
          "IMPOSSIBLE_TRAVEL",
          `${(travelled / 1000).toFixed(1)}km in ${Math.round(gapMs / 60_000)} minutes implies ${Math.round(
            speedMps * 3.6,
          )}km/h since the last punch.`,
          "REQUIRE_SUPERVISOR",
        );
      }
    }
  }

  if (reasons.length === 0) reasons.push("On-site punch accepted.");

  return {
    decision,
    flags,
    distanceMeters: Math.round(distanceMeters * 10) / 10,
    insideGeofence: inside,
    matchedGeofenceId: geofence.id,
    reasons,
  };
}

/**
 * Lateness is still computed the way the QR path already does it
 * (lib/staff-attendance.ts, Africa/Lagos, HH:mm cutoff) — this helper only
 * answers "does this punch need a human before it is trusted?".
 */
export function needsHumanReview(verdict: PunchVerdict): boolean {
  return verdict.decision === "REQUIRE_SUPERVISOR";
}
