import { LogOut, Moon, Plus, Search, Sun, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { EntriesTable } from "./components/EntriesTable";
import { EntryForm } from "./components/EntryForm";
import { ReportsPanel } from "./components/ReportsPanel";
import { AuthPanel } from "./components/AuthPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { AdminPanel } from "./components/AdminPanel";
import { api } from "./lib/api";
import type { DashboardData, EntryPayload, TravelEntry, User } from "./types";

type View = "log" | "profile" | "admin";

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>("log");
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [editing, setEditing] = useState<TravelEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dark, setDark] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString() ? `?${params.toString()}` : "";
  }, [endDate, search, startDate]);

  async function refresh() {
    const [nextDashboard, list] = await Promise.all([api.dashboard(), api.entries(query)]);
    setDashboard(nextDashboard);
    setEntries(list.entries);
  }

  useEffect(() => {
    api
      .me()
      .then((nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      })
      .catch(() => {
        setAuthReady(true);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh().catch((err) => setError(err.message));
  }, [query, user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function save(payload: EntryPayload) {
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await api.updateEntry(editing.id, payload);
        setEditing(null);
      } else {
        await api.createEntry(payload);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setBusy(false);
    }
  }

  async function login(payload: { email: string; password: string }) {
    setError("");
    try {
      const auth = await api.login(payload);
      setUser(auth.user);
      setView("log");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  }

  async function signup(payload: { fullName: string; address: string; email: string; tfn: string; password: string }) {
    setError("");
    try {
      const auth = await api.signup(payload);
      setUser(auth.user);
      setView("log");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    setDashboard(null);
    setEntries([]);
    setView("log");
  }

  async function remove(entry: TravelEntry) {
    const confirmed = window.confirm(`Delete trip from ${entry.startLocation} to ${entry.endLocation}?`);
    if (!confirmed) return;
    await api.deleteEntry(entry.id);
    await refresh();
  }

  if (!authReady) {
    return <main className="min-h-screen bg-paper p-6 text-slate-900">Loading FridayRun...</main>;
  }

  if (!user) {
    return <AuthPanel onLogin={login} onSignup={signup} error={error} />;
  }

  return (
    <main className="min-h-screen bg-paper text-slate-900 transition dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-ink dark:text-white">FridayRun</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Australian Work Travel Recording System from 1 July to 30 June.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">{user.fullName}</span>
            <button className="icon-btn" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="icon-btn" type="button" onClick={logout} aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="mb-5 flex flex-wrap gap-2">
          <button className={view === "log" ? "btn-primary" : "btn-secondary"} type="button" onClick={() => setView("log")}>
            <Plus className="h-4 w-4" />
            Travel log
          </button>
          <button className={view === "profile" ? "btn-primary" : "btn-secondary"} type="button" onClick={() => setView("profile")}>
            <UserCog className="h-4 w-4" />
            Account
          </button>
          {user.role === "super_admin" ? (
            <button className={view === "admin" ? "btn-primary" : "btn-secondary"} type="button" onClick={() => setView("admin")}>
              Admin
            </button>
          ) : null}
        </nav>

        {view === "log" ? (
          <>
            {dashboard ? <Dashboard data={dashboard} /> : <div className="card">Loading dashboard...</div>}

            <section className="mt-5 card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="panel-title">{editing ? "Edit travel entry" : "Log a trip"}</h2>
                <div className="flex items-center gap-2 rounded-full bg-gumleaf/10 px-3 py-1 text-sm font-medium text-gumleaf">
                  <Plus className="h-4 w-4" />
                  Tax log
                </div>
              </div>
              {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              <EntryForm entry={editing} busy={busy} onSubmit={save} onCancel={editing ? () => setEditing(null) : undefined} />
            </section>

            <section className="mt-5 space-y-4">
              <ReportsPanel />
              <div className="card">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="panel-title">Travel entries</h2>
                  <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
                    <label className="label">
                      Search
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input className="field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
                      </div>
                    </label>
                    <label className="label">
                      From
                      <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                    </label>
                    <label className="label">
                      To
                      <input className="field" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                    </label>
                  </div>
                </div>
                <EntriesTable entries={entries} onEdit={setEditing} onDelete={remove} />
              </div>
            </section>
          </>
        ) : null}

        {view === "profile" ? (
          <ProfilePanel
            user={user}
            onUpdate={async (payload) => {
              const nextUser = await api.updateMe(payload);
              setUser(nextUser);
            }}
            onPassword={api.changePassword}
          />
        ) : null}

        {view === "admin" && user.role === "super_admin" ? <AdminPanel /> : null}
      </div>
    </main>
  );
}
