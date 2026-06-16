import Database from "better-sqlite3";
import crypto from "node:crypto";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAustralianFinancialYear } from "./dateUtils.js";
import { encryptTfn, hashPassword, isEncryptedTfn } from "./security.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(dirname, "../../data/fridayrun.sqlite");
const databaseUrl = process.env.DATABASE_URL ?? defaultDbPath;
const resolvedPath = path.isAbsolute(databaseUrl)
  ? databaseUrl
  : path.resolve(process.cwd(), databaseUrl);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

export const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    tfn TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS travel_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    kilometres REAL NOT NULL CHECK (kilometres >= 0),
    calculated_kilometres REAL,
    distance_source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    vehicle TEXT,
    odometer_start REAL,
    odometer_end REAL,
    round_trip INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_travel_entries_date ON travel_entries(date);
  CREATE INDEX IF NOT EXISTS idx_travel_entries_financial_year ON travel_entries(financial_year);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
`);

const columns = db.prepare("PRAGMA table_info(travel_entries)").all() as { name: string }[];
if (!columns.some((column) => column.name === "round_trip")) {
  db.prepare("ALTER TABLE travel_entries ADD COLUMN round_trip INTEGER NOT NULL DEFAULT 0").run();
}
if (!columns.some((column) => column.name === "user_id")) {
  db.prepare("ALTER TABLE travel_entries ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE").run();
}
db.prepare("CREATE INDEX IF NOT EXISTS idx_travel_entries_user_id ON travel_entries(user_id)").run();

const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
if (userCount === 0) {
  const adminId = crypto.randomUUID();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";
  db.prepare(
    `INSERT INTO users (id, full_name, address, email, tfn, password_hash, role)
     VALUES (@id, @fullName, @address, @email, @tfn, @passwordHash, 'super_admin')`
  ).run({
    id: adminId,
    fullName: process.env.SUPER_ADMIN_FULL_NAME ?? "FridayRun Admin",
    address: process.env.SUPER_ADMIN_ADDRESS ?? "Update this address",
    email: (process.env.SUPER_ADMIN_EMAIL ?? "admin@example.com").toLowerCase(),
    tfn: encryptTfn(process.env.SUPER_ADMIN_TFN ?? "000000000"),
    passwordHash: hashPassword(password)
  });
  db.prepare("UPDATE travel_entries SET user_id = @adminId WHERE user_id IS NULL").run({ adminId });
}

const tfnRows = db.prepare("SELECT id, tfn FROM users").all() as { id: string; tfn: string }[];
const migrateTfn = db.prepare("UPDATE users SET tfn = @tfn WHERE id = @id");
for (const row of tfnRows) {
  if (!isEncryptedTfn(row.tfn)) {
    migrateTfn.run({ id: row.id, tfn: encryptTfn(row.tfn) });
  }
}

export type TravelEntryRow = {
  id: string;
  user_id: string;
  date: string;
  financial_year: string;
  start_location: string;
  end_location: string;
  kilometres: number;
  calculated_kilometres: number | null;
  distance_source: "calculated" | "manual";
  notes: string | null;
  vehicle: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  round_trip: number;
  created_at: string;
  updated_at: string;
};

export type TravelEntry = {
  id: string;
  userId: string;
  date: string;
  financialYear: string;
  startLocation: string;
  endLocation: string;
  kilometres: number;
  calculatedKilometres: number | null;
  distanceSource: "calculated" | "manual";
  notes: string | null;
  vehicle: string | null;
  odometerStart: number | null;
  odometerEnd: number | null;
  roundTrip: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapEntry(row: TravelEntryRow): TravelEntry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    financialYear: row.financial_year,
    startLocation: row.start_location,
    endLocation: row.end_location,
    kilometres: row.kilometres,
    calculatedKilometres: row.calculated_kilometres,
    distanceSource: row.distance_source,
    notes: row.notes,
    vehicle: row.vehicle,
    odometerStart: row.odometer_start,
    odometerEnd: row.odometer_end,
    roundTrip: Boolean(row.round_trip),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function enrichFinancialYear(date: string) {
  return getAustralianFinancialYear(date);
}
