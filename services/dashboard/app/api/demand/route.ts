import { NextResponse } from "next/server";
import { getLatest } from "@/lib/store";
import { loadDemandFromApi } from "@/lib/loadFromApi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const cached = getLatest();
  if (Object.keys(cached).length > 0) {
    return NextResponse.json(cached);
  }
  const { latest } = await loadDemandFromApi();
  return NextResponse.json(latest);
}
