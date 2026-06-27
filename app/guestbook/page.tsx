import { Redis } from "@upstash/redis";
import BackButton from "./BackButton";
import PolaroidWall from "./PolaroidWall";

const kv = new Redis({
  url: process.env.personalwebsite_KV_REST_API_URL!,
  token: process.env.personalwebsite_KV_REST_API_TOKEN!,
});

interface Entry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
}

export const revalidate = 60;

export default async function GuestbookPage() {
  const entries = await kv.lrange<Entry>("guestbook", 0, -1);

  return (
    <div className="min-h-screen bg-[#F8F7F3] px-8 py-12">
      <div className="flex items-baseline justify-between mb-16 max-w-5xl mx-auto">
        <h1 className="font-sans text-[13px] text-[#9C9890]">guest book</h1>
        <BackButton />
      </div>

      {entries.length === 0 ? (
        <p className="font-sans text-[22px] text-[#6b6560] text-center">nothing here yet.</p>
      ) : (
        <PolaroidWall entries={entries} />
      )}
    </div>
  );
}
