import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";

type AuthMode = "login" | "signup";

type Props = {
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onSignup: (payload: { fullName: string; address: string; email: string; tfn: string; password: string }) => Promise<void>;
  error: string;
  onClearError?: () => void;
};

export function AuthPanel({ onLogin, onSignup, error, onClearError }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    address: "",
    email: "",
    tfn: "",
    password: ""
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await onLogin({ email: form.email, password: form.password });
      } else {
        await onSignup(form);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 rounded-lg border border-white/80 bg-white/80 p-5 shadow-panel ring-1 ring-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800">
          <h1 className="text-3xl font-bold text-ink dark:text-white">FridayRun</h1>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Australian Work Travel Recording System.</p>
        </div>
        <form className="card space-y-4" onSubmit={submit} aria-labelledby="auth-heading">
          <h2 id="auth-heading" className="sr-only">{mode === "login" ? "Sign in to FridayRun" : "Create a FridayRun account"}</h2>
          <div className="flex rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950" role="tablist" aria-label="Authentication mode">
            <button className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${mode === "login" ? "bg-white text-ink shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:text-ink dark:text-slate-300"}`} type="button" onClick={() => { setMode("login"); onClearError?.(); }} role="tab" aria-selected={mode === "login"}>
              Sign In
            </button>
            <button className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${mode === "signup" ? "bg-white text-ink shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:text-ink dark:text-slate-300"}`} type="button" onClick={() => { setMode("signup"); onClearError?.(); }} role="tab" aria-selected={mode === "signup"}>
              Create Account
            </button>
          </div>
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div> : null}
          {mode === "signup" ? (
            <>
              <label className="label">
                Full name
                <input className="field" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
              </label>
              <AddressAutocomplete value={form.address} onChange={(address) => setForm({ ...form, address })} required />
              <label className="label">
                TFN
                <input className="field" inputMode="numeric" value={form.tfn} onChange={(event) => setForm({ ...form, tfn: event.target.value })} required />
              </label>
            </>
          ) : null}
          <label className="label">
            Email address
            <input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label className="label">
            Password
            <input className="field" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </label>
          {mode === "signup" ? (
            <p className="rounded-lg bg-mist/70 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Passwords must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.
            </p>
          ) : null}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
