import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import os from "node:os";

process.env.DATABASE_URL = path.join(os.tmpdir(), `fridayrun-stage-one-${Date.now()}.sqlite`);
process.env.TFN_ENCRYPTION_KEY = "stage-one-test-encryption-key-with-32-characters";

test("destinations remain user scoped and deduction estimates apply the 5,000 km cap", async () => {
  const { db } = await import("./db.js");
  const { createEntry } = await import("./repository.js");
  const { createDestination, deductionSummary, listDestinations } = await import("./stageOne.js");
  const user = db.prepare("SELECT id FROM users LIMIT 1").get() as { id: string };

  createDestination(user.id, { nickname: "Office", address: "1 Work Street, Melbourne VIC", category: "office" });
  assert.equal(listDestinations(user.id).length, 1);
  assert.equal(listDestinations("not-the-owner").length, 0);

  createEntry(user.id, {
    date: "2026-01-10",
    startLocation: "A",
    endLocation: "B",
    kilometres: 6000,
    distanceSource: "manual",
    tripCategory: "work"
  });
  createEntry(user.id, {
    date: "2026-01-11",
    startLocation: "Home",
    endLocation: "Office",
    kilometres: 50,
    distanceSource: "manual",
    tripCategory: "commute"
  });
  createEntry(user.id, {
    date: "2026-01-12",
    startLocation: "B",
    endLocation: "C",
    kilometres: 1000,
    distanceSource: "manual",
    vehicle: "Second car",
    tripCategory: "client_visit"
  });
  const summary = deductionSummary(user.id, "2025-26", 0.30);
  assert.equal(summary.totalWorkKilometres, 7000);
  assert.equal(summary.eligibleKilometres, 6000);
  assert.equal(summary.estimatedDeduction, 5280);
});
