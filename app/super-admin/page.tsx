"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import {
  Activity,
  BellRing,
  ClipboardList,
  Cpu,
  KeyRound,
  LoaderCircle,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShieldX,
  TerminalSquare,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  UserPlus,
} from "lucide-react";

type Overview = {
  platform: {
    usersByRole: Array<{ role: string; count: number }>;
    activeUsers: number;
    suspendedUsers: number;
    loginsToday: number;
    loginsWeek: number;
    auditEventsToday: number;
    applications: number;
    itEnrollments: number;
    examAttempts: number;
    reportCards: number;
  };
  health: {
    failedNotifications: number;
    pendingNotifications: number;
    recentFailures: Array<{ id: string; channel: string; subject: string; lastError: string | null; attempts: number; at: string }>;
  };
  finance?: {
    incomeTotal: number;
    incomeToday: number;
    incomeWeek: number;
    expenseTotal: number;
    netPosition: number;
    billed: number;
    outstanding: number;
    collectionRate: number;
    recentPayments: Array<{ id: string; amount: number; method: string; reference: string; receiptNumber: string; paidAt: string; student: string; studentId: string }>;
  };
  latestLogins: Array<{ name: string; email: string; role: string; ip: string | null; at: string }>;
};

type LogsResponse = {
  total: number;
  page: number;
  pages: number;
  topActions: Array<{ action: string; count: number }>;
  logs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorName: string;
    actorEmail: string | null;
    actorRole: string | null;
    ipAddress: string | null;
    at: string;
  }>;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuspended: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const TABS = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "logs", label: "Audit Logs", icon: ClipboardList },
  { key: "users", label: "User Control", icon: UserCog },
] as const;

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logFilter, setLogFilter] = useState({ action: "", actor: "", page: 1 });
  const [userSearch, setUserSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<{ user: ManagedUser; action: string; label: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "ADMIN" });
  const [creating, setCreating] = useState(false);

  const loadOverview = useCallback(async () => {
    const response = await fetch("/api/super-admin/overview", { cache: "no-store" });
    const body = (await response.json()) as Overview & { error?: string };
    if (!response.ok) throw new Error(body.error || "Unable to load overview.");
    setOverview(body);
  }, []);

  const loadLogs = useCallback(async (filter: typeof logFilter) => {
    const params = new URLSearchParams();
    if (filter.action) params.set("action", filter.action);
    if (filter.actor) params.set("actor", filter.actor);
    params.set("page", String(filter.page));
    const response = await fetch(`/api/super-admin/logs?${params}`, { cache: "no-store" });
    const body = (await response.json()) as LogsResponse & { error?: string };
    if (!response.ok) throw new Error(body.error || "Unable to load logs.");
    setLogs(body);
  }, []);

  const loadUsers = useCallback(async (query: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const response = await fetch(`/api/super-admin/users?${params}`, { cache: "no-store" });
    const body = (await response.json()) as { users: ManagedUser[]; error?: string };
    if (!response.ok) throw new Error(body.error || "Unable to load users.");
    setUsers(body.users);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        if (tab === "overview") await loadOverview();
        if (tab === "logs") await loadLogs(logFilter);
        if (tab === "users") await loadUsers(userSearch);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load data.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, logFilter.page]);

  async function runUserAction() {
    if (!pendingAction) return;
    setBusy(true);
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingAction.user.id, action: pendingAction.action }),
      });
      const body = (await response.json()) as { message?: string; error?: string; temporaryPassword?: string | null };
      if (!response.ok) throw new Error(body.error || "Action failed.");
      toast(body.message || "Done.", "success");
      if (body.temporaryPassword) setTempPassword({ name: pendingAction.user.name, password: body.temporaryPassword });
      await loadUsers(userSearch);
    } catch (actionError) {
      toast(actionError instanceof Error ? actionError.message : "Action failed.", "error");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }


  async function createAdmin() {
    setCreating(true);
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_ADMIN",
          name: createForm.name,
          email: createForm.email,
          role: createForm.role,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create account.");
      toast(body.message || "Admin created.", "success");
      if (body.temporaryPassword) {
        setTempPassword({ name: createForm.name || "New user", password: body.temporaryPassword });
      }
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", role: "ADMIN" });
      await loadUsers(userSearch);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to create account.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pt-28 pb-14">
          <div className="mx-auto max-w-7xl">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-orange/40 bg-brand-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
              <TerminalSquare size={11} /> Developer Console
            </span>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-6xl">
              SUPER <span className="text-brand-green">ADMIN</span>
            </h1>
            <p className="mt-3 max-w-2xl font-body text-sm text-white/60">
              Platform monitoring for the development team — usage analytics, audit-log tracking, delivery
              health, and account rescue tools.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                    tab === item.key
                      ? "bg-brand-green text-white shadow"
                      : "border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)]"
                  }`}
                >
                  <item.icon size={13} /> {item.label}
                </button>
              ))}
            </div>

            {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div> : null}

            {loading ? (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 shadow-[var(--card-shadow)]">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading...
                </div>
              </div>
            ) : null}

            {/* ---------------- OVERVIEW ---------------- */}
            {!loading && tab === "overview" && overview ? (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Active Users", value: overview.platform.activeUsers, icon: Users, tone: "text-brand-green" },
                    { label: "Logins Today", value: overview.platform.loginsToday, icon: Activity, tone: "text-brand-green" },
                    { label: "Logins (7 days)", value: overview.platform.loginsWeek, icon: TrendingUp, tone: "text-brand-green" },
                    { label: "Audit Events Today", value: overview.platform.auditEventsToday, icon: ClipboardList, tone: "text-brand-orange" },
                    { label: "Suspended", value: overview.platform.suspendedUsers, icon: ShieldX, tone: overview.platform.suspendedUsers ? "text-red-500" : "text-brand-green" },
                    { label: "Applications", value: overview.platform.applications, icon: ClipboardList, tone: "text-brand-green" },
                    { label: "IT Enrollments", value: overview.platform.itEnrollments, icon: Cpu, tone: "text-brand-orange" },
                    { label: "Exam Attempts", value: overview.platform.examAttempts, icon: Activity, tone: "text-brand-green" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                      <card.icon size={18} className={`mb-3 ${card.tone}`} />
                      <div className={`font-display text-3xl ${card.tone}`}>{card.value}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Users by role */}
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h2 className="mb-5 font-display text-xl text-[var(--text-primary)]">Users by Role</h2>
                    <div className="space-y-2">
                      {overview.platform.usersByRole.map((row) => (
                        <div key={row.role} className="flex items-center justify-between rounded-xl bg-[var(--surface-disabled)] px-4 py-3">
                          <span className="text-sm font-bold text-[var(--text-primary)]">{row.role}</span>
                          <span className="font-display text-lg text-brand-green">{row.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery health */}
                  <div className={`rounded-[2rem] border p-6 shadow-[var(--card-shadow)] ${overview.health.failedNotifications ? "border-red-500/30 bg-red-500/5" : "border-brand-green/25 bg-brand-green/5"}`}>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 font-display text-xl text-[var(--text-primary)]">
                        <BellRing size={18} className={overview.health.failedNotifications ? "text-red-500" : "text-brand-green"} /> Delivery Health
                      </h2>
                      <a href="/admin/notifications" className="text-xs font-bold text-brand-green underline">Open console</a>
                    </div>
                    <div className="mb-4 flex gap-6">
                      <div>
                        <div className={`font-display text-3xl ${overview.health.failedNotifications ? "text-red-500" : "text-brand-green"}`}>{overview.health.failedNotifications}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Failed</div>
                      </div>
                      <div>
                        <div className="font-display text-3xl text-brand-orange">{overview.health.pendingNotifications}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Pending</div>
                      </div>
                    </div>
                    {overview.health.recentFailures.map((failure) => (
                      <div key={failure.id} className="mb-2 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] px-4 py-3 text-xs">
                        <div className="font-bold text-[var(--text-primary)]">{failure.subject} · {failure.channel}</div>
                        <div className="mt-1 text-red-500">{failure.lastError || "Unknown error"} ({failure.attempts} attempts)</div>
                      </div>
                    ))}
                  </div>
                </div>

                
                {overview.finance ? (
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 font-display text-xl text-[var(--text-primary)]">
                        <Wallet size={18} className="text-brand-green" /> Income &amp; transactions
                      </h2>
                      <a href="/admin/finances" className="text-xs font-bold text-brand-green underline">Open finance console</a>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-[var(--surface-disabled)] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Total income</div>
                        <div className="mt-1 font-display text-2xl">₦{overview.finance.incomeTotal.toLocaleString()}</div>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-disabled)] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Income today</div>
                        <div className="mt-1 font-display text-2xl">₦{overview.finance.incomeToday.toLocaleString()}</div>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-disabled)] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Expenses</div>
                        <div className="mt-1 font-display text-2xl">₦{overview.finance.expenseTotal.toLocaleString()}</div>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-disabled)] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Outstanding fees</div>
                        <div className="mt-1 font-display text-2xl">₦{overview.finance.outstanding.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-[var(--text-muted)]">
                      Net ₦{overview.finance.netPosition.toLocaleString()} · Collection {overview.finance.collectionRate}% · Billed ₦{overview.finance.billed.toLocaleString()}
                    </div>
                    <div className="mt-5 space-y-2">
                      {overview.finance.recentPayments.slice(0, 8).map((payment) => (
                        <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-xs">
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">₦{payment.amount.toLocaleString()}</span>
                            <span className="text-[var(--text-muted)]"> · {payment.student}</span>
                          </div>
                          <div className="text-[var(--text-muted)]">{payment.method} · {payment.receiptNumber}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Latest logins */}
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                  <h2 className="mb-5 font-display text-xl text-[var(--text-primary)]">Latest Sign-ins</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-[var(--border-subtle)]">
                        <tr>
                          {["User", "Role", "IP Address", "When"].map((heading) => (
                            <th key={heading} className="px-4 py-3 text-left font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {overview.latestLogins.map((login, index) => (
                          <tr key={`${login.email}-${index}`} className="border-b border-[var(--border-subtle)]">
                            <td className="px-4 py-3">
                              <div className="font-bold text-[var(--text-primary)]">{login.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">{login.email}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{login.role}</td>
                            <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{login.ip || "—"}</td>
                            <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{timeAgo(login.at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {/* ---------------- LOGS ---------------- */}
            {!loading && tab === "logs" && logs ? (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Action contains
                    <input
                      value={logFilter.action}
                      onChange={(event) => setLogFilter({ ...logFilter, action: event.target.value })}
                      placeholder="e.g. SIGNED_IN"
                      className="mt-2 block w-52 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Actor email
                    <input
                      value={logFilter.actor}
                      onChange={(event) => setLogFilter({ ...logFilter, actor: event.target.value })}
                      placeholder="e.g. admin@"
                      className="mt-2 block w-52 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                    />
                  </label>
                  <button
                    onClick={() => {
                      setLogFilter({ ...logFilter, page: 1 });
                      void loadLogs({ ...logFilter, page: 1 }).catch((filterError) =>
                        setError(filterError instanceof Error ? filterError.message : "Filter failed.")
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow"
                  >
                    <Search size={13} /> Filter
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">{logs.total.toLocaleString()} events · page {logs.page}/{logs.pages}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {logs.topActions.map((row) => (
                    <button
                      key={row.action}
                      onClick={() => {
                        const next = { action: row.action, actor: "", page: 1 };
                        setLogFilter(next);
                        void loadLogs(next).catch(() => undefined);
                      }}
                      className="rounded-full bg-[var(--surface-disabled)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]"
                    >
                      {row.action} · {row.count}
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-brand-navy">
                        <tr>
                          {["Action", "Entity", "Actor", "IP", "When"].map((heading) => (
                            <th key={heading} className="px-4 py-3 text-left font-display text-[10px] uppercase tracking-wider text-white/70">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logs.logs.map((entry) => (
                          <tr key={entry.id} className="border-b border-[var(--border-subtle)]">
                            <td className="px-4 py-3 text-xs font-bold text-brand-green">{entry.action}</td>
                            <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                              {entry.entityType}
                              {entry.entityId ? <span className="text-[var(--text-muted)]"> · {entry.entityId.slice(0, 10)}…</span> : null}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="font-bold text-[var(--text-primary)]">{entry.actorName}</span>
                              {entry.actorRole ? <span className="text-[var(--text-muted)]"> ({entry.actorRole})</span> : null}
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{entry.ipAddress || "—"}</td>
                            <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{timeAgo(entry.at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-4">
                    <button
                      disabled={logs.page <= 1}
                      onClick={() => setLogFilter({ ...logFilter, page: logFilter.page - 1 })}
                      className="rounded-full bg-[var(--surface-disabled)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={logs.page >= logs.pages}
                      onClick={() => setLogFilter({ ...logFilter, page: logFilter.page + 1 })}
                      className="rounded-full bg-[var(--surface-disabled)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {/* ---------------- USERS ---------------- */}
            {!loading && tab === "users" ? (
              <>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setCreateOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white">
                    <UserPlus size={13} /> Create staff / admin
                  </button>
                </div>
                {createOpen ? (
                  <div className="rounded-[2rem] border border-brand-green/30 bg-brand-green/5 p-5">
                    <h3 className="font-display text-xl text-[var(--text-primary)]">Create account</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Super admin can create ADMIN and other staff roles. Temporary password is shown once.</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Full name
                        <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900" />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Email
                        <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900" />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Role
                        <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="form-select mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900">
                          {['ADMIN','DIRECTOR','BURSAR','COORDINATOR','HOD','TEACHER'].map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </label>
                    </div>
                    <button type="button" disabled={creating || !createForm.name || !createForm.email} onClick={() => void createAdmin()} className="mt-4 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">
                      {creating ? 'Creating…' : 'Create account'}
                    </button>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-end gap-3">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Search name or email
                    <input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="e.g. grace"
                      className="mt-2 block w-64 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                    />
                  </label>
                  <button
                    onClick={() => void loadUsers(userSearch).catch(() => undefined)}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow"
                  >
                    <Search size={13} /> Search
                  </button>
                </div>

                {tempPassword ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-5">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">Temporary password for {tempPassword.name}</div>
                      <div className="mt-1 font-mono text-lg font-bold text-brand-orange">{tempPassword.password}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">Copy it now — it will not be shown again.</div>
                    </div>
                    <button onClick={() => setTempPassword(null)} className="rounded-full bg-[var(--surface-disabled)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                      Dismiss
                    </button>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {users.map((entry) => (
                    <div key={entry.id} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{entry.name}</span>
                            <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-green">{entry.role}</span>
                            {entry.isSuspended ? (
                              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-500">Suspended</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {entry.email} · last login {entry.lastLoginAt ? timeAgo(entry.lastLoginAt) : "never"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {entry.isSuspended ? (
                            <button
                              onClick={() => setPendingAction({ user: entry, action: "UNSUSPEND", label: `Re-activate ${entry.name}?` })}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand-green px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                            >
                              <ShieldCheck size={12} /> Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => setPendingAction({ user: entry, action: "SUSPEND", label: `Suspend ${entry.name}? They will be signed out and unable to log in.` })}
                              className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                            >
                              <Lock size={12} /> Suspend
                            </button>
                          )}
                          <button
                            onClick={() => setPendingAction({ user: entry, action: "RESET_PASSWORD", label: `Issue a temporary password for ${entry.name}? Their current password stops working immediately.` })}
                            className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                          >
                            <KeyRound size={12} /> Reset Password
                          </button>
                          {entry.role === "TEACHER" || entry.role === "HOD" ? (
                            <button
                              onClick={() => setPendingAction({ user: entry, action: "PROMOTE_ADMIN", label: `Promote ${entry.name} to ADMIN?` })}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                            >
                              <RefreshCcw size={12} /> Make Admin
                            </button>
                          ) : null}
                          {entry.role === "ADMIN" ? (
                            <button
                              onClick={() => setPendingAction({ user: entry, action: "DEMOTE_TEACHER", label: `Demote ${entry.name} to TEACHER?` })}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                            >
                              <RefreshCcw size={12} /> Make Teacher
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!users.length ? (
                    <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center text-sm text-[var(--text-muted)]">No users match your search.</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title="Confirm action"
        message={pendingAction?.label || ""}
        confirmText="Confirm"
        cancelText="Cancel"
        variant={pendingAction?.action === "SUSPEND" ? "danger" : "warning"}
        onConfirm={() => void runUserAction()}
        onCancel={() => setPendingAction(null)}
      />
      {busy ? <div className="fixed inset-0 z-[300]" /> : null}
    </>
  );
}
