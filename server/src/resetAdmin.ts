import { db, databasePath } from "./db.js";
import { encryptTfn, hashPassword, verifyPassword } from "./security.js";

type ResetOptions = {
  fullName: string;
  address: string;
  email: string;
  tfn: string;
  password: string;
};

function readArg(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function optionsFromEnvironment(): ResetOptions {
  return {
    fullName: readArg("full-name") ?? process.env.SUPER_ADMIN_FULL_NAME ?? "FridayRun Admin",
    address: readArg("address") ?? process.env.SUPER_ADMIN_ADDRESS ?? "Update this address",
    email: (readArg("email") ?? process.env.SUPER_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase(),
    tfn: readArg("tfn") ?? process.env.SUPER_ADMIN_TFN ?? "000000000",
    password: readArg("password") ?? process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!"
  };
}

function assertValidOptions(options: ResetOptions) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
    throw new Error("Admin email must be a valid email address.");
  }
  if (!/^\d{8,9}$/.test(options.tfn)) {
    throw new Error("Admin TFN must be 8 or 9 digits.");
  }
  if (options.password.length < 12) {
    throw new Error("Admin password must be at least 12 characters.");
  }
}

export function resetSuperAdmin(options = optionsFromEnvironment()) {
  assertValidOptions(options);

  const passwordHash = hashPassword(options.password);
  const existingByEmail = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(options.email) as { id: string } | undefined;
  const existingSuperAdmin = existingByEmail
    ? null
    : db.prepare("SELECT id FROM users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1").get() as { id: string } | undefined;
  const existing = existingByEmail ?? existingSuperAdmin;

  db.transaction(() => {
    db.prepare("DELETE FROM sessions").run();

    if (existing) {
      db.prepare(
        `UPDATE users
         SET full_name = @fullName,
             address = @address,
             email = @email,
             tfn = @tfn,
             password_hash = @passwordHash,
             role = 'super_admin',
             updated_at = datetime('now')
         WHERE id = @id`
      ).run({
        id: existing.id,
        fullName: options.fullName,
        address: options.address,
        email: options.email,
        tfn: encryptTfn(options.tfn),
        passwordHash
      });
      return;
    }

    db.prepare(
      `INSERT INTO users (id, full_name, address, email, tfn, password_hash, role)
       VALUES (lower(hex(randomblob(16))), @fullName, @address, @email, @tfn, @passwordHash, 'super_admin')`
    ).run({
      fullName: options.fullName,
      address: options.address,
      email: options.email,
      tfn: encryptTfn(options.tfn),
      passwordHash
    });
  })();

  const row = db.prepare("SELECT email, role, password_hash FROM users WHERE lower(email) = lower(?)").get(options.email) as
    | { email: string; role: string; password_hash: string }
    | undefined;

  if (!row || !verifyPassword(options.password, row.password_hash)) {
    throw new Error("Admin reset failed: saved password hash did not verify.");
  }

  return {
    databasePath,
    email: row.email,
    role: row.role,
    passwordVerified: true,
    userCount: (db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = resetSuperAdmin();
    console.log("FridayRun super admin reset complete.");
    console.log(`Database: ${result.databasePath}`);
    console.log(`Email: ${result.email}`);
    console.log(`Role: ${result.role}`);
    console.log(`Password verified: ${result.passwordVerified ? "yes" : "no"}`);
    console.log(`Users in database: ${result.userCount}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
