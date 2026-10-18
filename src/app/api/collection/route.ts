import { NextResponse } from "next/server";
import { getStats } from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { readCollection } from "@/lib/accounts";
import {
  addToCollection,
  buildCollection,
  checkItem,
  parseItemKey,
  removeFromCollection,
  setCollectionQty,
  type SortKey,
} from "@/lib/collection";

export const dynamic = "force-dynamic";

const SORTS = new Set<SortKey>(["value", "value-asc", "name", "set", "recent"]);

const NO_STORE = { "Cache-Control": "no-store" } as const;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
}

/**
 * GET  /api/collection                 — totals + one page of owned rows (?q=&sort=&offset=&limit=)
 * GET  /api/collection?cardId=123      — just that card's owned variants (used by the card page)
 */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const cardId = url.searchParams.get("cardId");

  if (cardId) {
    const doc = await readCollection(user.id);
    const items = Object.entries(doc.items)
      .map(([key, item]) => ({ ...parseItemKey(key), qty: item.q }))
      .filter((i) => i.cardId === Number(cardId));
    return NextResponse.json({ authenticated: true, items }, { headers: NO_STORE });
  }

  const sortParam = (url.searchParams.get("sort") ?? "value") as SortKey;
  const view = await buildCollection(user.id, {
    q: url.searchParams.get("q") ?? "",
    sort: SORTS.has(sortParam) ? sortParam : "value",
    offset: Number(url.searchParams.get("offset") ?? 0) || 0,
    limit: Number(url.searchParams.get("limit") ?? 200) || 200,
  });

  return NextResponse.json(
    {
      authenticated: true,
      totals: { ...view.totals, snapshot: getStats()?.snapshot ?? null },
      lines: view.lines,
      matchedCount: view.matchedCount,
    },
    { headers: NO_STORE },
  );
}

/**
 * POST /api/collection — add or set a quantity.
 *   { cardId, variant, mode: "add" | "set", qty }
 */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return unauthorized();

  let body: { cardId?: unknown; variant?: unknown; qty?: unknown; mode?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const cardId = Number(body.cardId);
  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: "bad_card_id" }, { status: 400 });
  }
  const variant = String(body.variant ?? "").slice(0, 64);
  const qty = Number(body.qty ?? 1);
  const mode = body.mode === "set" ? "set" : "add";

  const valid = checkItem(cardId, variant);
  if (!valid.ok) {
    return NextResponse.json(
      { error: valid.error, variants: valid.variants ?? [] },
      { status: 400, headers: NO_STORE },
    );
  }

  const doc =
    mode === "set"
      ? await setCollectionQty(user.id, cardId, variant, qty)
      : await addToCollection(user.id, cardId, variant, qty);

  const key = `${cardId}|${variant}`;
  return NextResponse.json(
    { ok: true, cardId, variant, qty: doc.items[key]?.q ?? 0 },
    { headers: NO_STORE },
  );
}

/** DELETE /api/collection?cardId=123&variant=Holofoil */
export async function DELETE(req: Request) {
  const user = await currentUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const cardId = Number(url.searchParams.get("cardId"));
  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: "bad_card_id" }, { status: 400 });
  }
  const variant = url.searchParams.get("variant") ?? "";
  const valid = checkItem(cardId, variant);
  if (!valid.ok) {
    return NextResponse.json(
      { error: valid.error, variants: valid.variants ?? [] },
      { status: 400, headers: NO_STORE },
    );
  }
  await removeFromCollection(user.id, cardId, variant);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
