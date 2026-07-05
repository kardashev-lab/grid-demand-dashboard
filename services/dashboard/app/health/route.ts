// Lightweight path for platform probes (Railway). Kept off /api/* so it's cheap
// and independent of the poller's success/failure -- matches the old Express contract.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function health() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}

export async function GET() {
  return health();
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
