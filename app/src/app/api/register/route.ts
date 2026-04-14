import { NextResponse } from "next/server";
import { registerFromGithub } from "@/lib/github";
import { ensureSeeded } from "@/lib/seed";
import { upsertAgent } from "@/lib/store";
import { MOCK_MODE } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  ensureSeeded();
  if (MOCK_MODE) {
    return NextResponse.json(
      { success: false, error: { message: "registration disabled in MOCK_MODE" } },
      { status: 403 },
    );
  }
  const body = (await req.json()) as { github_url?: string };
  if (!body.github_url) {
    return NextResponse.json(
      { success: false, error: { message: "github_url required" } },
      { status: 400 },
    );
  }
  try {
    const agent = await registerFromGithub(body.github_url);
    upsertAgent(agent);
    return NextResponse.json({ success: true, data: agent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "register failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
