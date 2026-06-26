"use client";

import { useRouter, useSearchParams } from "next/navigation";

function BackButtonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <button
      onClick={() => (from ? router.push(from) : router.back())}
      className="font-sans text-[14px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors"
    >
      ← back
    </button>
  );
}

import { Suspense } from "react";

export default function BackButton() {
  return (
    <Suspense fallback={<span className="font-sans text-[14px] text-[#C8C4BE]">← back</span>}>
      <BackButtonInner />
    </Suspense>
  );
}
