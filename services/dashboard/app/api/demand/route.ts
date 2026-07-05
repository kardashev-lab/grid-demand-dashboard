import { NextResponse } from "next/server";
import { getLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getLatest());
}
