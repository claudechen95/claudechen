import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";

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
}

export async function GET() {
  const entries = await kv.lrange<Entry>("guestbook", 0, -1);
  return Response.json(entries);
}

// Bot calls this after collecting name + message through conversation
export async function POST(req: Request) {
  const { name, message } = await req.json();

  if (!name?.trim() || !message?.trim()) {
    return Response.json({ error: "Name and message required" }, { status: 400 });
  }

  const entry: Entry = {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim(),
    message: message.trim(),
    date: new Date().toISOString(),
  };

  await kv.lpush("guestbook", entry);
  return Response.json(entry, { status: 201 });
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

  const blob = await put(`guestbook/${Date.now()}-${file.name}`, file, {
    access: "private",
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
