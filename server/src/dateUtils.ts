import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek
} from "date-fns";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export function normaliseDate(value: string): string {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return format(date, "yyyy-MM-dd");
}

export function getAustralianFinancialYear(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

export function financialYearRange(financialYear: string): DateRange {
  const match = /^(\d{4})-(\d{2})$/.exec(financialYear);
  if (!match) {
    throw new Error("Financial year must use the format YYYY-YY");
  }
  const startYear = Number(match[1]);
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`
  };
}

export function currentSummaryRanges(now = new Date()) {
  const fy = getAustralianFinancialYear(now);
  return {
    financialYear: financialYearRange(fy),
    month: {
      startDate: format(startOfMonth(now), "yyyy-MM-dd"),
      endDate: format(endOfMonth(now), "yyyy-MM-dd")
    },
    week: {
      startDate: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      endDate: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd")
    },
    financialYearLabel: fy
  };
}
