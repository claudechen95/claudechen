"use client";

import { useSearchParams } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { Suspense } from "react";

function BackButtonInner() {
  const router = useTransitionRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const handleBack = () => {
    if (from) router.push(from);
    else router.back();
  };

  return (
    <button
      onClick={handleBack}
      className="font-sans text-[14px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors"
    >
      ← back
    </button>
  );
}

export default function BackButton() {
  return (
    <Suspense fallback={<span className="font-sans text-[14px] text-[#C8C4BE]">← back</span>}>
      <BackButtonInner />
    </Suspense>
  );
}
