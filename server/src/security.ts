import crypto from "node:crypto";

const TFN_PREFIX = "enc:v1:";

function keyFromEnv() {
  const configured =
    process.env.TFN_ENCRYPTION_KEY ??
    process.env.SESSION_SECRET ??
    "fridayrun-development-only-secret";
  if (/^[a-f0-9]{64}$/i.test(configured)) {
    return Buffer.from(configured, "hex");
  }
  try {
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // Fall through to a deterministic hash for local development.
  }
  return crypto.createHash("sha256").update(configured).digest();
}

export function isEncryptedTfn(value: string) {
  return value.startsWith(TFN_PREFIX);
}

export function encryptTfn(value: string) {
  if (isEncryptedTfn(value)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromEnv(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${TFN_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTfn(value: string) {
  if (!isEncryptedTfn(value)) return value;
  const payload = value.slice(TFN_PREFIX.length);
  const [ivText, tagText, encryptedText] = payload.split(".");
  if (!ivText || !tagText || !encryptedText) return "";
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyFromEnv(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(key, "hex");
  return (
    stored.length === derived.length && crypto.timingSafeEqual(stored, derived)
  );
}
