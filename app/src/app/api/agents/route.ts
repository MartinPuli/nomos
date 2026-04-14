import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { listAgents } from "@/lib/store";

export async function GET() {
  ensureSeeded();
  return NextResponse.json({ success: true, data: listAgents() });
}
