import { NextResponse } from "next/server";
import { getSets, getStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sets: getSets(), stats: getStats() });
}
