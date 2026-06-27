"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LeaveNoteButtonInner() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const base = from ?? "/";
  const href = `${base}${base.includes("?") ? "&" : "?"}send=${encodeURIComponent("Let's leave a note")}`;

  return (
    <a
      href={href}
      className="font-sans text-[14px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors"
    >
      leave a note
    </a>
  );
}

export default function LeaveNoteButton() {
  return (
    <Suspense fallback={<span className="font-sans text-[14px] text-[#C8C4BE]">leave a note</span>}>
      <LeaveNoteButtonInner />
    </Suspense>
  );
}
