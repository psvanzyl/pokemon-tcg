/**
 * Password-reset tokens: 32 random bytes, server-side record, 30-minute TTL, single use.
 *
 * Mirrors the proven Broomy email-token store. Lives NEXT TO accounts.json (outside the
 * Next build output — `next build` regenerates .next and would wipe anything kept there),
 * prunes expired/used entries on every write, and writes the file with mode 0600.
 *
 * GET handlers must only ever peek; a mail client prefetching the link would otherwise
 * burn the token before the user clicks it. Only the POST that changes the password
 * consumes.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

interface ResetRecord {
  email: string;
  expiresAt: string;
  used: boolean;
}

interface ResetStore {
  tokens: Record<string, ResetRecord>;
}

let chain: Promise<void> = Promise.resolve();

function dataDir(): string {
  return process.env.CARDDEX_DATA_DIR || process.env.ACCOUNTS_DATA_DIR || "/app/data/accounts";
}

function tokensPath(): string {
  return path.join(dataDir(), "password-reset-tokens.json");
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true, mode: 0o775 }).catch(() => {});
}

async function readStore(): Promise<ResetStore> {
  await ensureDir();
  let raw: string;
  try {
    raw = await fs.readFile(tokensPath(), "utf8");
  } catch (e) {
    if ((e as { code?: string })?.code === "ENOENT") return { tokens: {} };
    throw e;
  }
  try {
    const parsed = JSON.parse(raw) as ResetStore;
    return { tokens: parsed.tokens || {} };
  } catch {
    return { tokens: {} };
  }
}

async function writeStore(store: ResetStore): Promise<void> {
  await ensureDir();
  const tmp = `${tokensPath()}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store), { encoding: "utf8", mode: 0o600 });
  await fs.chmod(tmp, 0o600).catch(() => {});
  await fs.rename(tmp, tokensPath());
}

function prune(store: ResetStore): ResetStore {
  const now = Date.now();
  const tokens: Record<string, ResetRecord> = {};
  for (const [k, v] of Object.entries(store.tokens)) {
    if (!v.used && new Date(v.expiresAt).getTime() > now) tokens[k] = v;
  }
  return { tokens };
}

export async function createResetToken(email: string, ttlMinutes = 30): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const prev = chain;
  const done = prev.then(async () => {
    const store = prune(await readStore());
    store.tokens[token] = { email, expiresAt, used: false };
    await writeStore(store);
    return token;
  });
  chain = done.then(() => undefined, () => undefined);
  return done;
}

/** Read-only check: exists, not used, not expired. Does NOT consume (prefetch-safe). */
export async function peekResetToken(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  const store = await readStore();
  const rec = store.tokens[token];
  if (!rec || rec.used) return null;
  if (new Date(rec.expiresAt).getTime() <= Date.now()) return null;
  return rec.email;
}

export async function consumeResetToken(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  const prev = chain;
  const done = prev.then(async () => {
    const store = await readStore();
    const rec = store.tokens[token];
    if (!rec || rec.used) return null;
    if (new Date(rec.expiresAt).getTime() <= Date.now()) return null;
    rec.used = true;
    store.tokens[token] = rec;
    await writeStore(store);
    return rec.email;
  });
  chain = done.then(() => undefined, () => undefined);
  return done;
}
