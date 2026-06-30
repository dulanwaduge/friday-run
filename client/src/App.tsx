import { ClipboardList, LayoutDashboard, LogOut, Moon, Plus, Search, Shield, Sun, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { EntriesTable } from "./components/EntriesTable";
import { EntryForm } from "./components/EntryForm";
import { ReportsPanel } from "./components/ReportsPanel";
import { AuthPanel } from "./components/AuthPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { AdminPanel } from "./components/AdminPanel";
import { TaxDeductionCalculator } from "./components/TaxDeductionCalculator";
import { FrequentDestinations } from "./components/FrequentDestinations";
import { ReturnTripPrompt } from "./components/ReturnTripPrompt";
import { api } from "./lib/api";
import type { DashboardData, EntryPayload, FrequentDestination, TravelEntry, User, Vehicle } from "./types";

type View = "dashboard" | "log" | "records" | "profile" | "admin";

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [editing, setEditing] = useState<TravelEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dark, setDark] = useState(false);
  const [error, setError] = useState("");
  const [destinations, setDestinations] = useState<FrequentDestination[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [returnEntry, setReturnEntry] = useState<TravelEntry | null>(null);
  const [draft, setDraft] = useState<EntryPayload | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString() ? `?${params.toString()}` : "";
  }, [endDate, search, startDate]);

  const refresh = useCallback(async () => {
    const [nextDashboard, list, savedDestinations, savedVehicles] = await Promise.all([api.dashboard(), api.entries(query), api.destinations(), api.vehicles()]);
    setDashboard(nextDashboard);
    setEntries(list.entries);
    setDestinations(savedDestinations);
    setVehicles(savedVehicles);
  }, [query]);

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
  }, [refresh, user]);

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
        const created = await api.createEntry(payload);
        setReturnEntry(created.roundTrip ? null : created);
        setDraft(null);
      }
      await refresh();
      setRefreshKey((value) => value + 1);
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
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  }

  async function signup(payload: { fullName: string; address: string; email: string; tfn: string; password: string }) {
    setError("");
    try {
      const auth = await api.signup(payload);
      setUser(auth.user);
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    setDashboard(null);
    setEntries([]);
    setVehicles([]);
    setView("dashboard");
  }

  async function remove(entry: TravelEntry) {
    const confirmed = window.confirm(`Delete trip from ${entry.startLocation} to ${entry.endLocation}?`);
    if (!confirmed) return;
    await api.deleteEntry(entry.id);
    await refresh();
  }

  function startEdit(entry: TravelEntry) {
    setEditing(entry);
    setView("log");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!authReady) {
    return <main className="min-h-screen bg-paper p-6 text-slate-900">Loading FridayRun...</main>;
  }

  if (!user) {
    return <AuthPanel onLogin={login} onSignup={signup} error={error} onClearError={() => setError("")} />;
  }

  const navItems = [
    { view: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { view: "log" as const, label: editing ? "Edit trip" : "Log trip", icon: Plus },
    { view: "records" as const, label: "Records", icon: ClipboardList },
    { view: "profile" as const, label: "Account", icon: UserCog },
    ...(user.role === "super_admin" ? [{ view: "admin" as const, label: "Admin", icon: Shield }] : [])
  ];

  return (
    <main className="min-h-screen bg-paper text-slate-900 transition dark:bg-slate-950 dark:text-slate-100">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/80 bg-white/80 p-4 shadow-panel ring-1 ring-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-ink dark:text-white">FridayRun</h1>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Work travel records for the Australian financial year, 1 July to 30 June.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{user.fullName}</span>
            <button className="icon-btn" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle Dark Mode">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="icon-btn" type="button" onClick={logout} aria-label="Sign Out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="sticky top-0 z-20 -mx-4 mb-5 border-y border-slate-200/80 bg-paper/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90" aria-label="Primary">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1">
            {navItems.map((item) => (
              <button
                className={view === item.view ? "nav-item nav-item-active" : item.view === "log" ? "nav-item nav-item-primary" : "nav-item"}
                type="button"
                onClick={() => setView(item.view)}
                aria-current={view === item.view ? "page" : undefined}
                key={item.view}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div id="main-content" tabIndex={-1}>
        {view === "dashboard" ? (
          <>
            <section className="mb-5 rounded-lg border border-white/80 bg-ink p-5 text-white shadow-soft ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="section-kicker text-emerald-200 dark:text-emerald-300">Dashboard</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Your tax log at a glance</h2>
                  <p className="mt-1 max-w-2xl text-sm font-medium text-slate-200">Review totals, check recent activity, or start a new trip from the same place every time.</p>
                </div>
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-ink shadow-lift transition hover:-translate-y-0.5 hover:bg-mist active:translate-y-0 sm:w-auto" type="button" onClick={() => setView("log")}>
                  <Plus className="h-4 w-4" />
                  Log Trip
                </button>
              </div>
            </section>
            {dashboard ? <Dashboard data={dashboard} /> : <div className="card">Loading dashboard...</div>}
            <div className="mt-5">
              <TaxDeductionCalculator refreshKey={refreshKey} />
            </div>
          </>
        ) : null}

        {view === "log" ? (
          <>
            <section className="card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Trip details</p>
                  <h2 className="panel-title">{editing ? "Edit travel entry" : "Log a trip"}</h2>
                </div>
                <button className="btn-secondary" type="button" onClick={() => setView("records")}>
                  <ClipboardList className="h-4 w-4" />
                  View Records
                </button>
              </div>
              {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              <EntryForm entry={editing} draft={draft} destinations={destinations} vehicles={vehicles} busy={busy} onSubmit={save} onCancel={editing ? () => setEditing(null) : undefined} />
            </section>
            {returnEntry ? <ReturnTripPrompt entry={returnEntry} onDismiss={() => setReturnEntry(null)} onCreate={async (payload) => { await save(payload); setReturnEntry(null); }} onPrepare={(payload) => { setDraft(payload); setReturnEntry(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} /> : null}
            <div className="mt-5">
              <FrequentDestinations destinations={destinations} onChange={refresh} />
            </div>
          </>
        ) : null}

        {view === "records" ? (
          <section className="space-y-5">
            <ReportsPanel />
            <div className="card">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="section-kicker">Records</p>
                  <h2 className="panel-title">Travel entries</h2>
                </div>
                <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
                  <label className="label">
                    Search entries
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input className="field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Destination, notes, vehicle" />
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
              <EntriesTable entries={entries} onEdit={startEdit} onDelete={remove} />
            </div>
          </section>
        ) : null}

        {view === "profile" ? (
          <ProfilePanel
            user={user}
            onUpdate={async (payload) => {
              const nextUser = await api.updateMe(payload);
              setUser(nextUser);
            }}
            onPassword={async (payload) => {
              await api.changePassword(payload);
              await logout();
            }}
            vehicles={vehicles}
            onCreateVehicle={async (payload) => {
              await api.createVehicle(payload);
              await refresh();
            }}
            onDeleteVehicle={async (id) => {
              await api.deleteVehicle(id);
              await refresh();
            }}
          />
        ) : null}

        {view === "admin" && user.role === "super_admin" ? <AdminPanel /> : null}
        </div>
      </div>
    </main>
  );
}
