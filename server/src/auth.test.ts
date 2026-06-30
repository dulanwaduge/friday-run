import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

process.env.DATABASE_URL = path.join(
  os.tmpdir(),
  `fridayrun-auth-${Date.now()}.sqlite`,
);
process.env.TFN_ENCRYPTION_KEY =
  "auth-test-encryption-key-with-32-characters";

test("deleting user sessions invalidates existing session tokens", async () => {
  const { db } = await import("./db.js");
  const { createSession, deleteUserSessions, userForToken } = await import(
    "./auth.js"
  );
  const user = db.prepare("SELECT id FROM users LIMIT 1").get() as {
    id: string;
  };
  const session = createSession(user.id);

  assert.ok(userForToken(session.token));
  deleteUserSessions(user.id);
  assert.equal(userForToken(session.token), null);
});
