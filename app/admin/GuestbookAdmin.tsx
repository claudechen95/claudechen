"use client";

import { useState } from "react";

interface Entry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
  ip?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

export default function GuestbookAdmin({ entries: initial, secret }: { entries: Entry[]; secret: string }) {
  const [entries, setEntries] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleting(id);
    await fetch("/api/guestbook", {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="font-sans text-[14px] text-[#C8C4BE]">no entries.</p>
      )}
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-4 items-start">
          {entry.imageUrl ? (
            <img src={entry.imageUrl} alt="" className="w-10 h-10 object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-[#D8D4CF] shrink-0 flex items-center justify-center">
              <span className="font-sans text-[13px] text-[#9C9890]">{entry.name[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-0.5">
              <span className="font-sans text-[13px] text-[#1B1B19]">{entry.name}</span>
              <span className="font-sans text-[11px] text-[#C8C4BE]">{formatDate(entry.date)}</span>
              {entry.ip && <span className="font-sans text-[10px] text-[#C8C4BE]">{entry.ip}</span>}
            </div>
            <p className="font-sans text-[13px] text-[#9C9890] leading-snug">{entry.message}</p>
          </div>
          <button
            onClick={() => remove(entry.id)}
            disabled={deleting === entry.id}
            className="font-sans text-[11px] text-[#C8C4BE] hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
          >
            {deleting === entry.id ? "…" : "×"}
          </button>
        </div>
      ))}
    </div>
  );
}
