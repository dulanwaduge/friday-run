import { useEffect, useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../types";

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setUsers(await api.users());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function updateRole(user: User, role: User["role"]) {
    await api.updateUser(user.id, { ...user, role });
    await load();
  }

  async function remove(user: User) {
    if (!window.confirm(`Delete ${user.fullName}?`)) return;
    await api.deleteUser(user.id);
    await load();
  }

  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-gumleaf" />
        <h2 className="panel-title">User management</h2>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Email", "Address", "TFN", "Role", "Actions"].map((heading) => (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-sm font-medium text-ink">{user.fullName}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.address}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.tfn}</td>
                <td className="px-4 py-3">
                  <select className="field min-w-36" value={user.role} onChange={(event) => updateRole(user, event.target.value as User["role"])}>
                    <option value="user">User</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button className="icon-btn danger" type="button" onClick={() => remove(user)} aria-label="Delete user" disabled={user.role === "super_admin"}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
