import { NextResponse } from "next/server";
import { getLatest } from "@/lib/store";
import { AGGREGATOR_API_URL } from "@/lib/aggregator";

export const dynamic = "force-dynamic";

export async function GET() {
  if (AGGREGATOR_API_URL) {
    const res = await fetch(`${AGGREGATOR_API_URL}/api/demand`, { cache: "no-store" });
    return NextResponse.json(await res.json(), { status: res.status });
  }
  return NextResponse.json(getLatest());
}
