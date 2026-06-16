import crypto from "node:crypto";
import { addDays, isBefore, parseISO } from "date-fns";
import type { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "./db.js";
import { decryptTfn, encryptTfn, hashPassword, verifyPassword } from "./security.js";

export { verifyPassword };

export type UserRole = "user" | "super_admin";

export type UserRow = {
  id: string;
  full_name: string;
  address: string;
  email: string;
  tfn: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  fullName: string;
  address: string;
  email: string;
  tfn: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedRequest = Request & {
  user?: PublicUser;
};

const tfnSchema = z
  .string()
  .trim()
  .regex(/^\d{8,9}$/, "TFN must be 8 or 9 digits");

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  tfn: tfnSchema
});

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .refine((value) => /[a-z]/.test(value), "Password must include a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Password must include an uppercase letter")
  .refine((value) => /\d/.test(value), "Password must include a number")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Password must include a symbol");

export const signupSchema = profileSchema.extend({
  password: passwordSchema
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

export const adminUpdateUserSchema = profileSchema.extend({
  role: z.enum(["user", "super_admin"])
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    fullName: row.full_name,
    address: row.address,
    email: row.email,
    tfn: decryptTfn(row.tfn),
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function findUserByEmail(email: string) {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;
  return row ?? null;
}

export function findUserById(id: string) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ?? null;
}

export function createUser(payload: z.infer<typeof signupSchema>, role: UserRole = "user") {
  const existing = findUserByEmail(payload.email);
  if (existing) {
    throw new Error("An account already exists for this email address");
  }
  const id = nanoid();
  db.prepare(
    `INSERT INTO users (id, full_name, address, email, tfn, password_hash, role)
     VALUES (@id, @fullName, @address, @email, @tfn, @passwordHash, @role)`
  ).run({
    id,
    ...payload,
    tfn: encryptTfn(payload.tfn),
    passwordHash: hashPassword(payload.password),
    role
  });
  return toPublicUser(findUserById(id)!);
}

export function updateUserProfile(id: string, payload: z.infer<typeof profileSchema> & { role?: UserRole }) {
  const existing = findUserByEmail(payload.email);
  if (existing && existing.id !== id) {
    throw new Error("An account already exists for this email address");
  }
  const roleSql = payload.role ? ", role = @role" : "";
  const result = db
    .prepare(
      `UPDATE users SET
        full_name = @fullName,
        address = @address,
        email = @email,
        tfn = @tfn,
        updated_at = datetime('now')
        ${roleSql}
      WHERE id = @id`
    )
    .run({ id, ...payload, tfn: encryptTfn(payload.tfn) });
  return result.changes ? toPublicUser(findUserById(id)!) : null;
}

export function updatePassword(id: string, password: string) {
  db.prepare("UPDATE users SET password_hash = @passwordHash, updated_at = datetime('now') WHERE id = @id").run({
    id,
    passwordHash: hashPassword(password)
  });
}

export function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = addDays(new Date(), 14).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    expiresAt
  );
  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt?: string) {
  return {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt ? parseISO(expiresAt) : undefined
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: string) {
  res.cookie("fridayrun_session", token, sessionCookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie("fridayrun_session", { ...sessionCookieOptions(), expires: undefined });
}

function cookieValue(req: Request, name: string) {
  const cookie = req.header("cookie");
  if (!cookie) return null;
  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function sessionTokenFromRequest(req: Request) {
  const auth = req.header("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  return bearer ?? cookieValue(req, "fridayrun_session");
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function userForToken(token: string) {
  const row = db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = @tokenHash`
    )
    .get({ tokenHash: hashToken(token) }) as UserRow | undefined;
  const session = db
    .prepare("SELECT expires_at as expiresAt FROM sessions WHERE token_hash = ?")
    .get(hashToken(token)) as { expiresAt: string } | undefined;
  if (!row || !session) return null;
  if (isBefore(parseISO(session.expiresAt), new Date())) {
    deleteSession(token);
    return null;
  }
  return toPublicUser(row);
}

export function listUsers() {
  return (db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as UserRow[]).map(toPublicUser);
}

export function deleteUser(id: string) {
  return db.prepare("DELETE FROM users WHERE id = ? AND role != 'super_admin'").run(id).changes > 0;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = sessionTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = userForToken(token);
  if (!user) {
    res.status(401).json({ error: "Session expired" });
    return;
  }
  req.user = user;
  next();
}

export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}
