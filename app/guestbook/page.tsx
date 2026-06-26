import { Redis } from "@upstash/redis";
import Link from "next/link";

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
    <div className="min-h-screen bg-[#F8F7F3] px-10 py-16">
      <div className="w-full max-w-[680px] mx-auto">
        <div className="flex items-baseline justify-between mb-16">
          <h1 className="font-sans text-[14px] text-[#9C9890]">guest book</h1>
          <Link href="/" className="font-sans text-[14px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors">
            ← back
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="font-sans text-[22px] text-[#1B1B19]">nothing here yet.</p>
        ) : (
          <div className="space-y-14">
            {entries.map((entry) => (
              <div key={entry.id}>
                <p className="font-sans text-[14px] text-[#9C9890] italic mb-2">
                  — {entry.name}
                  <span className="not-italic ml-3 text-[#C8C4BE]">
                    {new Date(entry.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
                <p className="font-sans text-[22px] leading-[1.75] text-[#1B1B19]">
                  {entry.message}
                </p>
                {entry.imageUrl && (
                  <img
                    src={entry.imageUrl}
                    alt=""
                    className="mt-6 w-full max-h-[400px] object-cover rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
