import type { Metadata } from "next";
import AntoniettaExperience from "./AntoniettaExperience";

export const metadata: Metadata = {
  title: "Antonietta",
  robots: { index: false, follow: false },
};

export default function AntoniettaPage() {
  return <AntoniettaExperience />;
}
