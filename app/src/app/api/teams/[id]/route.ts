import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { getTeam, teamMembers } from "@/lib/teams";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSeeded();
  const { id } = await params;
  const team = getTeam(id);
  if (!team) {
    return NextResponse.json(
      { success: false, error: { message: "team not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    data: { team, members: teamMembers(team) },
  });
}
