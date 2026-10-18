/**
 * Account + collection storage — file-backed, server-only, no native deps.
 *
 * Mirrors the proven gavelll.eu store (atomic tmp+rename writes, serialised write chain) because it
 * has the same constraints: a Next.js server in a container with a mounted data dir, and adding a
 * native SQLite module would mean rebuilding the image with a compiler. The store is small by
 * design — a handful of accounts, one document per user's collection.
 *
 * Two files:
 *   <dir>/accounts.json        every account (email, scrypt hash, created/last seen)
 *   <dir>/collections/<id>.json one user's owned cards
 *
 * The daily catalogue refresh writes cards.json.gz / history.json.gz / stats.json into /app/data;
 * this store lives in /app/data/accounts so a refresh can never touch it.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

export interface UserRecord {
  id: string;
  email: string;
  /** scrypt-encoded: `scrypt$N$r$p$saltHex$hashHex`, or the marker "google:oauth" for Google-only accounts */
  passwordHash: string;
  /** display name from the Google profile, when we have one */
  name?: string;
  /** Google subject id, set once a Google sign-in is linked */
  googleSub?: string;
  createdAt: string;
  updatedAt?: string;
  /** last successful sign-in — handy when auditing who actually uses an account */
  lastLoginAt?: string;
}

interface AccountStore {
  users: Record<string, UserRecord>;
}

export interface CollectionItem {
  /** quantity owned — always >= 1, the item is deleted at 0 */
  q: number;
  /** when the card was first added */
  at: string;
  /** ISO date of the last quantity change */
  updatedAt?: string;
}

export interface CollectionDoc {
  items: Record<string, CollectionItem>;
  updatedAt?: string;
}

const EMPTY_ACCOUNTS: AccountStore = { users: {} };

/**
 * Concurrent writes must not clobber each other, and a rejected write must not poison the chain:
 * `chain.then(...)` on an already-rejected promise never runs its callback and hands every later
 * caller that same rejection, so the store would be permanently wedged. Swallow the failure here
 * (the caller still sees the error from its own write) and keep the chain alive.
 */
let accountsChain: Promise<void> = Promise.resolve();
const collectionChains = new Map<string, Promise<void>>();

function dataDir(): string {
  return process.env.CARDDEX_DATA_DIR || process.env.ACCOUNTS_DATA_DIR || "/app/data/accounts";
}

function accountsPath(): string {
  return path.join(dataDir(), "accounts.json");
}

function collectionPath(userId: string): string {
  return path.join(dataDir(), "collections", `${userId}.json`);
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value), "utf8");
  await fs.rename(tmp, file);
}

function queue<T>(chain: Promise<void>, run: () => Promise<T>): { chain: Promise<void>; done: Promise<T> } {
  const done = chain.then(run, run);
  return { chain: done.then(() => undefined, () => undefined), done };
}

/* ------------------------------------------------------------------ accounts */

export async function readAccounts(): Promise<AccountStore> {
  try {
    const raw = await fs.readFile(accountsPath(), "utf8");
    const parsed = JSON.parse(raw) as AccountStore;
    return { users: parsed.users || {} };
  } catch {
    return { ...EMPTY_ACCOUNTS, users: {} };
  }
}

export async function writeAccounts(store: AccountStore): Promise<void> {
  const next = queue(accountsChain, () => writeJsonAtomic(accountsPath(), store));
  accountsChain = next.chain;
  return next.done;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUser(id: string): Promise<UserRecord | undefined> {
  const store = await readAccounts();
  return store.users[id];
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const wanted = normalizeEmail(email);
  const store = await readAccounts();
  return Object.values(store.users).find((u) => normalizeEmail(u.email) === wanted);
}

export async function createUser(user: UserRecord): Promise<UserRecord> {
  const store = await readAccounts();
  const email = normalizeEmail(user.email);
  if (Object.values(store.users).some((u) => normalizeEmail(u.email) === email)) {
    throw new Error("email_taken");
  }
  const record: UserRecord = { ...user, email, createdAt: user.createdAt || new Date().toISOString() };
  store.users[record.id] = record;
  await writeAccounts(store);
  return record;
}

export async function updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | undefined> {
  const store = await readAccounts();
  const current = store.users[id];
  if (!current) return undefined;
  const next: UserRecord = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
  store.users[id] = next;
  await writeAccounts(store);
  return next;
}

/** Housekeeping view: who has an account and when they last signed in. */
export async function listUsers(): Promise<Pick<UserRecord, "id" | "email" | "name" | "createdAt" | "lastLoginAt">[]> {
  const store = await readAccounts();
  return Object.values(store.users).map(({ id, email, name, createdAt, lastLoginAt }) => ({
    id,
    email,
    name,
    createdAt,
    lastLoginAt,
  }));
}

/* --------------------------------------------------------------- collections */

export async function readCollection(userId: string): Promise<CollectionDoc> {
  try {
    const raw = await fs.readFile(collectionPath(userId), "utf8");
    const parsed = JSON.parse(raw) as CollectionDoc;
    return { items: parsed.items || {}, updatedAt: parsed.updatedAt };
  } catch {
    return { items: {} };
  }
}

export async function writeCollection(userId: string, doc: CollectionDoc): Promise<void> {
  const prev = collectionChains.get(userId) ?? Promise.resolve();
  const next = queue(prev, () => writeJsonAtomic(collectionPath(userId), doc));
  collectionChains.set(userId, next.chain);
  return next.done;
}

/** Read-modify-write under the per-user write chain, so two rapid clicks cannot lose a change. */
export async function mutateCollection(
  userId: string,
  fn: (doc: CollectionDoc) => CollectionDoc | null,
): Promise<CollectionDoc> {
  const prev = collectionChains.get(userId) ?? Promise.resolve();
  const done = prev.then(async () => {
    const doc = await readCollection(userId);
    const next = fn(doc);
    if (!next) return doc;
    next.updatedAt = new Date().toISOString();
    await writeJsonAtomic(collectionPath(userId), next);
    return next;
  });
  const chain = done.then(() => undefined, () => undefined);
  collectionChains.set(userId, chain);
  return done;
}
