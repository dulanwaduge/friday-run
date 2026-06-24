import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import os from "node:os";

process.env.DATABASE_URL = path.join(os.tmpdir(), `fridayrun-admin-reset-${Date.now()}.sqlite`);
process.env.TFN_ENCRYPTION_KEY = "admin-reset-test-encryption-key-with-32-characters";

test("super admin reset creates a login-ready super admin and can update the password", async () => {
  const { db } = await import("./db.js");
  const { findUserByEmail, verifyPassword } = await import("./auth.js");
  const { resetSuperAdmin } = await import("./resetAdmin.js");

  const first = resetSuperAdmin({
    fullName: "FridayRun Admin",
    address: "1 Admin Street",
    email: "admin@example.com",
    tfn: "000000000",
    password: "ResetAdmin123!"
  });

  assert.equal(first.passwordVerified, true);
  assert.equal(first.email, "admin@example.com");

  const user = findUserByEmail("admin@example.com");
  assert.ok(user);
  assert.equal(user.role, "super_admin");
  assert.equal(verifyPassword("ResetAdmin123!", user.password_hash), true);

  resetSuperAdmin({
    fullName: "FridayRun Admin",
    address: "1 Admin Street",
    email: "admin@example.com",
    tfn: "000000000",
    password: "AnotherReset123!"
  });

  const updated = findUserByEmail("admin@example.com");
  assert.ok(updated);
  assert.equal(verifyPassword("AnotherReset123!", updated.password_hash), true);
  assert.equal(verifyPassword("ResetAdmin123!", updated.password_hash), false);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("admin@example.com") as { count: number }).count, 1);
});
