/**
 * Google Sign-In (OIDC ID-token verification) — server-only, no Google SDK.
 *
 * Copied from the proven gavelll.eu implementation: the browser gets a Google ID token (JWT) from
 * Google Identity Services and posts it here. We verify it ourselves:
 *   1. parse the JWT (header.payload.signature, base64url),
 *   2. fetch Google's public JWKS (oauth2/v3/certs), select the key by `kid`, build an RSA key from n+e,
 *   3. verify the RS256 signature with node:crypto,
 *   4. check iss, aud (our client id), exp, and email_verified.
 *
 * The JWKS is cached in memory with a TTL — it rotates rarely.
 */
import { verify as cryptoVerify, createPublicKey } from "node:crypto";

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const JWKS_TTL_MS = 60 * 60 * 1000; // 1h
const ALLOWED_ISS = new Set(["accounts.google.com", "https://accounts.google.com"]);

let jwksCache: { keys: { kid?: string; n?: string; e?: string }[]; at: number } | null = null;

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

async function fetchJwks(): Promise<{ kid?: string; n?: string; e?: string }[]> {
  if (jwksCache && Date.now() - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const r = await fetch(JWKS_URL, { cache: "no-store" });
  if (!r.ok) throw new Error(`google jwks ${r.status}`);
  const j = (await r.json()) as { keys: { kid?: string; n?: string; e?: string }[] };
  jwksCache = { keys: j.keys || [], at: Date.now() };
  return jwksCache.keys;
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

/**
 * Verify a Google ID token. Returns the verified identity, or throws with a descriptive Error.
 * Never trust a token that fails any of these checks.
 */
export async function verifyGoogleIdToken(token: string): Promise<GoogleIdentity> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad_jwt_shape");

  const [h, p, sig] = parts;
  let header: { kid?: string; alg?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64urlDecode(h).toString("utf8"));
    payload = JSON.parse(b64urlDecode(p).toString("utf8"));
  } catch {
    throw new Error("bad_jwt_json");
  }
  if (header.alg !== "RS256") throw new Error("bad_alg");

  const keys = await fetchJwks();
  const key = keys.find((k) => k.kid === header.kid);
  if (!key?.n || !key?.e) throw new Error("unknown_kid");

  const publicKey = createPublicKey({
    key: { kty: "RSA", n: key.n, e: key.e },
    format: "jwk",
  });

  const data = Buffer.from(`${h}.${p}`, "utf8");
  const signature = b64urlDecode(sig);
  const ok = cryptoVerify("RSA-SHA256", data, publicKey, signature);
  if (!ok) throw new Error("bad_signature");

  const iss = payload.iss as string | undefined;
  const aud = payload.aud as string | undefined;
  const exp = payload.exp as number | undefined;
  const email = (payload.email as string | undefined) || "";
  const emailVerified = payload.email_verified === true;

  if (!iss || !ALLOWED_ISS.has(iss)) throw new Error("bad_iss");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("google_not_configured");
  if (aud !== clientId) throw new Error("bad_aud");
  if (!exp || exp * 1000 <= Date.now()) throw new Error("token_expired");
  if (!email || !emailVerified) throw new Error("email_unverified");

  return {
    sub: String(payload.sub || ""),
    email,
    emailVerified,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}
