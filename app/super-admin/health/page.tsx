"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PortalTopbar from "@/components/PortalTopbar";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";

type Health = {
  status: "healthy" | "degraded" | "unhealthy";
  readinessMode: "final" | "temporary";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latencyMs: number };
    redis: { status: "configured" | "not_configured" | "down" };
    admissionStorage: { configured: boolean };
    malwareScanner: { configured: boolean };
    paystack: { configured: boolean };
  };
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${ok ? "bg-brand-green/15 text-brand-green" : "bg-red-500/15 text-red-500"}`}
    >
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {label}
    </span>
  );
}

function uptimeLabel(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`]
    .filter(Boolean)
    .join(" ");
}

export default function SuperAdminHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const payload = (await response.json()) as Health;
      // /api/health returns 503 only when the database is down; keep the
      // diagnostic payload visible even then.
      if (payload?.checks) setHealth(payload);
      else if (!response.ok) throw new Error("Health endpoint returned no diagnostic data.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load health status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetch is asynchronous; the helper owns loading state around the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => void load(true), 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const checks = health?.checks;
  const services = [
    {
      label: "Database",
      state: checks?.database.status ?? "unknown",
      ok: checks?.database.status === "up",
      detail: checks ? `${checks.database.latencyMs} ms response` : "Waiting for check",
      icon: Database,
    },
    {
      label: "Redis rate-limit store",
      state: checks?.redis.status ?? "unknown",
      ok: checks?.redis.status === "configured",
      detail:
        checks?.redis.status === "not_configured" ? "Missing configuration" : "Shared rate limits",
      icon: Zap,
    },
    {
      label: "Admission file storage",
      state: checks
        ? checks.admissionStorage.configured
          ? "configured"
          : "not configured"
        : "unknown",
      ok: checks?.admissionStorage.configured ?? false,
      detail: "S3-compatible object storage",
      icon: HardDrive,
    },
    {
      label: "Malware scanner",
      state: checks
        ? checks.malwareScanner.configured
          ? "configured"
          : "not configured"
        : "unknown",
      ok: checks?.malwareScanner.configured ?? false,
      detail: "Uploaded-file scan service",
      icon: ShieldAlert,
    },
    {
      label: "Paystack",
      state: checks ? (checks.paystack.configured ? "configured" : "not configured") : "unknown",
      ok: checks?.paystack.configured ?? false,
      detail: "Payment provider configuration",
      icon: Wallet,
    },
    {
      label: "Application readiness",
      state: health?.status ?? "unknown",
      ok: health?.status === "healthy",
      detail: health?.readinessMode
        ? `Readiness mode: ${health.readinessMode}`
        : "Waiting for check",
      icon: Activity,
    },
  ];

  return (
    <>
      <PortalTopbar title="System health" />
      <main className="w-full px-4 py-7 sm:px-6 xl:px-8">
        <Link
          href="/super-admin/portals"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-green"
        >
          <ArrowLeft size={12} /> Portal Hub
        </Link>
        <section className="rounded-[2rem] bg-brand-navy p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="text-brand-green" size={28} />
              <h1 className="font-display text-3xl tracking-widest">
                SYSTEM <span className="text-brand-green">HEALTH</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-white/65">
            Live checks for the database and dependencies that gate production features. A running
            server can be degraded; the service-ready flag is separate from database liveness.
          </p>
        </section>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-[var(--text-primary)]"
          >
            {error}
          </div>
        ) : null}

        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Service dependencies"
        >
          {services.map((service) => (
            <article
              key={service.label}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]"
            >
              <service.icon className="mb-3 text-[var(--text-accent)]" size={20} />
              {loading && !health ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <LoaderCircle size={15} className="animate-spin" /> Checking…
                </div>
              ) : (
                <StatusPill ok={service.ok} label={service.state} />
              )}
              <h2 className="mt-3 text-sm font-bold text-[var(--text-primary)]">{service.label}</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{service.detail}</p>
            </article>
          ))}
        </section>

        {health ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2">
              <Clock size={13} /> Uptime: {uptimeLabel(health.uptime)}
            </span>
            <span>Checked: {new Date(health.timestamp).toLocaleString()}</span>
          </div>
        ) : null}
        <p className="mt-4 text-[11px] leading-5 text-[var(--text-muted)]">
          This page reports configuration and a live Redis ping. It never displays credentials.
          Missing Redis, storage or malware scanning keeps affected features unavailable; a green
          database alone does not mean the app is launch-ready.
        </p>
      </main>
    </>
  );
}
