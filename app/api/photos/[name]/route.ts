import { readFile } from "fs/promises";
import path from "path";

const ALLOWED = new Set([
  "paris-love-wall.jpg",
  "murder-mystery.jpg",
  "iceland-waterfall.jpg",
  "iceland-beach.jpg",
  "puppies-yoga.jpg",
  "bar-friends.jpg",
  "sunset-dinner.jpg",
  "sculpting_photo.jpg",
  "pyramids.jpg",
  "dog.jpg",
  "ram-in-glacier-national-park.jpeg",
  "jellyfish.jpg",
  "flying-fish-hawaii.jpg",
]);

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
