import type { AuthResponse, DashboardData, DeductionSummary, DestinationPayload, EntryPayload, FrequentDestination, TravelEntry, User } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? "Request failed");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  signup: (payload: { fullName: string; address: string; email: string; tfn: string; password: string }) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/me"),
  updateMe: (payload: { fullName: string; address: string; email: string; tfn: string }) =>
    request<User>("/me", { method: "PUT", body: JSON.stringify(payload) }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<void>("/me/password", { method: "PUT", body: JSON.stringify(payload) }),
  users: () => request<User[]>("/admin/users"),
  updateUser: (id: string, payload: { fullName: string; address: string; email: string; tfn: string; role: User["role"] }) =>
    request<User>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: "DELETE" }),
  dashboard: () => request<DashboardData>("/dashboard"),
  entries: (query = "") => request<{ entries: TravelEntry[]; total: number }>(`/entries${query}`),
  createEntry: (payload: EntryPayload) =>
    request<TravelEntry>("/entries", { method: "POST", body: JSON.stringify(payload) }),
  updateEntry: (id: string, payload: EntryPayload) =>
    request<TravelEntry>(`/entries/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteEntry: (id: string) => request<void>(`/entries/${id}`, { method: "DELETE" }),
  destinations: () => request<FrequentDestination[]>("/destinations"),
  createDestination: (payload: DestinationPayload) => request<FrequentDestination>("/destinations", { method: "POST", body: JSON.stringify(payload) }),
  updateDestination: (id: string, payload: DestinationPayload) => request<FrequentDestination>(`/destinations/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteDestination: (id: string) => request<void>(`/destinations/${id}`, { method: "DELETE" }),
  deduction: (financialYear: string, marginalTaxRate: number) => request<DeductionSummary>(`/deductions?financialYear=${encodeURIComponent(financialYear)}&marginalTaxRate=${marginalTaxRate}`),
  taxSettings: () => request<{ centsPerKilometreRate: number }>("/admin/settings/tax"),
  updateTaxSettings: (centsPerKilometreRate: number) => request<{ centsPerKilometreRate: number }>("/admin/settings/tax", { method: "PUT", body: JSON.stringify({ centsPerKilometreRate }) }),
  downloadAuditPackage: (financialYear: string, marginalTaxRate: number) => api.downloadFile(`/reports/audit-package?financialYear=${encodeURIComponent(financialYear)}&marginalTaxRate=${marginalTaxRate}`, `fridayrun-audit-package-${financialYear}.pdf`),
  downloadFile: async (path: string, fallbackFilename: string) => {
    const response = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.error ?? "Download failed"); }
    const blob = await response.blob();
    const filename = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? fallbackFilename;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  },
  downloadReport: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE}/reports?${params.toString()}`, {
      credentials: "include"
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error ?? "Download failed");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `fridayrun-report.${params.get("format") ?? "pdf"}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
};
