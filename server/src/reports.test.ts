import assert from "node:assert/strict";
import { test } from "node:test";
import type { TravelEntry } from "./db.js";
import ExcelJS from "exceljs";
import { buildCsv, buildXlsx, uniqueVehicleRegistrations } from "./reports.js";
import type { PublicUser } from "./auth.js";

function entry(vehicle: string | null) {
  return { vehicle } as TravelEntry;
}

test("ATO report prints duplicate vehicle registrations only once", () => {
  const registrations = uniqueVehicleRegistrations([
    entry("ABC123"),
    entry(" abc123 "),
    entry("ABC-123"),
    entry("XYZ789"),
    entry("XYZ 789"),
    entry(null),
  ]);

  assert.deepEqual(registrations, ["ABC123", "XYZ789"]);
});

test("spreadsheet exports escape formula-like user content", async () => {
  const user = {
    id: "user-1",
    fullName: "=cmd",
    address: "+address",
    email: "user@example.com",
    tfn: "123456789",
    role: "user",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  } satisfies PublicUser;
  const report = {
    title: "@FridayRun",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    totalKilometres: 12,
    user,
    entries: [
      {
        date: "2026-01-02",
        startLocation: "-start",
        endLocation: "=end",
        kilometres: 12,
        roundTrip: false,
        vehicle: "+rego",
        notes: "@notes",
      } as TravelEntry,
    ],
  };

  const csv = (await buildCsv(report)).toString("utf8");
  assert.match(csv, /^'@FridayRun/m);
  assert.match(csv, /Full name,'=cmd/);
  assert.match(csv, /'-start,'=end/);
  assert.match(csv, /'\+rego,'@notes/);

  const workbook = new ExcelJS.Workbook();
  const xlsx = await buildXlsx(report);
  const workbookBytes = xlsx.buffer.slice(
    xlsx.byteOffset,
    xlsx.byteOffset + xlsx.byteLength,
  ) as ArrayBuffer;
  await workbook.xlsx.load(workbookBytes);
  const sheet = workbook.getWorksheet("Travel report");
  assert.equal(sheet?.getCell("A1").value, "'@FridayRun");
  assert.equal(sheet?.getCell("B3").value, "'=cmd");
  assert.equal(sheet?.getCell("B4").value, "'+address");
  assert.equal(sheet?.getCell("B9").value, "'-start");
  assert.equal(sheet?.getCell("C9").value, "'=end");
});
