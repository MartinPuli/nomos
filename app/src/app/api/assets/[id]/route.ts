import { del } from "@vercel/blob";
import { NextRequest } from "next/server";
import { getAsset, deleteAsset } from "@/lib/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = getAsset(id);
  if (!asset) return Response.json({ error: "not found" }, { status: 404 });

  await del(asset.url);
  deleteAsset(id);
  return new Response(null, { status: 204 });
}
