import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUNCH_POLICY,
  bestGeofence,
  distanceToGeofence,
  evaluatePunch,
  haversineMeters,
  isValidCoordinate,
  needsHumanReview,
  type Geofence,
  type PunchEvidence,
} from "@/lib/geo";

/**
 * Reference campus: a school compound in Ikeja, Lagos.
 * 0.001° of latitude ≈ 111.2m, so the fixtures below move in ~111m steps.
 */
const CAMPUS: Geofence = {
  id: "gf_campus",
  name: "Main campus",
  latitude: 6.6018,
  longitude: 3.3515,
  radiusMeters: 150,
};

const ON_SITE = { latitude: 6.6018, longitude: 3.3515 };
const NORTH_111M = { latitude: 6.6028, longitude: 3.3515 };
const NORTH_445M = { latitude: 6.6058, longitude: 3.3515 };
const FAR_AWAY = { latitude: 6.5244, longitude: 3.3792 }; // Lagos Island, ~9km away

function evidence(overrides: Partial<PunchEvidence> = {}): PunchEvidence {
  return {
    method: "QR_GPS",
    coords: ON_SITE,
    accuracyMeters: 12,
    mockLocation: false,
    capturedAtClient: new Date("2026-10-13T07:45:00.000Z"),
    serverReceivedAt: new Date("2026-10-13T07:45:03.000Z"),
    deviceId: "dev_1",
    ...overrides,
  };
}

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters(ON_SITE, ON_SITE)).toBe(0);
  });

  it("approximates known short distances", () => {
    // One degree of latitude is ~111.2km.
    const d = haversineMeters({ latitude: 6, longitude: 3 }, { latitude: 7, longitude: 3 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_500);
  });

  it("measures the ~111m fixture accurately", () => {
    const d = haversineMeters(ON_SITE, NORTH_111M);
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(118);
  });
});

describe("isValidCoordinate", () => {
  it("accepts plausible coordinates and rejects junk", () => {
    expect(isValidCoordinate(ON_SITE)).toBe(true);
    expect(isValidCoordinate({ latitude: 91, longitude: 3 })).toBe(false);
    expect(isValidCoordinate({ latitude: 6, longitude: 181 })).toBe(false);
    expect(isValidCoordinate({ latitude: Number.NaN, longitude: 3 })).toBe(false);
    expect(isValidCoordinate(null)).toBe(false);
    expect(isValidCoordinate({ lat: 6, lng: 3 })).toBe(false);
  });
});

describe("distanceToGeofence / bestGeofence", () => {
  const ANNEX: Geofence = {
    id: "gf_annex",
    name: "Annex",
    latitude: 6.6028,
    longitude: 3.3515,
    radiusMeters: 120,
  };

  it("finds the nearest containing geofence for a multi-site school", () => {
    const hit = bestGeofence(NORTH_111M, [CAMPUS, ANNEX]);
    expect(hit?.geofence.id).toBe("gf_annex");
  });

  it("returns null when the point is outside every geofence", () => {
    expect(bestGeofence(FAR_AWAY, [CAMPUS, ANNEX])).toBeNull();
  });

  it("reports distance from the geofence centre", () => {
    expect(distanceToGeofence(NORTH_445M, CAMPUS)).toBeGreaterThan(400);
  });
});

describe("evaluatePunch — happy path", () => {
  it("accepts an accurate on-site punch with no flags", () => {
    const verdict = evaluatePunch({ evidence: evidence(), geofence: CAMPUS });
    expect(verdict.decision).toBe("ACCEPT");
    expect(verdict.flags).toEqual([]);
    expect(verdict.insideGeofence).toBe(true);
    expect(verdict.matchedGeofenceId).toBe("gf_campus");
    expect(needsHumanReview(verdict)).toBe(false);
  });

  it("is inside just within the radius and outside just beyond it", () => {
    // Meridian metres per degree on the sphere the implementation uses, so the
    // 149m/151m probes are honest rather than a floating-point knife edge.
    const mPerDegLat = (Math.PI / 180) * 6_371_008.8;
    const inside = { latitude: 6.6018 + 149 / mPerDegLat, longitude: 3.3515 };
    const outside = { latitude: 6.6018 + 151 / mPerDegLat, longitude: 3.3515 };

    const insideVerdict = evaluatePunch({
      evidence: evidence({ coords: inside }),
      geofence: CAMPUS,
    });
    expect(insideVerdict.insideGeofence).toBe(true);
    expect(insideVerdict.flags).not.toContain("OFF_SITE");
    expect(insideVerdict.distanceMeters).toBeCloseTo(149, 0);

    const outsideVerdict = evaluatePunch({
      evidence: evidence({ coords: outside }),
      geofence: CAMPUS,
    });
    expect(outsideVerdict.insideGeofence).toBe(false);
    expect(outsideVerdict.flags).toContain("OFF_SITE");
  });
});

describe("evaluatePunch — accuracy", () => {
  it("flags but accepts a mediocre indoor fix", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ accuracyMeters: 200 }), // beyond the 120m ceiling, well inside 3x
      geofence: CAMPUS,
    });
    expect(verdict.flags).toContain("LOW_ACCURACY");
    expect(verdict.decision).toBe("ACCEPT_FLAGGED");
  });

  it("rejects a hopeless fix so the staff member can retry immediately", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ accuracyMeters: 900 }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toContain("LOW_ACCURACY");
    expect(verdict.decision).toBe("REJECT");
    expect(verdict.reasons.join(" ")).toMatch(/retry|far beyond/i);
  });

  it("honours a tighter per-site accuracy ceiling", () => {
    const strict: Geofence = { ...CAMPUS, maxAccuracyMeters: 30 };
    const verdict = evaluatePunch({ evidence: evidence({ accuracyMeters: 60 }), geofence: strict });
    expect(verdict.flags).toContain("LOW_ACCURACY");
  });
});

describe("evaluatePunch — location trust", () => {
  it("routes an off-site punch to a supervisor rather than dropping it", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ coords: FAR_AWAY }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toContain("OFF_SITE");
    expect(verdict.decision).toBe("REQUIRE_SUPERVISOR");
    expect(verdict.insideGeofence).toBe(false);
  });

  it("respects a school that chooses to reject off-site punches outright", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ coords: FAR_AWAY }),
      geofence: CAMPUS,
      policy: { offSiteDecision: "REJECT" },
    });
    expect(verdict.decision).toBe("REJECT");
  });

  it("holds a mocked-location punch for review", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ mockLocation: true }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toContain("MOCK_LOCATION");
    expect(verdict.decision).toBe("REQUIRE_SUPERVISOR");
  });

  it("requires a human when no location was supplied at all", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ coords: null }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toEqual(["NO_LOCATION"]);
    expect(verdict.decision).toBe("REQUIRE_SUPERVISOR");
    expect(verdict.distanceMeters).toBeNull();
  });

  it("treats an invalid coordinate as no location", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ coords: { latitude: 999, longitude: 3 } }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toEqual(["NO_LOCATION"]);
  });
});

describe("evaluatePunch — clocks and offline punches", () => {
  it("accepts an offline punch synced hours later, flagged for review", () => {
    const verdict = evaluatePunch({
      evidence: evidence({
        capturedAtClient: new Date("2026-10-13T05:00:00.000Z"),
        serverReceivedAt: new Date("2026-10-13T14:00:00.000Z"),
      }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toContain("STALE_PUNCH");
    expect(verdict.decision).toBe("REQUIRE_SUPERVISOR");
  });

  it("flags a device clock that runs ahead without calling the punch stale", () => {
    const verdict = evaluatePunch({
      evidence: evidence({
        capturedAtClient: new Date("2026-10-13T07:55:00.000Z"),
        serverReceivedAt: new Date("2026-10-13T07:45:00.000Z"),
      }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toContain("CLOCK_SKEW");
    expect(verdict.flags).not.toContain("STALE_PUNCH");
    expect(verdict.decision).toBe("ACCEPT_FLAGGED");
  });

  it("does not complain when the client sent no timestamp", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ capturedAtClient: null }),
      geofence: CAMPUS,
    });
    expect(verdict.flags).toEqual([]);
    expect(verdict.decision).toBe("ACCEPT");
  });
});

describe("evaluatePunch — impossible travel", () => {
  it("flags a punch that implies teleportation since the last one", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ serverReceivedAt: new Date("2026-10-13T07:45:00.000Z") }),
      geofence: CAMPUS,
      previous: {
        coords: FAR_AWAY,
        at: new Date("2026-10-13T07:43:00.000Z"), // ~9km in 2 minutes ≈ 76 m/s
      },
    });
    expect(verdict.flags).toContain("IMPOSSIBLE_TRAVEL");
    expect(verdict.decision).toBe("REQUIRE_SUPERVISOR");
  });

  it("stays quiet for a normal commute gap", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ serverReceivedAt: new Date("2026-10-13T07:45:00.000Z") }),
      geofence: CAMPUS,
      previous: { coords: FAR_AWAY, at: new Date("2026-10-13T05:30:00.000Z") },
    });
    expect(verdict.flags).not.toContain("IMPOSSIBLE_TRAVEL");
  });
});

describe("evaluatePunch — decision precedence", () => {
  it("REJECT wins over every softer signal", () => {
    const verdict = evaluatePunch({
      evidence: evidence({ coords: FAR_AWAY, accuracyMeters: 900, mockLocation: true }),
      geofence: CAMPUS,
    });
    expect(verdict.decision).toBe("REJECT");
    expect(verdict.flags).toEqual(
      expect.arrayContaining(["LOW_ACCURACY", "OFF_SITE", "MOCK_LOCATION"]),
    );
  });

  it("never returns an empty reason list — the staff member always sees why", () => {
    const verdict = evaluatePunch({ evidence: evidence(), geofence: CAMPUS });
    expect(verdict.reasons.length).toBeGreaterThan(0);
  });

  it("exposes a default policy matching the 150m campus guidance", () => {
    expect(DEFAULT_PUNCH_POLICY.radiusMeters).toBe(150);
    expect(DEFAULT_PUNCH_POLICY.maxAccuracyMeters).toBe(120);
  });
});
