import { nanoid } from "nanoid";
import { db, enrichFinancialYear, mapEntry, TravelEntry, TravelEntryRow } from "./db.js";
import { financialYearRange } from "./dateUtils.js";

export type EntryPayload = {
  date: string;
  startLocation: string;
  endLocation: string;
  kilometres: number;
  calculatedKilometres?: number | null;
  distanceSource: "calculated" | "manual";
  notes?: string | null;
  vehicle?: string | null;
  odometerStart?: number | null;
  odometerEnd?: number | null;
  roundTrip?: boolean;
  tripCategory?: "work" | "personal" | "commute" | "client_visit" | "site_visit" | "training" | "supplier_visit";
  commuteReason?: string | null;
};

export type EntryFilters = {
  userId?: string;
  startDate?: string;
  endDate?: string;
  financialYear?: string;
  search?: string;
  limit?: number;
  offset?: number;
  claimableOnly?: boolean;
};

function whereClause(filters: EntryFilters) {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.userId) {
    clauses.push("user_id = @userId");
    params.userId = filters.userId;
  }
  if (filters.financialYear) {
    const range = financialYearRange(filters.financialYear);
    filters.startDate = range.startDate;
    filters.endDate = range.endDate;
  }
  if (filters.startDate) {
    clauses.push("date >= @startDate");
    params.startDate = filters.startDate;
  }
  if (filters.endDate) {
    clauses.push("date <= @endDate");
    params.endDate = filters.endDate;
  }
  if (filters.search) {
    clauses.push("(start_location LIKE @search OR end_location LIKE @search OR notes LIKE @search OR vehicle LIKE @search)");
    params.search = `%${filters.search}%`;
  }
  if (filters.claimableOnly) {
    clauses.push("trip_category NOT IN ('personal', 'commute')");
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}

export function listEntries(filters: EntryFilters = {}) {
  const { sql, params } = whereClause(filters);
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const rows = db
    .prepare(
      `SELECT * FROM travel_entries ${sql} ORDER BY date DESC, created_at DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset }) as TravelEntryRow[];
  const total = db.prepare(`SELECT COUNT(*) as count FROM travel_entries ${sql}`).get(params) as {
    count: number;
  };
  return {
    entries: rows.map(mapEntry),
    total: total.count
  };
}

export function getEntry(id: string, userId?: string) {
  const row = db.prepare(`SELECT * FROM travel_entries WHERE id = @id${userId ? " AND user_id = @userId" : ""}`).get({
    id,
    userId
  }) as
    | TravelEntryRow
    | undefined;
  return row ? mapEntry(row) : null;
}

export function createEntry(userId: string, payload: EntryPayload): TravelEntry {
  const id = nanoid();
  const financialYear = enrichFinancialYear(payload.date);
  db.prepare(
    `INSERT INTO travel_entries (
      id, user_id, date, financial_year, start_location, end_location, kilometres,
      calculated_kilometres, distance_source, notes, vehicle, odometer_start, odometer_end, round_trip,
      trip_category, commute_reason
    ) VALUES (
      @id, @userId, @date, @financialYear, @startLocation, @endLocation, @kilometres,
      @calculatedKilometres, @distanceSource, @notes, @vehicle, @odometerStart, @odometerEnd, @roundTrip,
      @tripCategory, @commuteReason
    )`
  ).run({
    id,
    userId,
    financialYear,
    ...payload,
    calculatedKilometres: payload.calculatedKilometres ?? null,
    notes: payload.notes ?? null,
    vehicle: payload.vehicle ?? null,
    odometerStart: payload.odometerStart ?? null,
    odometerEnd: payload.odometerEnd ?? null,
    roundTrip: payload.roundTrip ? 1 : 0,
    tripCategory: payload.tripCategory ?? "work",
    commuteReason: payload.commuteReason ?? null
  });
  return getEntry(id, userId)!;
}

export function updateEntry(id: string, userId: string, payload: EntryPayload) {
  const financialYear = enrichFinancialYear(payload.date);
  const result = db
    .prepare(
      `UPDATE travel_entries SET
        date = @date,
        financial_year = @financialYear,
        start_location = @startLocation,
        end_location = @endLocation,
        kilometres = @kilometres,
        calculated_kilometres = @calculatedKilometres,
        distance_source = @distanceSource,
        notes = @notes,
        vehicle = @vehicle,
        odometer_start = @odometerStart,
        odometer_end = @odometerEnd,
        round_trip = @roundTrip,
        trip_category = @tripCategory,
        commute_reason = @commuteReason,
        updated_at = datetime('now')
      WHERE id = @id AND user_id = @userId`
    )
    .run({
      id,
      userId,
      financialYear,
      ...payload,
      calculatedKilometres: payload.calculatedKilometres ?? null,
      notes: payload.notes ?? null,
      vehicle: payload.vehicle ?? null,
      odometerStart: payload.odometerStart ?? null,
      odometerEnd: payload.odometerEnd ?? null,
      roundTrip: payload.roundTrip ? 1 : 0,
      tripCategory: payload.tripCategory ?? "work",
      commuteReason: payload.commuteReason ?? null
    });
  return result.changes ? getEntry(id, userId) : null;
}

export function deleteEntry(id: string, userId: string) {
  return db.prepare("DELETE FROM travel_entries WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function totalKilometres(filters: EntryFilters = {}) {
  const { sql, params } = whereClause(filters);
  const row = db
    .prepare(`SELECT COALESCE(SUM(kilometres), 0) as kilometres, COUNT(*) as trips FROM travel_entries ${sql}`)
    .get(params) as { kilometres: number; trips: number };
  return row;
}

export function chartSeries(filters: EntryFilters = {}) {
  const { sql, params } = whereClause(filters);
  return db
    .prepare(
      `SELECT substr(date, 1, 7) as period, ROUND(SUM(kilometres), 2) as kilometres
       FROM travel_entries ${sql}
       GROUP BY substr(date, 1, 7)
       ORDER BY period ASC`
    )
    .all(params) as { period: string; kilometres: number }[];
}

export function availableFinancialYears(userId?: string) {
  const filters = userId ? { userId } : {};
  const { sql, params } = whereClause(filters);
  return db
    .prepare(`SELECT financial_year as financialYear, ROUND(SUM(kilometres), 2) as kilometres, COUNT(*) as trips FROM travel_entries ${sql} GROUP BY financial_year ORDER BY financial_year DESC`)
    .all(params) as { financialYear: string; kilometres: number; trips: number }[];
}
