import { useEffect, useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../types";

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [taxRate, setTaxRate] = useState(0.88);

  async function load() {
    setUsers(await api.users());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    api.taxSettings().then((settings) => setTaxRate(settings.centsPerKilometreRate)).catch((err) => setError(err.message));
  }, []);

  async function updateRole(user: User, role: User["role"]) {
    await api.updateUser(user.id, {
      fullName: user.fullName,
      address: user.address,
      email: user.email,
      role
    });
    await load();
  }

  async function remove(user: User) {
    if (!window.confirm(`Delete ${user.fullName}?`)) return;
    await api.deleteUser(user.id);
    await load();
  }

  return (
    <div className="space-y-5"><section className="card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="panel-title">Tax calculation settings</h2><p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Global guidance rate used for deduction estimates and audit packages.</p></div>
        <label className="label">Dollars per kilometre<input className="field w-40" type="number" min="0" max="5" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} /></label>
        <button className="btn-primary" type="button" onClick={async () => { const settings = await api.updateTaxSettings(taxRate); setTaxRate(settings.centsPerKilometreRate); }}>Save Rate</button>
      </div>
    </section><section className="card">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gumleaf/10 text-gumleaf ring-1 ring-gumleaf/15"><Shield className="h-5 w-5" /></span>
        <h2 className="panel-title">User management</h2>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      <div className="table-shell overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-mist/70 dark:bg-slate-900">
            <tr>
              {["Name", "Email", "Address", "TFN", "Role", "Actions"].map((heading) => (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map((user) => (
              <tr className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60" key={user.id}>
                <td className="px-4 py-3 text-sm font-medium text-ink dark:text-white">{user.fullName}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.address}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.tfn}</td>
                <td className="px-4 py-3">
                  <select className="field min-w-36" value={user.role} onChange={(event) => updateRole(user, event.target.value as User["role"])}>
                    <option value="user">User</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button className="icon-btn danger" type="button" onClick={() => remove(user)} aria-label="Delete User" disabled={user.role === "super_admin"}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section></div>
  );
}
