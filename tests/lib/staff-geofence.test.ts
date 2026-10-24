import { describe, expect, it } from "vitest";
import { distanceBetweenCoordinatesMeters, evaluateGeofence } from "@/lib/staff-geofence";

const campus = { campusLatitude: 0, campusLongitude: 0, radiusMeters: 150 };

describe("distanceBetweenCoordinatesMeters", () => {
  it("returns zero for the same point", () => {
    expect(distanceBetweenCoordinatesMeters(0, 0, 0, 0)).toBe(0);
  });

  it("uses great-circle distance in metres", () => {
    const distance = distanceBetweenCoordinatesMeters(0, 0, 0.01, 0);
    expect(distance).toBeGreaterThan(1_100);
    expect(distance).toBeLessThan(1_120);
  });

  it("returns a finite distance for antipodal points despite floating-point rounding", () => {
    const distance = distanceBetweenCoordinatesMeters(0, 0, 0, 180);
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(20_000_000);
  });

  it("returns NaN for coordinates outside the valid range", () => {
    expect(distanceBetweenCoordinatesMeters(91, 0, 0, 0)).toBeNaN();
  });
});

describe("evaluateGeofence", () => {
  it("allows a current, accurate point only when its uncertainty fits inside the boundary", () => {
    const result = evaluateGeofence({
      ...campus,
      latitude: 0,
      longitude: 0,
      accuracyMeters: 20,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.distanceMeters).toBe(0);
      expect(result.roundedDistanceMeters).toBe(0);
      expect(result.roundedAccuracyMeters).toBe(20);
    }
  });

  it("rejects a position whose accuracy range crosses the geofence boundary", () => {
    const result = evaluateGeofence({
      ...campus,
      latitude: 0.0012,
      longitude: 0,
      accuracyMeters: 30,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("OUTSIDE_GEOFENCE");
  });

  it("rejects inaccurate GPS fixes", () => {
    const result = evaluateGeofence({
      ...campus,
      latitude: 0,
      longitude: 0,
      accuracyMeters: 80,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("LOW_ACCURACY");
      expect(result.maxAccuracyMeters).toBe(75);
    }
  });

  it("fails closed for invalid school coordinates, radius, or browser coordinates", () => {
    for (const invalid of [
      { ...campus, campusLatitude: 91, latitude: 0, longitude: 0, accuracyMeters: 10 },
      { ...campus, radiusMeters: 20, latitude: 0, longitude: 0, accuracyMeters: 10 },
      { ...campus, latitude: 91, longitude: 0, accuracyMeters: 10 },
      { ...campus, latitude: 0, longitude: 0, accuracyMeters: 5_001 },
    ]) {
      const result = evaluateGeofence(invalid);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe("INVALID_LOCATION");
    }
  });
});
