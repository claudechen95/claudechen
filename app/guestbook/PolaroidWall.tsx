"use client";

import { useState, useEffect, useRef } from "react";

interface Entry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
}

const LIMIT = 4 * 1024 * 1024;

async function compressToLimit(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const tryQuality = (q: number) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size <= LIMIT || q <= 0.3) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            tryQuality(Math.round((q - 0.1) * 10) / 10);
          }
        }, "image/jpeg", q);
      };
      tryQuality(0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewEntryCard({ onPosted }: { onPosted: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    compressToLimit(file).then(setPhoto);
  };

  const submit = async () => {
    if (!message.trim() || !name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("message", message.trim());
      if (photo) fd.append("image", photo);
      await fetch("/api/guestbook", { method: "POST", body: fd });
      onPosted();
    } finally {
      setSubmitting(false);
    }
  };

  const ready = message.trim().length > 0 && name.trim().length > 0;

  return (
    <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      <div
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center cursor-pointer bg-[#ECEAE6]"
        style={{ height: preview ? "auto" : 80 }}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-auto block" />
        ) : (
          <span className="font-sans text-[11px] text-[#9C9890] tracking-wide">+ photo (optional)</span>
        )}
      </div>
      <div className="px-4 pt-3 pb-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="your message"
          rows={2}
          className="font-sans text-[13px] text-[#2a2520] leading-relaxed w-full resize-none outline-none bg-transparent placeholder:text-[#C8C4BE] mb-3"
        />
        <div className="flex items-center justify-between border-t border-[#F0EDE8] pt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            className="font-sans text-[11px] text-[#9C9890] outline-none bg-transparent placeholder:text-[#C8C4BE] min-w-0 flex-1"
          />
          <button
            onClick={submit}
            disabled={!ready || submitting}
            className="font-sans text-[11px] text-[#9C9890] hover:text-[#2a2520] disabled:text-[#C8C4BE] transition-colors shrink-0"
          >
            {submitting ? "posting" : "post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  return (
    <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] cursor-pointer" onClick={onClick}>
      {entry.imageUrl ? (
        <img src={entry.imageUrl} alt="" className="w-full block object-cover" />
      ) : (
        <div className="w-full aspect-[4/3] flex items-center justify-center bg-[#8A8580]">
          <span className="font-sans text-5xl text-white/30 uppercase">{entry.name[0]}</span>
        </div>
      )}
      <div className="px-4 pt-3 pb-4">
        <p className="font-sans text-[13px] text-[#2a2520] leading-snug mb-2">{entry.message}</p>
        <p className="font-sans text-[11px] text-[#9C9890]">{entry.name} &middot; {formatDate(entry.date)}</p>
      </div>
    </div>
  );
}

export default function PolaroidWall({ entries: initialEntries }: { entries: Entry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const onPosted = async () => {
    const res = await fetch("/api/guestbook");
    if (res.ok) setEntries(await res.json());
  };

  const totalCards = entries.length + 1;

  return (
    <>
      {/* Mobile: full-width snap carousel */}
      <div className="sm:hidden">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Each slide is exactly viewport width */}
          <div className="snap-start shrink-0 w-screen px-6">
            <NewEntryCard onPosted={onPosted} />
          </div>
          {entries.map((entry) => (
            <div key={entry.id} className="snap-start shrink-0 w-screen px-6">
              <EntryCard entry={entry} onClick={() => setSelected(entry)} />
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-5 pb-10">
          {Array.from({ length: totalCards }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
                backgroundColor: i === activeIndex ? "#2a2520" : "#D4CFC9",
              }}
            />
          ))}
        </div>
      </div>

      {/* Desktop: masonry grid */}
      <div className="hidden sm:block px-8 columns-2 lg:columns-3 gap-5 max-w-5xl mx-auto pb-16">
        <div className="break-inside-avoid mb-5">
          <NewEntryCard onPosted={onPosted} />
        </div>
        {entries.map((entry) => (
          <div key={entry.id} className="break-inside-avoid mb-5">
            <div className="hover:shadow-[0_4px_20px_rgba(0,0,0,0.13)] transition-shadow duration-300">
              <EntryCard entry={entry} onClick={() => setSelected(entry)} />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt="" className="w-full block" />
            ) : (
              <div className="w-full aspect-[4/3] flex items-center justify-center bg-[#8A8580]">
                <span className="font-sans text-7xl text-white/30 uppercase">{selected.name[0]}</span>
              </div>
            )}
            <div className="px-4 pt-3.5 pb-5">
              <p className="font-sans text-[14px] text-[#2a2520] leading-relaxed mb-2">{selected.message}</p>
              <p className="font-sans text-[11px] text-[#9C9890]">{selected.name} &middot; {formatDate(selected.date)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
