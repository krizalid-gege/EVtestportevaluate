import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "ev-cpo-jwt-secret-key-malaysia-phase1a-2026";

/**
 * Hashes a plain-text password using Node's built-in scrypt (REQ section 13.1: mature password hash)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

/**
 * Verifies a plain-text password against a stored scrypt hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith("scrypt:")) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;
  const [, salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, "hex");
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export interface SessionTokenPayload {
  userId: string;
  email: string;
  roles: string[];
  status: string;
  siteIds: string[];
  exp: number;
}

/**
 * Signs a compact HMAC-SHA256 JWT token
 */
export function signSessionToken(
  payload: Omit<SessionTokenPayload, "exp">,
  expiresInSeconds = 60 * 60 * 24 * 7
): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const fullPayload: SessionTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 JWT token
 */
export function verifySessionToken(token?: string | null): SessionTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  if (signature !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionTokenPayload;
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
