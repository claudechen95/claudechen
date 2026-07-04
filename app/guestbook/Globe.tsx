"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import MapGL, { Marker, useMap } from "react-map-gl/mapbox";

const PIN_BOB_CSS = `
@keyframes pin-bob {
  0%, 100% { transform: rotate(-2deg) translateY(0px); }
  50% { transform: rotate(-2deg) translateY(-5px); }
}
`;
import type { GeoEntry } from "./page";

const LIMIT = 4 * 1024 * 1024; // 4MB, safely under Vercel's 4.5MB limit

async function compressImage(file: File): Promise<File> {
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
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PolaroidOverlay({ entry, onClose }: { entry: GeoEntry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xs shadow-2xl"
        style={{ padding: "8px 8px 0 8px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {entry.imageUrl ? (
          <img src={entry.imageUrl} alt="" className="w-full block object-cover" />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center bg-[#8A8580]">
            <span className="font-sans text-7xl text-white/30 uppercase">{entry.name[0]}</span>
          </div>
        )}
        <div className="px-2 pt-3 pb-8">
          <p className="font-sans text-[14px] text-[#2a2520] leading-relaxed mb-2">{entry.message}</p>
          <p className="font-sans text-[11px] text-[#9C9890]">
            {entry.name} &middot; {formatDate(entry.date)}
          </p>
          <p className="font-sans text-[10px] text-[#C8C4BE] mt-0.5">{entry.city}</p>
        </div>
      </div>
    </div>
  );
}

function PolaroidPin({ entry, onClick, delay = 0 }: { entry: GeoEntry; onClick: () => void; delay?: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        transformOrigin: "bottom center",
        transform: hovered ? "rotate(0deg) scale(1.15)" : "rotate(-2deg)",
        transition: hovered ? "transform 0.2s, box-shadow 0.2s" : "transform 0.2s, box-shadow 0.2s",
        animation: hovered ? "none" : `pin-bob 3s ease-in-out ${delay}s infinite`,
        background: "white",
        padding: "3px 3px 10px 3px",
        boxShadow: hovered
          ? "0 8px 32px rgba(0,0,0,0.35)"
          : "0 4px 16px rgba(0,0,0,0.25)",
        width: 64,
      }}
    >
      {entry.imageUrl ? (
        <img
          src={entry.imageUrl}
          alt=""
          style={{ width: 58, height: 58, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: 58,
            height: 58,
            background: "#8A8580",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 22,
            fontFamily: "sans-serif",
          }}
        >
          {entry.name[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}

function FlyToEntry({ entry, onDone }: { entry: GeoEntry; onDone: () => void }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map || !entry) return;
    map.flyTo({ center: [entry.lng, entry.lat], zoom: 9, duration: 1400, essential: true });
    const timer = setTimeout(onDone, 1300);
    return () => clearTimeout(timer);
  }, [map, entry, onDone]);

  return null;
}

function FlyToCoords({ lat, lng, onDone }: { lat: number; lng: number; onDone: () => void }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 12, duration: 1800, essential: true });
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [map, lat, lng, onDone]);

  return null;
}

function EntryForm({ onClose, onPosted }: { onClose: () => void; onPosted: (entry: GeoEntry) => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    compressImage(f).then(setPhoto);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("message", message.trim());
    if (photo) fd.append("image", photo);
    try {
      const res = await fetch("/api/guestbook", { method: "POST", body: fd });
      if (res.ok) {
        const [entry, geo] = await Promise.all([
          res.json(),
          fetch("/api/geo").then(r => r.json()).catch(() => null),
        ]);
        onClose();
        if (geo?.status === "success") {
          onPosted({ ...entry, lat: geo.lat, lng: geo.lon, city: geo.city ?? "" });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!name.trim() && !!message.trim() && !submitting;

  return (
    <div
      className="bg-white w-full"
      style={{ padding: "8px 8px 36px 8px", boxShadow: "0 12px 48px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)" }}
    >
      {/* Photo area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="w-full flex flex-col items-center justify-center bg-[#D8D4CF] cursor-pointer relative overflow-y-auto"
        style={{ aspectRatio: preview ? undefined : "1 / 1", maxHeight: 320 }}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-auto block" />
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mb-2 opacity-40">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#1B1B19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="#1B1B19" strokeWidth="1.5"/>
            </svg>
            <span className="font-sans text-[11px] text-[#1B1B19]/40 tracking-wide uppercase">optional photo</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      {/* Caption strip */}
      <div className="mt-4">
        <>
            <input
              type="text"
              placeholder="your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-sans text-[14px] text-[#1B1B19] placeholder-[#C8C4BE] bg-transparent outline-none w-full font-medium"
              style={{ fontSize: 16 }}
            />
            <div className="flex items-end justify-between gap-2 mt-1">
              <textarea
                placeholder="leave a note"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="font-sans text-[12px] text-[#6B6760] placeholder-[#C8C4BE] bg-transparent outline-none flex-1 resize-none leading-relaxed"
                style={{ fontSize: 16 }}
              />
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="font-sans text-[11px] shrink-0 transition-colors"
                style={{ color: canSubmit ? "#1B1B19" : "#C8C4BE" }}
              >
                {submitting ? "..." : "post →"}
              </button>
            </div>
          </>
      </div>
    </div>
  );
}

function fanOffsets(count: number, radius = 30): [number, number][] {
  if (count === 1) return [[0, 0]];
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)];
  });
}

export default function GlobeView({ entries: initialEntries }: { entries: GeoEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [selected, setSelected] = useState<GeoEntry | null>(null);
  const [flyTarget, setFlyTarget] = useState<GeoEntry | null>(null);
  const [postFlyCoords, setPostFlyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const entriesWithOffsets = useMemo(() => {
    const groups = new Map<string, GeoEntry[]>();
    entries.forEach((e) => {
      const key = `${e.lat},${e.lng}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    });
    const result: { entry: GeoEntry; offset: [number, number]; delay: number }[] = [];
    let globalIndex = 0;
    groups.forEach((group) => {
      const offsets = fanOffsets(group.length);
      group.forEach((entry, i) => {
        result.push({ entry, offset: offsets[i], delay: globalIndex * 0.4 });
        globalIndex++;
      });
    });
    return result;
  }, [entries]);

  const handlePinClick = useCallback((entry: GeoEntry) => {
    setFlyTarget(entry);
  }, []);

  const handleFlyDone = useCallback(() => {
    if (flyTarget) {
      setSelected(flyTarget);
      setShowOverlay(true);
      setFlyTarget(null);
    }
  }, [flyTarget]);

  const handleClose = useCallback(() => {
    setShowOverlay(false);
    setSelected(null);
  }, []);

  return (
    <>
      <style>{PIN_BOB_CSS}</style>
      <div style={{ height: "100%", width: "100%" }}>
        <MapGL
          mapboxAccessToken={TOKEN}
          initialViewState={{
            longitude: -119,
            latitude: 42,
            zoom: 4.5,
          }}
          projection={{ name: "globe" } as any}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          style={{ width: "100%", height: "100%" }}
          fog={{
            range: [0.5, 10],
            color: "#F8F7F3",
            "horizon-blend": 0.1,
            "high-color": "#c9d8f0",
            "space-color": "#F8F7F3",
            "star-intensity": 0,
          }}
        >
          {entriesWithOffsets.map(({ entry, offset, delay }) => (
            <Marker
              key={entry.id}
              longitude={entry.lng}
              latitude={entry.lat}
              anchor="bottom"
              offset={offset}
            >
              <PolaroidPin entry={entry} onClick={() => handlePinClick(entry)} delay={delay} />
            </Marker>
          ))}

          {flyTarget && (
            <FlyToEntry entry={flyTarget} onDone={handleFlyDone} />
          )}
          {postFlyCoords && (
            <FlyToCoords lat={postFlyCoords.lat} lng={postFlyCoords.lng} onDone={() => setPostFlyCoords(null)} />
          )}
        </MapGL>
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-8 right-8 z-20 w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.35)" }}
        aria-label="Sign the guest book"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <line x1="11" y1="3" x2="11" y2="19" stroke="#1B1B19" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="11" x2="19" y2="11" stroke="#1B1B19" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Centered modal */}
      {formOpen && (
        <div className="fixed inset-0 z-30 flex items-start justify-center p-8 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-[340px] md:max-w-[360px] my-auto">
            <EntryForm
              onClose={() => setFormOpen(false)}
              onPosted={(entry) => {
                setEntries((prev) => [entry, ...prev]);
                setPostFlyCoords({ lat: entry.lat, lng: entry.lng });
              }}
            />
          </div>
        </div>
      )}

      {showOverlay && selected && (
        <PolaroidOverlay entry={selected} onClose={handleClose} />
      )}
    </>
  );
}
