"use client";

import dynamic from "next/dynamic";
import type { GeoEntry } from "./page";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

export default function GlobeWrapper({ entries }: { entries: GeoEntry[] }) {
  return <Globe entries={entries} />;
}
