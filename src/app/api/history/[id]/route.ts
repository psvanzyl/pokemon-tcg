import { NextResponse } from "next/server";
import { getHistory } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const hist = getHistory();
  if (!hist) return NextResponse.json({ dates: [], values: [] });
  const values = hist.series?.[id] ?? [];
  return NextResponse.json(
    { dates: hist.dates.slice(0, values.length), values },
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
