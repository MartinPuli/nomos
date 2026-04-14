import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { listTeams } from "@/lib/teams";

export async function GET() {
  ensureSeeded();
  return NextResponse.json({ success: true, data: listTeams() });
}
