"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LeaveNoteButtonInner() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <a
      href={from ? `/guestbook?from=${encodeURIComponent(from)}` : "/guestbook"}
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
