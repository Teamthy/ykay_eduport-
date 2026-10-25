"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import PortalTopbar from "@/components/PortalTopbar";
import AdminSidebar from "@/components/AdminSidebar";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import QrImage from "@/components/QrImage";
import StaffQrScanner from "@/components/StaffQrScanner";
import { readJsonResponse } from "@/lib/api-response";

type MeResponse = {
  supported: boolean;
  message?: string;
  date?: string;
  lateCutoff?: string;
  geofence?: {
    enabled: boolean;
    configured: boolean;
    radiusMeters: number;
  };
  staff?: {
    id: string;
    displayName: string;
    badgeCode: string | null;
    qrPayload: string | null;
  };
  today?: {
    status: "ABSENT" | "IN" | "OUT";
    checkInAt: string | null;
    checkOutAt: string | null;
    isLate: boolean;
    lateMinutes: number;
    events: Array<{
      id: string;
      eventType: string;
      scannedAt: string;
      isLate: boolean;
      lateMinutes: number;
      source: string;
      geofenceVerified: boolean | null;
      distanceFromCampusMeters: number | null;
      locationAccuracyMeters: number | null;
    }>;
  };
};

type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

function getBrowserLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error("This browser does not support GPS. Contact the school office to check in."),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        }),
      (error) => {
        if (error.code === 1) {
          reject(new Error("Location permission was denied. Allow location access and try again."));
        } else if (error.code === 3) {
          reject(new Error("GPS timed out. Move to an open area and try again."));
        } else {
          reject(new Error("Your device could not determine its location. Try again outdoors."));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

export default function StaffSelfAttendancePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isTeacherPortal = user?.role === "TEACHER" || user?.role === "HOD";
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [dailyQrToken, setDailyQrToken] = useState("");
  const [manualQrToken, setManualQrToken] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const response = await fetch("/api/staff/attendance/me", { cache: "no-store" });
      const body = await readJsonResponse<MeResponse & { error?: string }>(response);
      if (!response.ok) throw new Error(body.error || "Unable to load attendance.");
      setData(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load attendance.";
      setLoadingError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "CHECK_IN" | "CHECK_OUT") {
    if (!dailyQrToken.trim()) {
      toast("Scan today's school attendance QR before checking in or out.", "error");
      return;
    }
    setBusy(true);
    try {
      const payload: {
        action: "CHECK_IN" | "CHECK_OUT";
        dailyQrToken: string;
        location?: BrowserLocation;
      } = { action, dailyQrToken: dailyQrToken.trim() };
      if (data?.geofence?.enabled) {
        if (!data.geofence.configured) {
          throw new Error("The school GPS boundary is not configured. Contact an administrator.");
        }
        payload.location = await getBrowserLocation();
      }

      const response = await fetch("/api/staff/attendance/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJsonResponse<{
        error?: string;
        event?: { isLate?: boolean; lateMinutes?: number };
      }>(response);
      if (!response.ok) throw new Error(body.error || "Action failed.");
      toast(
        `${action === "CHECK_IN" ? "Checked in" : "Checked out"}${body.event?.isLate ? ` · late +${body.event.lateMinutes}m` : ""}`,
        body.event?.isLate ? "info" : "success",
      );
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  const geofenceBlocked = Boolean(data?.geofence?.enabled && !data.geofence.configured);

  return (
    <>
      <PortalTopbar title="My attendance" />
      <main className="portal-full-width flex flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row xl:gap-8 xl:px-8">
        {isTeacherPortal ? <TeacherSidebar /> : <AdminSidebar />}
        <section className="min-w-0 flex-1 space-y-6">
          <div className="rounded-[1.5rem] bg-brand-navy p-5 text-white sm:rounded-[2rem] sm:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-green">
              Staff self-service
            </p>
            <h1 className="mt-2 font-display text-3xl tracking-widest sm:text-4xl">
              MY <span className="text-brand-green">ATTENDANCE</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Scan today&apos;s school QR before checking in or out, or present your staff badge at
              the admin scanner. Late after {data?.lateCutoff || "08:00"}.
            </p>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-2 text-[var(--text-muted)]" role="status">
              <LoaderCircle className="animate-spin" /> Loading attendance…
            </div>
          ) : !data ? (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Attendance could not be loaded.
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{loadingError}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--text-primary)]"
              >
                Try again
              </button>
            </div>
          ) : !data.supported ? (
            <p className="mt-6 rounded-2xl border border-[var(--border-subtle)] p-5 text-sm text-[var(--text-secondary)]">
              {data.message || "Not available for this account."}
            </p>
          ) : (
            <div className="mt-5 space-y-5 sm:mt-8 sm:space-y-6">
              {data.geofence?.enabled && (
                <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-brand-green/15 p-2 text-brand-green">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        GPS campus boundary is on
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {data.geofence.configured
                          ? `Allow location access while checking in or out. Your reported position must be within ${data.geofence.radiusMeters} m of campus with sufficient GPS accuracy.`
                          : "The school has enabled GPS attendance but has not configured a campus pin. Check-in is unavailable until an administrator fixes the settings."}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                        The server calculates the distance. Exact coordinates are not retained;
                        successful records keep only rounded distance and reported accuracy. Browser
                        GPS can be spoofed, so it is a location safeguard rather than identity
                        proof.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-xl tracking-widest text-[var(--text-primary)]">
                      <QrCode size={18} className="text-brand-green" /> DAILY SCHOOL QR
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                      Scan the QR displayed by your school administrator. The server checks its
                      signature, school and school-local date before accepting attendance.
                    </p>
                    {dailyQrToken ? (
                      <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-green">
                        <ShieldCheck size={15} /> Today&apos;s QR scanned — you can check in or out.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">
                        Scan required before check-in or check-out.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setScannerOpen((open) => !open)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-brand-navy"
                    >
                      <Camera size={15} /> {scannerOpen ? "Close camera" : "Scan QR"}
                    </button>
                    {dailyQrToken ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDailyQrToken("");
                          setManualQrToken("");
                        }}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--input-border)] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
                {scannerOpen ? (
                  <div className="mt-4">
                    <StaffQrScanner
                      active={scannerOpen}
                      onScan={(token) => {
                        setDailyQrToken(token.trim());
                        setManualQrToken(token.trim());
                        setScannerOpen(false);
                        toast("Daily attendance QR scanned.", "success");
                      }}
                    />
                  </div>
                ) : null}
                <label className="mt-4 block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    QR payload (manual fallback)
                  </span>
                  <input
                    value={manualQrToken}
                    onChange={(event) => {
                      setManualQrToken(event.target.value);
                      setDailyQrToken(event.target.value.trim());
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Scan with your camera or paste the daily QR payload"
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 font-mono text-xs text-[var(--input-text)]"
                  />
                </label>
              </section>

              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                      Today · {data.date}
                    </div>
                    <h2 className="mt-1 break-words font-display text-2xl tracking-widest sm:text-3xl">
                      {data.staff?.displayName}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          data.today?.status === "IN"
                            ? "bg-brand-green/15 text-brand-green"
                            : data.today?.status === "OUT"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-[var(--surface-disabled)] text-[var(--text-muted)]"
                        }`}
                      >
                        {data.today?.status}
                      </span>
                      {data.today?.isLate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                          <Clock3 size={12} /> Late +{data.today.lateMinutes}m
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="text-[var(--text-secondary)]">
                        Check-in:{" "}
                        <b className="text-[var(--text-primary)]">
                          {data.today?.checkInAt
                            ? new Date(data.today.checkInAt).toLocaleTimeString()
                            : "—"}
                        </b>
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        Check-out:{" "}
                        <b className="text-[var(--text-primary)]">
                          {data.today?.checkOutAt
                            ? new Date(data.today.checkOutAt).toLocaleTimeString()
                            : "—"}
                        </b>
                      </div>
                    </div>
                  </div>
                  {data.staff?.qrPayload && (
                    <div className="self-start text-center sm:mx-auto sm:self-start md:ml-0">
                      <QrImage
                        value={data.staff.qrPayload}
                        size={200}
                        alt="Staff badge QR"
                        className="mx-auto h-36 w-36 rounded-xl border border-[var(--border-subtle)] bg-white p-2 sm:h-40 sm:w-40"
                      />
                      <div className="mt-2 break-all font-mono text-xs text-[var(--text-muted)]">
                        {data.staff.badgeCode}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={
                      busy || data.today?.status === "IN" || geofenceBlocked || !dailyQrToken
                    }
                    onClick={() => void act("CHECK_IN")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-bold uppercase tracking-widest text-brand-navy disabled:opacity-40"
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <LogIn size={16} />
                    )}
                    {busy && data.geofence?.enabled ? "Checking GPS…" : "Check in"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy || data.today?.status !== "IN" || geofenceBlocked || !dailyQrToken
                    }
                    onClick={() => void act("CHECK_OUT")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-navy px-5 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-40"
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <LogOut size={16} />
                    )}
                    {busy && data.geofence?.enabled ? "Checking GPS…" : "Check out"}
                  </button>
                </div>
                {geofenceBlocked && (
                  <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                    Contact an administrator before attempting attendance.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 sm:p-5">
                <h3 className="flex items-center gap-2 font-display text-xl tracking-widest">
                  <QrCode size={18} className="text-brand-green" /> TODAY&apos;S EVENTS
                </h3>
                <ul className="mt-4 space-y-3">
                  {(data.today?.events || []).map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                    >
                      <span className="inline-flex flex-wrap items-center gap-2 text-[var(--text-primary)]">
                        {event.eventType === "CHECK_IN" ? (
                          <CheckCircle2 className="text-brand-green" size={14} />
                        ) : (
                          <LogOut className="text-blue-600 dark:text-blue-400" size={14} />
                        )}
                        {event.eventType.replace("_", " ")}
                        {event.isLate ? ` · late +${event.lateMinutes}m` : ""}
                        {event.geofenceVerified && (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <ShieldCheck size={13} className="text-[var(--text-accent)]" />
                            GPS verified · {event.distanceFromCampusMeters ?? "—"} m from campus
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] sm:shrink-0">
                        {new Date(event.scannedAt).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                  {!data.today?.events?.length && (
                    <p className="text-sm text-[var(--text-secondary)]">No events yet today.</p>
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
