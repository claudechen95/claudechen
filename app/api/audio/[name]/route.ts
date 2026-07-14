import { readFile } from "fs/promises";
import path from "path";
import { AUDIO_FILENAMES } from "@/lib/audio";

const ALLOWED = new Set(AUDIO_FILENAMES);

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  if (!ALLOWED.has(name)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "private", "audio", name);
  const contentType = CONTENT_TYPES[path.extname(name).toLowerCase()] ?? "audio/mpeg";

  try {
    const data = await readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
