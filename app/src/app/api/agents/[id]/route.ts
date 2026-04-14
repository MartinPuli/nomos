import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { getAgent } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSeeded();
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: { message: "agent not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: agent });
}
