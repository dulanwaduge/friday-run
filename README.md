# FridayRun

FridayRun is a responsive travel log for Australian work-related driving records. It tracks trips against the Australian financial year, calculates summary totals, and exports tax-ready reports.

## Features

- Travel entry form with date, start/end destination, kilometres, vehicle, notes, and odometer readings.
- Multi-user accounts with full name, Google Maps-assisted address entry, email, TFN, and strong password validation.
- Account-managed vehicles with rego and Australian state/territory, surfaced as a vehicle dropdown on the trip form.
- Super-admin user management dashboard.
- HttpOnly cookie sessions so browser JavaScript does not store session tokens.
- TFNs encrypted at rest with `TFN_ENCRYPTION_KEY`.
- Google Maps Places autocomplete for trip locations, profile addresses, and frequent destinations when `VITE_GOOGLE_MAPS_API_KEY` is configured.
- Driving-distance calculation for Google-selected places, manually typed addresses, and saved frequent destinations.
- Dashboard totals for the current Australian financial year, month, week, and trip count.
- Recent entries and monthly kilometre chart.
- Entry search, date filtering, edit, and delete.
- CSV, PDF, and Excel report exports for custom ranges, weeks, months, and financial years.
- SQLite database for local development.
- Docker setup for local deployment.
- Tax deduction estimates by Australian financial year, including an admin-configurable rate, marginal tax benefit estimate, 5,000 km per-car method cap, and visible guidance disclaimer.
- Saved frequent destinations with nicknames, categories, notes, and one-click form selection.
- Return-trip suggestions with same-day/custom-date creation or distance recalculation.
- Home-to-regular-workplace commute warnings and required reasons when recorded as work travel.
- ATO audit package PDF containing taxpayer and vehicle details, financial-year totals, trip and odometer records, deduction estimate, timestamp, and compliance disclaimer. Duplicate vehicle regos are printed once, while different regos remain listed.
- Consistent Title Case for action buttons and category options throughout the interface.

## Architecture

- `client/`: React, TypeScript, Vite, Tailwind CSS, Recharts.
- `server/`: Node.js, Express, TypeScript, SQLite via `better-sqlite3`.
- `data/`: local SQLite database files.

## Database Schema

```sql
CREATE TABLE travel_entries (
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
  trip_category TEXT NOT NULL DEFAULT 'work',
  commute_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE frequent_destinations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  address TEXT NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rego TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, rego, state)
);
```

## API Endpoints

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `PUT /api/me`
- `PUT /api/me/password`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/dashboard`
- `GET /api/entries?startDate=&endDate=&financialYear=&search=`
- `POST /api/entries`
- `GET /api/entries/:id`
- `PUT /api/entries/:id`
- `DELETE /api/entries/:id`
- `GET /api/financial-years`
- `GET /api/reports?period=custom|week|month|financial-year&format=csv|xlsx|pdf`
- `GET /api/deductions?financialYear=&marginalTaxRate=`
- `GET|POST /api/destinations`
- `PUT|DELETE /api/destinations/:id`
- `GET|POST /api/vehicles`
- `PUT|DELETE /api/vehicles/:id`
- `GET /api/reports/audit-package?financialYear=&marginalTaxRate=`
- `GET|PUT /api/admin/settings/tax` (super admin only)

## Database migrations

Migrations are additive and run automatically when the server starts. Existing databases receive the `trip_category` and `commute_reason` travel-entry columns plus the `frequent_destinations`, `vehicles`, and `app_settings` tables. Back up `data/fridayrun.sqlite` before deploying a new production build.

## Tests

```bash
npm run typecheck
npm test
npm run build
```

## Stage 1 verification

1. Sign in and confirm the tax estimate shows current financial-year kilometres, estimated deduction, tax benefit, progress, and disclaimer.
2. As a super admin, open Admin, change the dollars-per-kilometre rate, save it, then refresh the estimate.
3. In Account, add vehicles with a Rego and Australian State/Territory. Confirm they appear in the trip form's Vehicle dropdown.
4. Save Home and Office frequent destinations. Confirm Google Places suggests Australian addresses while typing, then select the saved locations in the trip form.
5. Record Home to Office as Work. Confirm the commute warning appears and a reason is required. Confirm Personal or Commute classification can still be saved without claiming it as work.
6. Enter or select start and end addresses. Confirm Calculate Distance enables once both fields contain text and works with typed, Google-selected, and saved addresses.
7. Save a trip and use the return prompt to create it with the same kilometres and a chosen date. Use “Prepare And Recalculate” to reverse the route in the trip form for Google Maps/manual recalculation.
8. In Reports, choose a financial year and download the ATO audit package. Confirm it contains only the signed-in user's profile, vehicles, trip log, odometers, notes, estimate, export timestamp, and disclaimers.
9. Record several trips using the same vehicle rego with different casing, spaces, or hyphens. Confirm the ATO package lists that rego once and still lists genuinely different regos separately.

## Roadmap

Stage 1 is implemented: deduction estimates, frequent destinations, return-trip assistance, commute warnings, and ATO audit packages. The next architecture phase is Stage 2: expenses/receipts (with future OCR), calendar evidence, assisted trip classification, accountant read-only access with explicit grants, and multi-driver fleet/business accounts. These should be introduced as user-owned domain modules and permission-scoped services rather than added to the travel-entry table.

## Local Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The API runs on `http://localhost:3000` and the Vite app runs on `http://localhost:5173`.

## Google Maps

Create a browser API key in Google Cloud with these APIs enabled:

- Maps JavaScript API
- Places API
- Distance Matrix API

Then set:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Places suggestions are restricted to Australian addresses. The app still works without a key, using manual destinations and manual kilometres. When Maps is enabled, Calculate Distance can resolve typed address text as well as coordinates returned by Places autocomplete.

## Super Admin

On first startup, FridayRun creates a super-admin account from these environment variables:

```bash
SUPER_ADMIN_FULL_NAME=FridayRun Admin
SUPER_ADMIN_ADDRESS=Update this address
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_TFN=000000000
SUPER_ADMIN_PASSWORD=ChangeMe123!
```

Set these before the first production start. Passwords must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.

## Reports

Reports include the user's full name, address, email, TFN, date, start destination, end destination, trip type, kilometres travelled, vehicle, notes, and the total kilometres for the selected period. CSV, PDF, and Excel reports include the user details at the top of the report.

The ATO audit package additionally includes the financial-year deduction estimate, odometer values, export timestamp, and record-keeping disclaimer. Vehicle regos are normalized for comparison, so values such as `ABC123`, `abc123`, and `ABC-123` appear once; a different rego remains a separate vehicle.

## Docker

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## Self-hosting

See [Self-hosting FridayRun with Apache and Cloudflare Tunnel](docs/self-hosting.md).

## Production Notes

- Put the app behind HTTPS before using Google Maps in production.
- Use a restricted Google Maps browser key.
- TFNs are sensitive personal information. Use HTTPS, restricted admin access, encrypted backups, and database encryption where appropriate.
- SQLite is suitable for local/small deployments. For larger multi-user production, migrate the repository layer to PostgreSQL.
