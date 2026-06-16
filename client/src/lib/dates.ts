import { format } from "date-fns";

export function today() {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 6 ? year : year - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export function formatKm(value: number) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}
