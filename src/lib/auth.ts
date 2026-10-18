/**
 * Account auth — email + password with scrypt hashing and HMAC-signed session cookies.
 *
 * Mirrors the proven gavelll.eu implementation (no auth dependency, no session table, nothing
 * native to compile), with two deliberate hardenings:
 *
 *   1. AUTH_SECRET is REQUIRED. gavelll falls back to a fixed derived key when the env var is
 *      missing; on a public site that would let anyone forge a session cookie for any user id, so
 *      a missing secret is a hard failure here instead of a silent downgrade.
 *   2. The session cookie is marked Secure when the request arrived over https (Traefik sets
 *      x-forwarded-proto), so production is https-only while local http QA still works.
 */
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getUser, type UserRecord } from "@/lib/accounts";

export const SESSION_COOKIE = "carddex_session";
export const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

const scrypt = promisify(_scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  throw new Error(
    "AUTH_SECRET is not set (or too short). Refusing to sign sessions with a predictable key — set AUTH_SECRET to a random 32+ byte value.",
  );
}

export function authConfigured(): boolean {
  const s = process.env.AUTH_SECRET;
  return Boolean(s && s.length >= 16);
}

/* ------------------------------------------------------------------- sessions */

export function signSession(userId: string, now = new Date()): string {
  const expiresAt = Math.floor(now.getTime() / 1000) + SESSION_DAYS * 24 * 3600;
  const payload = `${userId}.${expiresAt}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

/** Returns the userId, or null when the cookie is missing/expired/tampered. */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, mac] = parts;
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp)) return null;
  let expected: string;
  try {
    expected = createHmac("sha256", secret()).update(`${userId}.${expStr}`).digest("hex");
  } catch {
    return null;
  }
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (exp * 1000 <= Date.now()) return null;
  return userId;
}

export function sessionCookieValue(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return m?.[1];
}

export async function currentUser(req: Request): Promise<UserRecord | undefined> {
  const uid = verifySession(sessionCookieValue(req));
  if (!uid) return undefined;
  return getUser(uid);
}

/** True when the request reached us over https — checked via the proxy's x-forwarded-proto. */
export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieAttrs(req: Request, maxAge: number): string {
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${isSecureRequest(req) ? "; Secure" : ""}`;
}

export function withSessionCookie(
  res: Response,
  req: Request,
  userId: string,
  maxAge = SESSION_DAYS * 24 * 3600,
): Response {
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${signSession(userId)}; ${cookieAttrs(req, maxAge)}`,
  );
  return res;
}

export function withClearedSessionCookie(res: Response): Response {
  res.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  return res;
}

/* ------------------------------------------------------------------ passwords */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (![n, r, p].every(Number.isFinite)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const withOpts = promisify(_scrypt) as (
    password: string,
    salt: Buffer,
    keylen: number,
    opts: { N: number; r: number; p: number },
  ) => Promise<Buffer>;
  const actual = await withOpts(password, salt, expected.length, { N: n, r, p });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX;
}

/* ------------------------------------------------------- request-side guardrails */

/**
 * CSRF guard for state-changing routes: a browser sends Origin on every cross-site POST, so if an
 * Origin is present it must match our own host. Requests without Origin (curl, server-to-server)
 * pass — the session cookie is SameSite=Lax, so it is not attached to cross-site form posts anyway.
 */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  if (!origin) return true;
  try {
    const host = req.headers.get("host") || new URL(req.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

const buckets = new Map<string, { n: number; reset: number }>();

/** Small in-process limiter so a bot cannot grind passwords or mass-register accounts. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.n += 1;
  if (b.n > limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}
