import { NextResponse } from "next/server";
import { getLatest } from "@/lib/store";
import { AGGREGATOR_API_URL } from "@/lib/aggregator";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ region: string }> }
) {
  const { region: rawRegion } = await params;
  const region = rawRegion.toUpperCase();

  if (AGGREGATOR_API_URL) {
    const res = await fetch(`${AGGREGATOR_API_URL}/api/demand/${region}`, { cache: "no-store" });
    return NextResponse.json(await res.json(), { status: res.status });
  }

  const latest = getLatest();
  if (!latest[region]) {
    return NextResponse.json({ error: `No data for region: ${region}` }, { status: 404 });
  }
  return NextResponse.json(latest[region]);
}
