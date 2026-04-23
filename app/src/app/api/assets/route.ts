import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { saveAsset, listAssets } from "@/lib/store";
import type { Asset, AssetCategory } from "@/lib/types";

const MIME_TO_CATEGORY: Record<string, AssetCategory> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/svg+xml": "image",
  "font/otf": "font",
  "font/ttf": "font",
  "font/woff": "font",
  "font/woff2": "font",
  "application/octet-stream": "font", // browsers often send OTF/TTF with this
  "application/json": "color",
  "text/css": "color",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "data",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/pdf": "document",
};

function inferCategory(mime: string, filename: string): AssetCategory {
  if (MIME_TO_CATEGORY[mime]) return MIME_TO_CATEGORY[mime];
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ["otf", "ttf", "woff", "woff2"].includes(ext)) return "font";
  if (ext === "xlsx") return "data";
  if (ext === "docx") return "document";
  if (ext === "pdf") return "document";
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext ?? "")) return "image";
  return "document";
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  return Response.json(listAssets(category));
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "no file" }, { status: 400 });

  const category = inferCategory(file.type, file.name);
  const blob = await put(`assets/${category}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const asset: Asset = {
    id: uuidv4(),
    name: file.name,
    category,
    mime_type: file.type,
    url: blob.url,
    size: file.size,
    uploaded_at: new Date().toISOString(),
    tags: [],
  };

  saveAsset(asset);
  return Response.json(asset, { status: 201 });
}
