const EARTH_RADIUS_METERS = 6_371_000;
export const MIN_GEOFENCE_RADIUS_METERS = 50;
export const MAX_GEOFENCE_RADIUS_METERS = 5_000;

export type GeofenceCheck = {
  campusLatitude: number;
  campusLongitude: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  radiusMeters: number;
};

export type GeofenceResult =
  | {
      allowed: true;
      distanceMeters: number;
      roundedDistanceMeters: number;
      roundedAccuracyMeters: number;
      maxAccuracyMeters: number;
    }
  | {
      allowed: false;
      reason: "INVALID_LOCATION" | "LOW_ACCURACY" | "OUTSIDE_GEOFENCE";
      distanceMeters: number | null;
      roundedDistanceMeters: number | null;
      roundedAccuracyMeters: number | null;
      maxAccuracyMeters: number;
    };

function isCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Great-circle distance in metres, using the Haversine formula. */
export function distanceBetweenCoordinatesMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  if (!isCoordinate(latitudeA, longitudeA) || !isCoordinate(latitudeB, longitudeB)) {
    return Number.NaN;
  }

  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  // Floating-point rounding can push a infinitesimally outside [0, 1] for
  // antipodal points; clamp it so the distance always stays finite.
  const a = Math.min(1, Math.max(0, haversine));
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Evaluate a browser-reported location against a school-configured boundary.
 * The reported accuracy is added to the measured distance, so an uncertain
 * point on the boundary fails closed instead of being accepted optimistically.
 * Exact coordinates are never returned for persistence; callers store only
 * rounded distance and accuracy values.
 */
export function evaluateGeofence(input: GeofenceCheck): GeofenceResult {
  const maxAccuracyMeters = Math.min(100, input.radiusMeters / 2);
  const valid =
    isCoordinate(input.campusLatitude, input.campusLongitude) &&
    isCoordinate(input.latitude, input.longitude) &&
    Number.isFinite(input.radiusMeters) &&
    input.radiusMeters >= MIN_GEOFENCE_RADIUS_METERS &&
    input.radiusMeters <= MAX_GEOFENCE_RADIUS_METERS &&
    Number.isFinite(input.accuracyMeters) &&
    input.accuracyMeters >= 0 &&
    input.accuracyMeters <= 5_000;

  if (!valid) {
    return {
      allowed: false,
      reason: "INVALID_LOCATION",
      distanceMeters: null,
      roundedDistanceMeters: null,
      roundedAccuracyMeters: null,
      maxAccuracyMeters,
    };
  }

  const distanceMeters = distanceBetweenCoordinatesMeters(
    input.campusLatitude,
    input.campusLongitude,
    input.latitude,
    input.longitude,
  );
  const roundedDistanceMeters = Math.round(distanceMeters / 10) * 10;
  const roundedAccuracyMeters = Math.ceil(input.accuracyMeters / 5) * 5;

  if (input.accuracyMeters > maxAccuracyMeters) {
    return {
      allowed: false,
      reason: "LOW_ACCURACY",
      distanceMeters,
      roundedDistanceMeters,
      roundedAccuracyMeters,
      maxAccuracyMeters,
    };
  }

  if (distanceMeters + input.accuracyMeters > input.radiusMeters) {
    return {
      allowed: false,
      reason: "OUTSIDE_GEOFENCE",
      distanceMeters,
      roundedDistanceMeters,
      roundedAccuracyMeters,
      maxAccuracyMeters,
    };
  }

  return {
    allowed: true,
    distanceMeters,
    roundedDistanceMeters,
    roundedAccuracyMeters,
    maxAccuracyMeters,
  };
}
