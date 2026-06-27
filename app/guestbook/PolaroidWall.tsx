"use client";

import { useState, useEffect } from "react";

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

export default function PolaroidWall({ entries }: { entries: Entry[] }) {
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="flex flex-wrap gap-10 justify-center max-w-5xl mx-auto pb-16">
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
