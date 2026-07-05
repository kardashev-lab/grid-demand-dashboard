import { NextResponse } from "next/server";
import { getLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ region: string }> }
) {
  const { region: rawRegion } = await params;
  const region = rawRegion.toUpperCase();
  const latest = getLatest();
  if (!latest[region]) {
    return NextResponse.json({ error: `No data for region: ${region}` }, { status: 404 });
  }
  return NextResponse.json(latest[region]);
}
