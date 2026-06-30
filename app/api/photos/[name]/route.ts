import { readFile } from "fs/promises";
import path from "path";
import { PHOTO_FILENAMES } from "@/lib/photos";

const ALLOWED = new Set(PHOTO_FILENAMES);

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  if (!ALLOWED.has(name)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "private", "photos", name);

  try {
    const data = await readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
