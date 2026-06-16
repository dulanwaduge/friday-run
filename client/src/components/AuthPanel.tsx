import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AddressAutocomplete } from "./AddressAutocomplete";

type AuthMode = "login" | "signup";

type Props = {
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onSignup: (payload: { fullName: string; address: string; email: string; tfn: string; password: string }) => Promise<void>;
  error: string;
};

export function AuthPanel({ onLogin, onSignup, error }: Props) {
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink dark:text-white">FridayRun</h1>
          <p className="mt-1 text-sm text-slate-500">Australian Work Travel Recording System.</p>
        </div>
        <form className="card space-y-4" onSubmit={submit}>
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button className={`h-10 flex-1 rounded-md text-sm font-semibold ${mode === "login" ? "bg-white shadow-sm dark:bg-slate-950" : ""}`} type="button" onClick={() => setMode("login")}>
              Sign in
            </button>
            <button className={`h-10 flex-1 rounded-md text-sm font-semibold ${mode === "signup" ? "bg-white shadow-sm dark:bg-slate-950" : ""}`} type="button" onClick={() => setMode("signup")}>
              Create account
            </button>
          </div>
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
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
            <p className="text-sm text-slate-500">
              Passwords must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.
            </p>
          ) : null}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
