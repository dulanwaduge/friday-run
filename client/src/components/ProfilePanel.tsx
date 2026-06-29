import { FormEvent, useEffect, useState } from "react";
import { Car, KeyRound, Plus, Save, Trash2 } from "lucide-react";
import type { User, Vehicle, VehiclePayload, VehicleState } from "../types";
import { AddressAutocomplete } from "./AddressAutocomplete";

type Props = {
  user: User;
  vehicles: Vehicle[];
  onUpdate: (payload: { fullName: string; address: string; email: string; tfn?: string }) => Promise<void>;
  onPassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  onCreateVehicle: (payload: VehiclePayload) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
};

const australianStates: VehicleState[] = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export function ProfilePanel({ user, vehicles, onUpdate, onPassword, onCreateVehicle, onDeleteVehicle }: Props) {
  const [profile, setProfile] = useState(user);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [vehicle, setVehicle] = useState<VehiclePayload>({ rego: "", state: "VIC" });
  const [message, setMessage] = useState("");

  useEffect(() => setProfile(user), [user]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const tfn = profile.tfn.trim();
    await onUpdate({
      fullName: profile.fullName,
      address: profile.address,
      email: profile.email,
      ...(tfn && /^\d{8,9}$/.test(tfn) ? { tfn } : {})
    });
    setMessage("Profile updated");
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    await onPassword(passwords);
    setPasswords({ currentPassword: "", newPassword: "" });
    setMessage("Password changed");
  }

  async function saveVehicle(event: FormEvent) {
    event.preventDefault();
    await onCreateVehicle({ rego: vehicle.rego.trim().toUpperCase(), state: vehicle.state });
    setVehicle({ rego: "", state: vehicle.state });
    setMessage("Vehicle added");
  }

  async function removeVehicle(id: string) {
    await onDeleteVehicle(id);
    setMessage("Vehicle removed");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form className="card space-y-4" onSubmit={saveProfile}>
        <h2 className="panel-title">Account details</h2>
        {message ? <div className="rounded-lg border border-gumleaf/20 bg-gumleaf/10 px-4 py-3 text-sm font-semibold text-gumleaf dark:border-gumleaf/40 dark:bg-gumleaf/20 dark:text-emerald-200">{message}</div> : null}
        <label className="label">
          Full name
          <input className="field" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required />
        </label>
        <AddressAutocomplete value={profile.address} onChange={(address) => setProfile({ ...profile, address })} required />
        <label className="label">
          Email
          <input className="field" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required />
        </label>
        <label className="label">
          TFN
          <input className="field" inputMode="numeric" value={profile.tfn} onChange={(event) => setProfile({ ...profile, tfn: event.target.value })} />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">For privacy, saved TFNs are masked. Enter a new TFN only when it needs to change.</span>
        </label>
        <button className="btn-primary" type="submit">
          <Save className="h-4 w-4" />
          Save Details
        </button>
      </form>
      <form className="card space-y-4" onSubmit={savePassword}>
        <h2 className="panel-title">Password</h2>
        <label className="label">
          Current password
          <input className="field" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required />
        </label>
        <label className="label">
          New password
          <input className="field" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required />
        </label>
        <p className="rounded-lg bg-mist/70 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-300">Use at least 12 characters with uppercase, lowercase, number, and symbol characters.</p>
        <button className="btn-secondary" type="submit">
          <KeyRound className="h-4 w-4" />
          Change Password
        </button>
      </form>
      <section className="card space-y-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="panel-title">Vehicles</h2>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Add vehicles once, then select the rego from the trip form.</p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gumleaf/10 text-gumleaf ring-1 ring-gumleaf/15"><Car className="h-5 w-5" /></span>
        </div>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={saveVehicle}>
          <label className="label">
            Rego
            <input className="field uppercase" value={vehicle.rego} onChange={(event) => setVehicle({ ...vehicle, rego: event.target.value })} placeholder="ABC123" required />
          </label>
          <label className="label">
            State
            <select className="field" value={vehicle.state} onChange={(event) => setVehicle({ ...vehicle, state: event.target.value as VehicleState })}>
              {australianStates.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          <button className="btn-primary self-end" type="submit">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </form>
        {vehicles.length ? (
          <div className="table-shell">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-mist/70 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Rego</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vehicles.map((item) => (
                  <tr className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60" key={item.id}>
                    <td className="px-4 py-3 font-semibold">{item.rego}</td>
                    <td className="px-4 py-3">{item.state}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-secondary" type="button" onClick={() => removeVehicle(item.id)} aria-label={`Delete Vehicle ${item.rego}`}>
                        <Trash2 className="h-4 w-4" />
                        Delete Vehicle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">No vehicles added yet.</p>
        )}
      </section>
    </div>
  );
}
