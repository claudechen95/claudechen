import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import sharp from "sharp";

async function normalizeImage(file: File): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const isHeic = file.type === "image/heic" || file.type === "image/heif" || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
  if (isHeic) {
    const jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    return { buffer: jpeg, filename: file.name.replace(/\.hei[cf]$/i, ".jpg"), contentType: "image/jpeg" };
  }
  return { buffer, filename: file.name, contentType: file.type };
}

const kv = new Redis({
  url: process.env.personalwebsite_KV_REST_API_URL!,
  token: process.env.personalwebsite_KV_REST_API_TOKEN!,
});

export interface Entry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
  ip?: string;
}

export async function GET() {
  const entries = await kv.lrange<Entry>("guestbook", 0, -1);
  return Response.json(entries);
}

// Called when visitor submits name + message + photo together
export async function POST(req: Request) {
  const formData = await req.formData();
  const name = formData.get("name") as string;
  const message = formData.get("message") as string;
  const file = formData.get("image") as File | null;

  if (!name?.trim() || !message?.trim()) {
    return Response.json({ error: "Name and message required" }, { status: 400 });
  }
  let imageUrl: string | undefined;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }
    const { buffer, filename, contentType } = await normalizeImage(file);
    const blob = await put(`guestbook/${Date.now()}-${filename}`, buffer, {
      access: "private",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    imageUrl = `/api/guestbook/image?p=${encodeURIComponent(blob.url)}`;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? undefined;

  const entry: Entry = {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim(),
    message: message.trim(),
    date: new Date().toISOString(),
    ...(imageUrl ? { imageUrl } : {}),
    ...(ip ? { ip } : {}),
  };

  await kv.lpush("guestbook", entry);

  fetch("https://ntfy.sh/claudechen-guestbook", {
    method: "POST",
    headers: { "Title": `${entry.name} signed the guestbook`, "Priority": "default" },
    body: entry.message,
  }).catch(() => {});

  return Response.json(entry, { status: 201 });
}

// Delete one or more entries by id
export async function DELETE(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json() as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  const toRemove = new Set(ids);
  const entries = await kv.lrange<Entry>("guestbook", 0, -1);
  const kept = entries.filter((e) => !toRemove.has(e.id));

  await kv.del("guestbook");
  if (kept.length > 0) await kv.rpush("guestbook", ...kept);

  const removedCount = entries.length - kept.length;
  return Response.json({ removed: removedCount, notFound: ids.length - removedCount, kept: kept.length });
}

// Attach a photo to an existing entry
export async function PATCH(req: Request) {
  const formData = await req.formData();
  const id = formData.get("id") as string;
  const file = formData.get("image") as File;

  if (!id || !file || file.size === 0) {
    return Response.json({ error: "Missing id or image" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "Image too large (max 5MB)" }, { status: 400 });
  }

  const { buffer, filename, contentType } = await normalizeImage(file);
  const blob = await put(`guestbook/${Date.now()}-${filename}`, buffer, {
    access: "private",
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  const imageUrl = `/api/guestbook/image?p=${encodeURIComponent(blob.url)}`;

  // Find and update the entry in the list
  const entries = await kv.lrange<Entry>("guestbook", 0, -1);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return Response.json({ error: "Entry not found" }, { status: 404 });

  entries[idx] = { ...entries[idx], imageUrl };
  await kv.del("guestbook");
  if (entries.length > 0) await kv.rpush("guestbook", ...entries);

  return Response.json(entries[idx]);
}
