import { NextResponse } from "next/server";
import { classify } from "@/lib/classifier";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json()) as { description?: string };
  if (!body.description) {
    return NextResponse.json(
      { success: false, error: { message: "description required" } },
      { status: 400 },
    );
  }
  try {
    const classification = await classify(body.description);
    return NextResponse.json({ success: true, data: classification });
  } catch (e) {
    const message = e instanceof Error ? e.message : "classify failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
