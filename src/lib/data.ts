import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Card, SetInfo, Stats } from "./types";

/**
 * Data resolution order:
 *   1. POKEMON_DATA_DIR (explicit override)
 *   2. /app/data        (Coolify persistent volume — refreshed daily, no redeploy)
 *   3. public/data      (snapshot baked into the image, always present)
 */
const DIRS = [
  process.env.POKEMON_DATA_DIR,
  "/app/data",
  path.join(process.cwd(), "public", "data"),
].filter(Boolean) as string[];

export function resolveDataFile(file: string): string | null {
  for (const dir of DIRS) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readGzJson<T>(file: string): T | null {
  const p = resolveDataFile(file);
  if (!p) return null;
  try {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString("utf-8")) as T;
  } catch {
    return null;
  }
}

function readJson<T>(file: string): T | null {
  const p = resolveDataFile(file);
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

let cardsCache: Card[] | null = null;
let setsCache: SetInfo[] | null = null;
let statsCache: Stats | null = null;
let mapCache: Map<number, Card> | null = null;

export function getCards(): Card[] {
  if (!cardsCache) cardsCache = readGzJson<Card[]>("cards.json.gz") ?? [];
  return cardsCache;
}

export function getSets(): SetInfo[] {
  if (!setsCache) setsCache = readJson<SetInfo[]>("sets.json") ?? [];
  return setsCache;
}

export function getStats(): Stats | null {
  if (!statsCache) statsCache = readJson<Stats>("stats.json");
  return statsCache;
}

export function getCardMap(): Map<number, Card> {
  if (!mapCache) {
    mapCache = new Map();
    for (const c of getCards()) mapCache.set(c.id, c);
  }
  return mapCache;
}

export function getCard(id: number): Card | null {
  return getCardMap().get(id) ?? null;
}

export type History = { dates: string[]; series: Record<string, number[]> };

let historyCache: History | null = null;

export function getHistory(): History | null {
  if (!historyCache) historyCache = readGzJson<History>("history.json.gz");
  return historyCache;
}

/** Sum of the cheapest market price per card — used for set-level value. */
export function setValues(): Map<number, number> {
  const out = new Map<number, number>();
  for (const c of getCards()) {
    if (c.px == null) continue;
    out.set(c.set, (out.get(c.set) ?? 0) + c.px);
  }
  return out;
}
