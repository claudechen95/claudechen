import { Redis } from "@upstash/redis";
import BackButton from "./BackButton";
import GlobeWrapper from "./GlobeWrapper";

const kv = new Redis({
  url: process.env.personalwebsite_KV_REST_API_URL!,
  token: process.env.personalwebsite_KV_REST_API_TOKEN!,
});

export interface GeoEntry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
  ip?: string;
  lat: number;
  lng: number;
  city: string;
}

interface StoredEntry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
  ip?: string;
}

async function geocodeIp(ip: string): Promise<{ lat: number; lng: number; city: string } | null> {
  const cacheKey = `geo:${ip}`;
  const cached = await kv.get<{ lat: number; lng: number; city: string }>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon,city`);
    const data = await res.json();
    if (data.status !== "success") return null;
    const geo = { lat: data.lat, lng: data.lon, city: data.city };
    await kv.set(cacheKey, geo, { ex: 60 * 60 * 24 * 7 });
    return geo;
  } catch {
    return null;
  }
}

export const revalidate = 60;

export default async function GuestbookPage() {
  const entries = await kv.lrange<StoredEntry>("guestbook", 0, -1);

  const geoEntries: GeoEntry[] = [];
  for (const entry of entries) {
    if (!entry.ip) continue;
    const geo = await geocodeIp(entry.ip);
    if (!geo) continue;
    geoEntries.push({ ...entry, ...geo });
  }

  return (
    <div className="relative h-screen bg-[#F8F7F3]">
      <div className="absolute inset-0">
        {geoEntries.length === 0 ? (
          <p className="font-sans text-[22px] text-[#4A5070] text-center mt-20">nothing here yet.</p>
        ) : (
          <GlobeWrapper entries={geoEntries} />
        )}
      </div>
      <div className="absolute top-0 left-0 right-0 px-8 pt-10 flex items-baseline justify-between pointer-events-none z-10">
        <h1 className="font-sans text-[13px] text-white/70">guest book</h1>
        <div className="pointer-events-auto">
          <BackButton />
        </div>
      </div>
    </div>
  );
}
