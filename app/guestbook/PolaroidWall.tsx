"use client";

import { useState, useEffect, useRef } from "react";

interface Entry {
  id: string;
  name: string;
  message: string;
  date: string;
  imageUrl?: string;
}

const ROTATIONS = [-3, 1.5, -1.5, 2, -2.5, 1, -1, 2.5, -2, 3, -0.5, 1.5];
const PHOTO_COLORS = ["#d4c8bc", "#bcccc0", "#bcc4d0", "#cebcbc", "#c8bcd0", "#d0d0bc"];

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
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!photo || !message.trim() || !name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("message", message.trim());
      fd.append("image", photo);
      await fetch("/api/guestbook", { method: "POST", body: fd });
      onPosted();
    } finally {
      setSubmitting(false);
    }
  };

  const ready = !!photo && message.trim().length > 0 && name.trim().length > 0;

  return (
    <div className="bg-white shadow-[0_6px_30px_rgba(0,0,0,0.12)] w-[210px] md:w-[300px] p-2.5 pb-0">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {/* Photo area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="w-full h-[195px] md:h-[280px] overflow-hidden flex items-center justify-center cursor-pointer transition-colors"
        style={{ backgroundColor: preview ? undefined : "#f0ede8", border: preview ? undefined : "2px dashed #d4c8bc" }}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-sans text-2xl text-[#c8c4be]">+</span>
        )}
      </div>

      {/* Caption strip */}
      <div className="px-1 pt-3 pb-5">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="your message..."
          rows={3}
          className="font-serif italic text-[13.5px] md:text-[16px] text-[#2a2520] leading-snug w-full resize-none outline-none bg-transparent placeholder:text-[#d4c8bc] mb-2.5"
        />
        <div className="flex items-center justify-between gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="— your name"
            className="font-sans text-[10.5px] md:text-[13px] text-[#b0a89e] outline-none bg-transparent placeholder:text-[#d4c8bc] tracking-wide min-w-0 flex-1"
          />
          <button
            onClick={submit}
            disabled={!ready || submitting}
            className="font-sans text-[10.5px] md:text-[13px] text-[#9C9890] hover:text-[#1B1B19] disabled:text-[#d4c8bc] transition-colors shrink-0"
          >
            {submitting ? "posting…" : "post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PolaroidWall({ entries: initialEntries }: { entries: Entry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const onPosted = async () => {
    const res = await fetch("/api/guestbook");
    if (res.ok) setEntries(await res.json());
  };

  return (
    <>
      <div className="flex flex-wrap gap-10 justify-center max-w-5xl mx-auto pb-16">
        <NewEntryCard onPosted={onPosted} />

        {entries.map((entry, i) => {
          const rotation = ROTATIONS[i % ROTATIONS.length];
          const photoColor = PHOTO_COLORS[i % PHOTO_COLORS.length];

          return (
            <div
              key={entry.id}
              className="group"
              style={{ "--rot": `${rotation}deg` } as React.CSSProperties}
            >
              <div
                onClick={() => setSelected(entry)}
                className="[transform:rotate(var(--rot))] group-hover:[transform:rotate(0deg)_scale(1.04)] transition-transform duration-300 bg-white shadow-[0_6px_30px_rgba(0,0,0,0.5)] w-[210px] p-2.5 pb-0 cursor-pointer select-none"
              >
                <div
                  className="w-full h-[195px] overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: photoColor }}
                >
                  {entry.imageUrl ? (
                    <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-serif text-7xl text-white/30 leading-none">
                      {entry.name[0]}
                    </span>
                  )}
                </div>
                <div className="px-1 pt-3 pb-7">
                  <p className="font-serif italic text-[13.5px] text-[#2a2520] leading-snug line-clamp-3 mb-2.5">
                    {entry.message}
                  </p>
                  <p className="font-sans text-[10.5px] text-[#b0a89e] tracking-wide">
                    — {entry.name} · {formatDate(entry.date)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white shadow-2xl p-3 pb-0 w-full max-w-sm animate-fade-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const photoColor = PHOTO_COLORS[entries.indexOf(selected) % PHOTO_COLORS.length];
              return (
                <>
                  <div
                    className="w-full overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: photoColor, minHeight: 280 }}
                  >
                    {selected.imageUrl ? (
                      <img src={selected.imageUrl} alt="" className="w-full object-cover" />
                    ) : (
                      <span className="font-serif text-9xl text-white/30 leading-none py-10">
                        {selected.name[0]}
                      </span>
                    )}
                  </div>
                  <div className="px-1 pt-4 pb-8">
                    <p className="font-serif italic text-[17px] text-[#2a2520] leading-relaxed mb-3">
                      {selected.message}
                    </p>
                    <p className="font-sans text-[12px] text-[#b0a89e] tracking-wide">
                      — {selected.name} · {formatDate(selected.date)}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
