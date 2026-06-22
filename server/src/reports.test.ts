import assert from "node:assert/strict";
import { test } from "node:test";
import type { TravelEntry } from "./db.js";
import { uniqueVehicleRegistrations } from "./reports.js";

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
    entry(null)
  ]);

  assert.deepEqual(registrations, ["ABC123", "XYZ789"]);
});
