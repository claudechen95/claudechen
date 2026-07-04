import { Redis } from "@upstash/redis";
import { notFound } from "next/navigation";
import GuestbookAdmin from "./GuestbookAdmin";

const kv = new Redis({
  url: process.env.personalwebsite_KV_REST_API_URL!,
  token: process.env.personalwebsite_KV_REST_API_TOKEN!,
});

interface SavedConv {
  sessionId: string;
  visitorName: string | null;
  messages: Array<{ role: string; content: string }>;
  updatedAt: string;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  ua?: string | null;
}

function parseUA(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("Chrome/")
    ? "Chrome"
    : ua.includes("Firefox/")
    ? "Firefox"
    : ua.includes("Safari/")
    ? "Safari"
    : null;
  const os = ua.includes("iPhone")
    ? "iPhone"
    : ua.includes("iPad")
    ? "iPad"
    : ua.includes("Android")
    ? "Android"
    : ua.includes("Mac OS X")
    ? "Mac"
    : ua.includes("Windows")
    ? "Windows"
    : ua.includes("Linux")
    ? "Linux"
    : null;
  return [os, browser].filter(Boolean).join(" · ") || null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  if (secret !== process.env.ADMIN_SECRET) return notFound();

  const [ids, guestbookEntries] = await Promise.all([
    kv.zrange<string[]>("conv_index", 0, -1).then((r) => r.reverse()),
    kv.lrange<{ id: string; name: string; message: string; date: string; imageUrl?: string; ip?: string }>("guestbook", 0, -1),
  ]);
  const convs = (
    await Promise.all(ids.slice(0, 100).map((id) => kv.get<SavedConv>(`conv:${id}`)))
  ).filter(Boolean) as SavedConv[];

  return (
    <div className="min-h-screen bg-[#F8F7F3] px-8 py-12">
      <div className="max-w-2xl mx-auto">
        <p className="font-sans text-[13px] text-[#9C9890] mb-8">
          guestbook — {guestbookEntries.length}
        </p>
        <div className="mb-20">
          <GuestbookAdmin entries={guestbookEntries} secret={secret ?? ""} />
        </div>

        <p className="font-sans text-[13px] text-[#9C9890] mb-16">
          conversations — {convs.length}
        </p>

        <div className="space-y-16">
          {convs.map((conv) => {
            const visible = conv.messages.filter(
              (m) => !m.content.startsWith("\x00") && m.content.trim()
            );
            const userMsgCount = visible.filter((m) => m.role === "user").length;
            const location = [conv.city ? decodeURIComponent(conv.city) : null, conv.country].filter(Boolean).join(", ");
            const device = parseUA(conv.ua);
            return (
              <div key={conv.sessionId}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-5">
                  <span className="font-sans text-[11px] text-[#C8C4BE]">
                    {formatDate(conv.updatedAt)}
                  </span>
                  {conv.visitorName && (
                    <span className="font-sans text-[11px] text-[#1B1B19]">
                      {conv.visitorName}
                    </span>
                  )}
                  {location && (
                    <span className="font-sans text-[11px] text-[#9C9890]">
                      {location}
                    </span>
                  )}
                  {device && (
                    <span className="font-sans text-[11px] text-[#9C9890]">
                      {device}
                    </span>
                  )}
                  <span className="font-sans text-[11px] text-[#C8C4BE]">
                    {userMsgCount}q
                  </span>
                  <span className="font-sans text-[11px] text-[#C8C4BE]">
                    {conv.sessionId}
                  </span>
                </div>

                <div className="space-y-3">
                  {visible.map((msg, i) =>
                    msg.role === "user" ? (
                      <p key={i} className="font-sans text-[13px] text-[#9C9890] italic">
                        — {msg.content}
                      </p>
                    ) : (
                      <p key={i} className="font-sans text-[14px] text-[#1B1B19] leading-relaxed">
                        {msg.content}
                      </p>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {convs.length === 0 && (
            <p className="font-sans text-[14px] text-[#C8C4BE]">nothing yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
