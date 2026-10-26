"use client";

import { useCallback, useEffect, useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";

type SystemData = {
  flags: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    updatedAt: string | null;
    updatedByUserId: string | null;
  };
  config: {
    siteUrl: string | null;
    nodeEnv: string | null;
    schoolTimezone: string;
    staffLateCutoff: string;
    showDemoBadge: boolean;
    configured: Record<string, boolean>;
  };
  school: { name: string; slug: string; email: string | null; phone: string } | null;
  notifications: { pendingJobs: number; failedJobs: number; sentToday: number };
};

type PendingAction = "maintenance-on" | "maintenance-off" | "dispatch";

function ConfigState({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-disabled)] px-3 py-2.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${configured ? "text-brand-green" : "text-brand-orange"}`}
      >
        {configured ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
        {configured ? "Configured" : "Not configured"}
      </span>
    </div>
  );
}

export default function SuperAdminOperationsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/system", { cache: "no-store" });
      const body = (await response.json()) as SystemData & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load platform operations.");
      setData(body);
      setMessage(body.flags.maintenanceMessage);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load platform operations.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetch is asynchronous; the helper owns loading state around the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function applyAction() {
    if (!pendingAction) return;
    setBusy(true);
    setError("");
    try {
      const maintenance = pendingAction === "maintenance-on" || pendingAction === "maintenance-off";
      const response = await fetch("/api/super-admin/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          maintenance
            ? {
                action: "SET_MAINTENANCE",
                maintenanceMode: pendingAction === "maintenance-on",
                maintenanceMessage: message.trim(),
              }
            : { action: "DISPATCH_NOTIFICATIONS" },
        ),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
        sent?: number;
        bridgedAttendanceAlerts?: number;
        flags?: SystemData["flags"];
      };
      if (!response.ok) throw new Error(body.error || "Operation failed.");
      if (body.flags) {
        setData((current) => (current ? { ...current, flags: body.flags! } : current));
      }
      if (pendingAction === "dispatch") {
        toast(
          body.message || `Notification dispatch completed. ${body.sent ?? 0} job(s) sent.`,
          "success",
        );
      } else {
        toast(
          pendingAction === "maintenance-on"
            ? "Maintenance mode enabled."
            : "Maintenance mode disabled.",
          "success",
        );
      }
      await load(true);
    } catch (actionError) {
      const text = actionError instanceof Error ? actionError.message : "Operation failed.";
      setError(text);
      toast(text, "error");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  const confirmation =
    pendingAction === "maintenance-on"
      ? {
          title: "Enable platform maintenance mode?",
          message:
            "This affects the public application, not just this admin account. Confirm the maintenance window and user-facing notice before proceeding.",
          confirmText: "Enable maintenance",
        }
      : pendingAction === "maintenance-off"
        ? {
            title: "Disable platform maintenance mode?",
            message: "The public application will become available to users again.",
            confirmText: "Disable maintenance",
          }
        : {
            title: "Dispatch due notifications now?",
            message:
              "This may send queued email or other configured notifications to real users across the platform. Continue only after reviewing the pending queue and confirming the recipients are correct.",
            confirmText: "Dispatch notifications",
          };

  const configRows: Array<[string, string]> = [
    ["Database", "database"],
    ["Authentication secret", "authSecret"],
    ["Redis rate-limit store", "upstash"],
    ["S3-compatible storage", "s3"],
    ["Paystack", "paystack"],
    ["Email provider", "resend"],
    ["Scheduled jobs secret", "jobsSecret"],
  ];

  return (
    <>
      <PortalTopbar title="Platform operations" />
      <main className="w-full space-y-6 px-4 py-7 sm:px-6 xl:px-8">
        <section className="rounded-[2rem] bg-brand-navy p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/35 bg-brand-orange/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                <Settings2 size={13} /> Platform controls
              </span>
              <h1 className="mt-4 font-display text-4xl tracking-widest md:text-5xl">
                SYSTEM <span className="text-brand-green">OPERATIONS</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Runtime configuration, maintenance state and notification queue. Configuration only
                shows whether a value exists; secrets are never returned to the browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-[var(--text-primary)]"
          >
            {error}
          </div>
        ) : null}
        {loading && !data ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-sm text-[var(--text-muted)]">
            <LoaderCircle size={18} className="animate-spin text-brand-green" /> Loading operations
            data…
          </div>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <div className="flex items-center gap-2">
                  {data.flags.maintenanceMode ? (
                    <ShieldAlert size={18} className="text-red-500" />
                  ) : (
                    <ShieldCheck size={18} className="text-brand-green" />
                  )}
                  <h2 className="font-display text-2xl text-[var(--text-primary)]">
                    Maintenance mode
                  </h2>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {data.flags.maintenanceMode
                    ? "Maintenance is currently enabled for the platform."
                    : "Maintenance is off; normal access remains available."}
                </p>
                <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Public notice
                  <textarea
                    value={message}
                    maxLength={500}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[var(--input-text)]"
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {data.flags.updatedAt
                      ? `Updated ${new Date(data.flags.updatedAt).toLocaleString()}`
                      : "Default state; no change recorded"}
                  </span>
                  <button
                    type="button"
                    disabled={busy || !message.trim()}
                    onClick={() =>
                      setPendingAction(
                        data.flags.maintenanceMode ? "maintenance-off" : "maintenance-on",
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 ${data.flags.maintenanceMode ? "bg-brand-green text-brand-navy" : "bg-red-600 text-white"}`}
                  >
                    <Wrench size={13} />{" "}
                    {data.flags.maintenanceMode ? "Disable maintenance" : "Enable maintenance"}
                  </button>
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <div className="flex items-center gap-2">
                  <BellRing size={18} className="text-brand-orange" />
                  <h2 className="font-display text-2xl text-[var(--text-primary)]">
                    Notification queue
                  </h2>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Dispatch is a real operation and may contact users; it is never automatic from
                  this page.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Pending",
                      value: data.notifications.pendingJobs,
                      tone: "text-brand-orange",
                    },
                    { label: "Failed", value: data.notifications.failedJobs, tone: "text-red-500" },
                    {
                      label: "Sent today",
                      value: data.notifications.sentToday,
                      tone: "text-brand-green",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-[var(--surface-disabled)] p-3 text-center"
                    >
                      <p className={`font-display text-2xl ${item.tone}`}>
                        {item.value.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy || data.notifications.pendingJobs === 0}
                  onClick={() => setPendingAction("dispatch")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-navy disabled:opacity-50"
                >
                  <BellRing size={13} /> Dispatch due notifications
                </button>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <h2 className="font-display text-2xl text-[var(--text-primary)]">
                  Runtime configuration
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Presence only — this view does not reveal secret values.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {configRows.map(([label, key]) => (
                    <ConfigState
                      key={key}
                      label={label}
                      configured={Boolean(data.config.configured[key])}
                    />
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <h2 className="font-display text-2xl text-[var(--text-primary)]">
                  Deployment context
                </h2>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">Environment</dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {data.config.nodeEnv ?? "Unknown"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">Site URL</dt>
                    <dd className="max-w-[65%] truncate text-right font-mono text-[var(--text-primary)]">
                      {data.config.siteUrl ?? "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">School timezone</dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {data.config.schoolTimezone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">Staff late cutoff</dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {data.config.staffLateCutoff}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">Demo badge</dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {data.config.showDemoBadge ? "Enabled" : "Off"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                      <Clock3 size={12} /> School
                    </dt>
                    <dd className="font-semibold text-[var(--text-primary)]">
                      {data.school?.name ?? "No school found"}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>
          </>
        ) : null}
      </main>
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={busy ? "Working…" : confirmation.confirmText}
        cancelText="Cancel"
        variant={
          pendingAction === "dispatch" || pendingAction === "maintenance-on" ? "danger" : "warning"
        }
        busy={busy}
        onCancel={() => {
          if (!busy) setPendingAction(null);
        }}
        onConfirm={() => void applyAction()}
      />
    </>
  );
}
