-- Campus coordinates power the public map and the optional staff geofence.
-- Geofencing remains disabled until an authorised school admin configures it.
ALTER TABLE "School"
  ADD COLUMN "campusLatitude" DOUBLE PRECISION,
  ADD COLUMN "campusLongitude" DOUBLE PRECISION,
  ADD COLUMN "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Do not retain precise browser GPS coordinates. A successful GPS self-service
-- scan keeps only the rounded distance and reported accuracy for audit review.
ALTER TABLE "StaffAttendanceEvent"
  ADD COLUMN "geofenceVerified" BOOLEAN,
  ADD COLUMN "distanceFromCampusMeters" INTEGER,
  ADD COLUMN "locationAccuracyMeters" INTEGER;
