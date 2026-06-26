export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const p = searchParams.get("p");
  if (!p) return new Response("Not found", { status: 404 });

  // p is either a full blob URL (new entries) or a pathname (old entries)
  let blobUrl: string;
  if (p.startsWith("https://")) {
    blobUrl = p;
  } else {
    const storeId = (process.env.BLOB_STORE_ID ?? "").replace("store_", "").toLowerCase();
    blobUrl = `https://${storeId}.private.blob.vercel-storage.com/${p}`;
  }

  const upstream = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!upstream.ok) return new Response("Not found", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
