"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import { useToast } from "@/components/Toast";
import { AlertTriangle, CheckCircle2, Crosshair, LoaderCircle, MapPin, Save } from "lucide-react";

type Profile = {
  name: string;
  address: string;
  addressConfirmed: boolean;
  campusLatitude: number | null;
  campusLongitude: number | null;
  geofenceRadiusMeters: number;
  geofenceEnabled: boolean;
};

const MIN_RADIUS_METERS = 50;
const MAX_RADIUS_METERS = 5_000;

function locationErrorMessage(error: GeolocationPositionError) {
  if (error.code === 1) {
    return "Location access was denied. Allow location for this site or enter the campus coordinates manually.";
  }
  if (error.code === 3) return "GPS timed out. Try again outdoors or enter coordinates manually.";
  return "This device could not determine its location. Enter the campus coordinates manually.";
}

export default function SchoolProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("150");
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyProfile = useCallback((next: Profile) => {
    setProfile(next);
    setAddress(next.address ?? "");
    setLatitude(next.campusLatitude?.toString() ?? "");
    setLongitude(next.campusLongitude?.toString() ?? "");
    setRadius(String(next.geofenceRadiusMeters ?? 150));
    setGeofenceEnabled(Boolean(next.geofenceEnabled));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/school-profile", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as Partial<Profile> & {
          error?: string;
        };
        if (!response.ok) throw new Error(body.error || "We could not load the school profile.");
        if (!active) return;
        applyProfile(body as Profile);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "We could not load the school profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyProfile]);

  function captureCurrentLocation() {
    setError(null);
    setLocationNote("");
    if (!navigator.geolocation) {
      setError("This browser does not support GPS. Enter the campus coordinates manually.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationNote(
          `Location captured. Reported GPS accuracy is about ±${Math.ceil(position.coords.accuracy)} m; review the pin before saving.`,
        );
        setLocating(false);
      },
      (geoError) => {
        setError(locationErrorMessage(geoError));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const nextLatitude = latitude.trim() === "" ? null : Number(latitude);
    const nextLongitude = longitude.trim() === "" ? null : Number(longitude);
    const nextRadius = Number(radius);
    if (
      (nextLatitude === null) !== (nextLongitude === null) ||
      (nextLatitude !== null && !Number.isFinite(nextLatitude)) ||
      (nextLongitude !== null && !Number.isFinite(nextLongitude))
    ) {
      setError("Enter both valid campus coordinates, or clear both fields.");
      setSaving(false);
      return;
    }
    if (
      !Number.isInteger(nextRadius) ||
      nextRadius < MIN_RADIUS_METERS ||
      nextRadius > MAX_RADIUS_METERS
    ) {
      setError(
        `The GPS boundary must be between ${MIN_RADIUS_METERS} and ${MAX_RADIUS_METERS.toLocaleString()} metres.`,
      );
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/school-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          campusLatitude: nextLatitude,
          campusLongitude: nextLongitude,
          geofenceRadiusMeters: nextRadius,
          geofenceEnabled,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Profile> & {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error || "We could not save the school profile. Please try again.");
        return;
      }
      applyProfile(body as Profile);
      setLocationNote("");
      toast("School location settings saved.", "success");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const parsedLatitude = latitude.trim() === "" ? null : Number(latitude);
  const parsedLongitude = longitude.trim() === "" ? null : Number(longitude);
  const hasMapPoint =
    parsedLatitude !== null &&
    parsedLongitude !== null &&
    Number.isFinite(parsedLatitude) &&
    Number.isFinite(parsedLongitude) &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180;
  const mapQuery = hasMapPoint ? `${parsedLatitude},${parsedLongitude}` : address.trim();

  return (
    <>
      <PortalTopbar title="School location" />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-4 pb-10 pt-24 text-white sm:px-6 sm:pb-14 sm:pt-28">
          <div className="w-full">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <MapPin size={12} /> School profile
            </span>
            <h1 className="font-display text-3xl tracking-widest text-white sm:text-5xl md:text-6xl">
              SCHOOL <span className="text-brand-green">LOCATION</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
              Manage the campus pin shown on the public map and the optional GPS boundary for staff
              self-service attendance. These settings belong to this school only.
            </p>
          </div>
        </section>

        <section className="px-4 py-6 sm:px-6 sm:py-10">
          <div className="w-full flex flex-col gap-6 lg:flex-row lg:gap-8">
            <AdminSidebar />

            <div className="min-w-0 flex-1 space-y-6">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <LoaderCircle className="animate-spin" size={16} /> Loading school settings…
                </div>
              ) : error && !profile ? (
                <div
                  role="alert"
                  className="flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-[var(--text-primary)]"
                >
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
                  <div>
                    <p className="font-semibold">School location settings could not be loaded.</p>
                    <p className="mt-1 text-[var(--text-secondary)]">{error}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      If this workspace has not been migrated yet, apply the campus-location
                      migration before enabling the map or GPS check-in.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <form
                    onSubmit={save}
                    className="max-w-3xl space-y-7 rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] sm:rounded-[2rem] sm:p-8"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {profile?.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Set the actual campus location once. It powers the public map; staff GPS
                        check-in can be enabled separately.
                      </p>
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                        Public postal address
                      </span>
                      <textarea
                        name="address"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        rows={3}
                        maxLength={300}
                        placeholder="Street, town, state"
                        className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--input-bg)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      />
                      <span className="mt-2 block text-xs leading-relaxed text-[var(--text-secondary)]">
                        This address is shown publicly and can also be printed on school documents.
                        Leave it empty if the school has not confirmed an address.
                      </span>
                    </label>

                    <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="font-display text-xl tracking-widest text-[var(--text-primary)]">
                            CAMPUS GPS PIN
                          </h2>
                          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                            Capture your device location while physically at the campus, or enter
                            the coordinates manually.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={captureCurrentLocation}
                          disabled={locating || loading}
                          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-brand-green hover:text-[var(--text-accent)] disabled:opacity-60"
                        >
                          {locating ? (
                            <LoaderCircle className="animate-spin" size={16} />
                          ) : (
                            <Crosshair size={16} />
                          )}
                          {locating ? "Finding location…" : "Use this device's GPS"}
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                            Latitude
                          </span>
                          <input
                            inputMode="decimal"
                            type="number"
                            step="any"
                            min={-90}
                            max={90}
                            value={latitude}
                            onChange={(event) => setLatitude(event.target.value)}
                            placeholder="-90 to 90"
                            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                            Longitude
                          </span>
                          <input
                            inputMode="decimal"
                            type="number"
                            step="any"
                            min={-180}
                            max={180}
                            value={longitude}
                            onChange={(event) => setLongitude(event.target.value)}
                            placeholder="-180 to 180"
                            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                          />
                        </label>
                      </div>

                      {locationNote && (
                        <p className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2
                            size={16}
                            className="mt-0.5 shrink-0 text-[var(--text-accent)]"
                          />
                          {locationNote}
                        </p>
                      )}

                      {mapQuery && (
                        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                          <div className="flex items-center justify-between gap-3 bg-[var(--surface-card)] px-4 py-3">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              Map preview · radius is not drawn
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[var(--text-accent)] underline underline-offset-2"
                            >
                              Open map
                            </a>
                          </div>
                          <iframe
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
                            title="Campus location preview"
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="h-56 w-full border-0"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <input
                          id="geofence-enabled"
                          type="checkbox"
                          checked={geofenceEnabled}
                          onChange={(event) => setGeofenceEnabled(event.target.checked)}
                          className="mt-1 h-5 w-5 accent-[var(--accent-primary)]"
                        />
                        <label htmlFor="geofence-enabled" className="cursor-pointer">
                          <span className="block text-sm font-bold text-[var(--text-primary)]">
                            Require GPS for staff self-service check-in and check-out
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-[var(--text-secondary)]">
                            When enabled, the server checks the reported position against this
                            campus pin and boundary. Staff must allow location access on the
                            attendance page.
                          </span>
                        </label>
                      </div>

                      <label className="block max-w-xs">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                          Campus boundary (metres)
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={MIN_RADIUS_METERS}
                          max={MAX_RADIUS_METERS}
                          step={10}
                          value={radius}
                          onChange={(event) => setRadius(event.target.value)}
                          className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)]"
                        />
                        <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                          Choose {MIN_RADIUS_METERS}–{MAX_RADIUS_METERS.toLocaleString()} metres.
                          The default is 150 metres.
                        </span>
                      </label>

                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-primary)]">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                          <span>
                            Exact staff GPS coordinates are checked on the server and discarded;
                            successful scans retain only rounded distance and accuracy. Browser GPS
                            can be spoofed, so this is a location safeguard—not proof of identity or
                            anti-spoof attestation. Keep the QR scanner or on-site supervision for
                            higher assurance.
                          </span>
                        </p>
                      </div>
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
                      >
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={saving || loading}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-navy sm:w-auto"
                    >
                      {saving ? (
                        <LoaderCircle className="animate-spin" size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      {saving ? "Saving…" : "Save location settings"}
                    </button>
                  </form>

                  <p className="max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
                    Public map:{" "}
                    {profile?.campusLatitude != null && profile.campusLongitude != null
                      ? "campus coordinates configured"
                      : profile?.addressConfirmed
                        ? "using the confirmed address until coordinates are set"
                        : "not published until the school confirms an address or GPS pin"}
                    {profile?.geofenceEnabled
                      ? " · staff GPS boundary is enabled"
                      : " · staff GPS boundary is disabled"}
                    .
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
