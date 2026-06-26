"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="font-sans text-[14px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors"
    >
      ← back
    </button>
  );
}
