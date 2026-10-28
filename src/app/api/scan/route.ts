import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getCard, getSets } from "@/lib/data";
import { primaryVariant, unitPrice, variantNames } from "@/lib/collection";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SCAN_URL = process.env.SCAN_URL ?? "http://192.168.178.20:8091";
const NO_STORE = { "Cache-Control": "no-store" } as const;

type ScanCandidate = {
  id?: number | string;
  name?: string;
  num?: string;
  set_id?: string | number;
  set_name?: string;
  img?: string;
};

type ScanCard = {
  index: number;
  box?: number[];
  det_conf?: number;
  ocr_number?: string | null;
  ocr_conf?: number;
  name_guess?: string | null;
  candidates?: ScanCandidate[];
};

/**
 * POST /api/scan — photo in, matched cards out.
 * The image is forwarded to the local scan service (detector + OCR + matcher);
 * candidates are then resolved against the catalogue so the client gets card
 * ids, variant names and a price it can add straight to the collection.
 */
export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("image");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "bad_form" }, { status: 400, headers: NO_STORE });
  }
  if (!file) {
    return NextResponse.json({ error: "no_image" }, { status: 400, headers: NO_STORE });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "too_large" }, { status: 413, headers: NO_STORE });
  }

  const upstream = new FormData();
  upstream.append("image", file, file.name || "scan.jpg");

  let payload: { cards?: ScanCard[]; elapsed_s?: number };
  try {
    const res = await fetch(`${SCAN_URL}/scan`, { method: "POST", body: upstream });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "scan_failed", status: res.status, detail: detail.slice(0, 300) },
        { status: 502, headers: NO_STORE },
      );
    }
    payload = (await res.json()) as { cards?: ScanCard[]; elapsed_s?: number };
  } catch (err) {
    return NextResponse.json(
      { error: "scan_unreachable", detail: String(err).slice(0, 200) },
      { status: 502, headers: NO_STORE },
    );
  }

  const sets = new Map(getSets().map((s) => [String(s.id), s.name]));
  const cards = (payload.cards ?? []).map((c) => {
    const resolved = (c.candidates ?? [])
      .map((cand) => {
        const id = Number(cand.id);
        const card = Number.isFinite(id) ? getCard(id) : null;
        return card ? { card, candidate: cand } : null;
      })
      .filter((v): v is { card: NonNullable<ReturnType<typeof getCard>>; candidate: ScanCandidate } => v !== null);

    const top = resolved[0];
    if (!top) {
      return {
        index: c.index,
        matched: false,
        ocr_number: c.ocr_number ?? null,
        name_guess: c.name_guess ?? null,
        confidence: c.det_conf ?? 0,
      };
    }
    const { card } = top;
    const variant = primaryVariant(card);
    return {
      index: c.index,
      matched: true,
      cardId: card.id,
      name: card.n,
      num: card.num,
      setId: card.set,
      setName: sets.get(String(card.set)) ?? top.candidate.set_name ?? "",
      img: card.img,
      variant,
      variants: variantNames(card),
      price: unitPrice(card, variant),
      ocr_number: c.ocr_number ?? null,
      confidence: c.det_conf ?? 0,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      cards,
      detected: cards.length,
      matched: cards.filter((c) => c.matched).length,
      elapsed_s: payload.elapsed_s ?? null,
    },
    { headers: NO_STORE },
  );
}
