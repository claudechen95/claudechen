"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Map, { Marker, useMap } from "react-map-gl/mapbox";
import type { GeoEntry } from "./page";
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
        onClick={(e) => e.stopPropagation()}
      >
        {entry.imageUrl ? (
          <img src={entry.imageUrl} alt="" className="w-full block object-cover" />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center bg-[#8A8580]">
            <span className="font-sans text-7xl text-white/30 uppercase">{entry.name[0]}</span>
          </div>
        )}
        <div className="px-4 pt-3 pb-5">
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

function PolaroidPin({ entry, onClick }: { entry: GeoEntry; onClick: () => void }) {
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
        transition: "transform 0.2s, box-shadow 0.2s",
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
    map.flyTo({
      center: [entry.lng, entry.lat],
      zoom: 9,
      duration: 1400,
      essential: true,
    });
    const timer = setTimeout(onDone, 1300);
    return () => clearTimeout(timer);
  }, [map, entry, onDone]);

  return null;
}

export default function GlobeView({ entries }: { entries: GeoEntry[] }) {
  const [selected, setSelected] = useState<GeoEntry | null>(null);
  const [flyTarget, setFlyTarget] = useState<GeoEntry | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

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
      <div style={{ height: "100%", width: "100%" }}>
        <Map
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
          {entries.map((entry) => (
            <Marker
              key={entry.id}
              longitude={entry.lng}
              latitude={entry.lat}
              anchor="bottom"
            >
              <PolaroidPin entry={entry} onClick={() => handlePinClick(entry)} />
            </Marker>
          ))}

          {flyTarget && (
            <FlyToEntry entry={flyTarget} onDone={handleFlyDone} />
          )}
        </Map>
      </div>

      {showOverlay && selected && (
        <PolaroidOverlay entry={selected} onClose={handleClose} />
      )}
    </>
  );
}
