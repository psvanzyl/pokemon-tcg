import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { applyImport, matchImportText } from "@/lib/collection";
import { jsonRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

const MAX_CHARS = 200_000;
const MAX_ROWS = 5000;

/**
 * POST /api/collection/import
 *   { text: "..." }                                  -> preview (nothing is written)
 *   { apply: [{ cardId, variant, qty }, ...] }       -> write the previewed rows
 *
 * The preview is the contract: the client shows matched/ambiguous/unmatched and only sends back the
 * matched rows it displayed. The server re-validates every card id and variant before writing.
 */
const handler_POST = async (req: Request) => {
  const user = await currentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { text?: unknown; apply?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (Array.isArray(body.apply)) {
    const rows = (body.apply as unknown[])
      .slice(0, MAX_ROWS)
      .map((r) => {
        const o = (r ?? {}) as { cardId?: unknown; variant?: unknown; qty?: unknown };
        return { cardId: Number(o.cardId), variant: String(o.variant ?? ""), qty: Number(o.qty ?? 1) };
      })
      .filter((r) => Number.isFinite(r.cardId));
    const result = await applyImport(user.id, rows);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  }

  const text = String(body.text ?? "");
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: "too_large", message: `Keep an import under ${MAX_CHARS.toLocaleString("en-US")} characters.` },
      { status: 413 },
    );
  }

  const report = matchImportText(text);
  return NextResponse.json({ ok: true, preview: true, ...report }, { headers: { "Cache-Control": "no-store" } });
};

export const POST = jsonRoute("collection-import", { POST: handler_POST });
