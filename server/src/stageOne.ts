import { differenceInCalendarDays, parseISO } from "date-fns";
import { nanoid } from "nanoid";
import { db } from "./db.js";
import { currentSummaryRanges, financialYearRange } from "./dateUtils.js";

export type DestinationCategory =
  | "home"
  | "office"
  | "client"
  | "supplier"
  | "training"
  | "job_site"
  | "other";
export type DestinationPayload = {
  nickname: string;
  address: string;
  category: DestinationCategory;
  notes?: string | null;
};
type DestinationRow = {
  id: string;
  user_id: string;
  nickname: string;
  address: string;
  category: DestinationCategory;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type VehicleState =
  | "ACT"
  | "NSW"
  | "NT"
  | "QLD"
  | "SA"
  | "TAS"
  | "VIC"
  | "WA";
export type VehiclePayload = { rego: string; state: VehicleState };
type VehicleRow = {
  id: string;
  user_id: string;
  rego: string;
  state: VehicleState;
  created_at: string;
  updated_at: string;
};

function mapDestination(row: DestinationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    address: row.address,
    category: row.category,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVehicle(row: VehicleRow) {
  return {
    id: row.id,
    userId: row.user_id,
    rego: row.rego,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDestinations(userId: string) {
  return (
    db
      .prepare(
        "SELECT * FROM frequent_destinations WHERE user_id = ? ORDER BY nickname COLLATE NOCASE",
      )
      .all(userId) as DestinationRow[]
  ).map(mapDestination);
}

export function createDestination(userId: string, payload: DestinationPayload) {
  const id = nanoid();
  db.prepare(
    `INSERT INTO frequent_destinations (id, user_id, nickname, address, category, notes)
    VALUES (@id, @userId, @nickname, @address, @category, @notes)`,
  ).run({ id, userId, ...payload, notes: payload.notes ?? null });
  return mapDestination(
    db
      .prepare(
        "SELECT * FROM frequent_destinations WHERE id = ? AND user_id = ?",
      )
      .get(id, userId) as DestinationRow,
  );
}

export function updateDestination(
  id: string,
  userId: string,
  payload: DestinationPayload,
) {
  const result = db
    .prepare(
      `UPDATE frequent_destinations SET nickname=@nickname, address=@address, category=@category,
    notes=@notes, updated_at=datetime('now') WHERE id=@id AND user_id=@userId`,
    )
    .run({ id, userId, ...payload, notes: payload.notes ?? null });
  if (!result.changes) return null;
  return mapDestination(
    db
      .prepare(
        "SELECT * FROM frequent_destinations WHERE id = ? AND user_id = ?",
      )
      .get(id, userId) as DestinationRow,
  );
}

export function deleteDestination(id: string, userId: string) {
  return (
    db
      .prepare("DELETE FROM frequent_destinations WHERE id = ? AND user_id = ?")
      .run(id, userId).changes > 0
  );
}

export function listVehicles(userId: string) {
  return (
    db
      .prepare(
        "SELECT * FROM vehicles WHERE user_id = ? ORDER BY rego COLLATE NOCASE, state",
      )
      .all(userId) as VehicleRow[]
  ).map(mapVehicle);
}

export function createVehicle(userId: string, payload: VehiclePayload) {
  const existing = db
    .prepare(
      "SELECT * FROM vehicles WHERE user_id = ? AND rego = ? AND state = ?",
    )
    .get(userId, payload.rego, payload.state) as VehicleRow | undefined;
  if (existing) return mapVehicle(existing);
  const id = nanoid();
  db.prepare(
    `INSERT INTO vehicles (id, user_id, rego, state)
    VALUES (@id, @userId, @rego, @state)`,
  ).run({ id, userId, ...payload });
  return mapVehicle(
    db
      .prepare("SELECT * FROM vehicles WHERE id = ? AND user_id = ?")
      .get(id, userId) as VehicleRow,
  );
}

export function updateVehicle(
  id: string,
  userId: string,
  payload: VehiclePayload,
) {
  const result = db
    .prepare(
      `UPDATE vehicles SET rego=@rego, state=@state, updated_at=datetime('now')
    WHERE id=@id AND user_id=@userId`,
    )
    .run({ id, userId, ...payload });
  if (!result.changes) return null;
  return mapVehicle(
    db
      .prepare("SELECT * FROM vehicles WHERE id = ? AND user_id = ?")
      .get(id, userId) as VehicleRow,
  );
}

export function deleteVehicle(id: string, userId: string) {
  return (
    db
      .prepare("DELETE FROM vehicles WHERE id = ? AND user_id = ?")
      .run(id, userId).changes > 0
  );
}

export function isLikelyCommute(userId: string, start: string, end: string) {
  const normalized = (value: string) => value.trim().toLocaleLowerCase();
  const destinations = listDestinations(userId);
  const startCategory = destinations.find(
    (item) => normalized(item.address) === normalized(start),
  )?.category;
  const endCategory = destinations.find(
    (item) => normalized(item.address) === normalized(end),
  )?.category;
  return (
    (startCategory === "home" && endCategory === "office") ||
    (startCategory === "office" && endCategory === "home")
  );
}

export function getCentsPerKilometreRate() {
  const row = db
    .prepare(
      "SELECT value FROM app_settings WHERE key = 'cents_per_kilometre_rate'",
    )
    .get() as { value: string };
  return Number(row.value);
}

export function setCentsPerKilometreRate(rate: number) {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('cents_per_kilometre_rate', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
  ).run(String(rate));
  return getCentsPerKilometreRate();
}

export function deductionSummary(
  userId: string,
  financialYear?: string,
  marginalTaxRate = 0.3,
) {
  const label = financialYear ?? currentSummaryRanges().financialYearLabel;
  const range = financialYearRange(label);
  const vehicles = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(vehicle), ''), 'Unspecified vehicle') AS vehicle,
    COALESCE(SUM(kilometres), 0) AS kilometres
    FROM travel_entries
    WHERE user_id = @userId AND date >= @startDate AND date <= @endDate
      AND trip_category NOT IN ('personal', 'commute')
    GROUP BY COALESCE(NULLIF(TRIM(vehicle), ''), 'Unspecified vehicle')`,
    )
    .all({ userId, ...range }) as { vehicle: string; kilometres: number }[];
  const total = vehicles.reduce((sum, vehicle) => sum + vehicle.kilometres, 0);
  const eligibleKilometres = vehicles.reduce(
    (sum, vehicle) => sum + Math.min(vehicle.kilometres, 5000),
    0,
  );
  const rate = getCentsPerKilometreRate();
  const estimatedDeduction = eligibleKilometres * rate;
  const today = new Date();
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const elapsed =
    today < start
      ? 0
      : today > end
        ? totalDays
        : differenceInCalendarDays(today, start) + 1;
  return {
    financialYear: label,
    totalWorkKilometres: total,
    eligibleKilometres,
    vehicleBreakdown: vehicles.map((vehicle) => ({
      ...vehicle,
      eligibleKilometres: Math.min(vehicle.kilometres, 5000),
    })),
    centsPerKilometreRate: rate,
    estimatedDeduction,
    marginalTaxRate,
    estimatedTaxBenefit: estimatedDeduction * marginalTaxRate,
    financialYearProgress: Math.min(1, elapsed / totalDays),
    disclaimer:
      "Estimate only for general guidance and record-keeping. This is not tax advice. Eligibility and the applicable method should be confirmed with the ATO or a registered tax professional.",
  };
}
