"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Link, useTransitionRouter } from "next-view-transitions";
import { usePostHog } from "posthog-js/react";
import { NewEntryCard } from "@/app/guestbook/PolaroidWall";

type Message = { role: "user" | "assistant"; content: string };

const CHAR_INTERVAL = 25;

const LUCKY_PROMPTS = [
  "what's the most claude thing claude has ever done?",
  "if he had enemies, what would they say?",
  "tell me something nobody ever thinks to ask about him",
  "what's a belief he holds that most people would push back on?",
  "give me the four-year-old story",
];

const FIRST_PROMPT = "Who's there?";
const PROMPTS = [
  "Is Claude secretly ugly? Prove it",
  "was he jobless before SF?",
  "Claude doenst seem like a chill person at all",
  "does Claude believe in morality?",
  "hows founder life?",
  "how can I reach Claude?",
  "Let's meet",
  "sign the guest book",
];

function pickUnusedPrompt(exclude: Set<string>): string | null {
  if (!exclude.has(FIRST_PROMPT)) return FIRST_PROMPT;
  const unused = PROMPTS.filter((p) => !exclude.has(p));
  if (!unused.length) return null;
  return unused[0];
}

const MD_LINK_RE = /\[([^\]]+)\]\(((?:https?|mailto):[^)]+)\)/g;
const URL_RE = /(https?:\/\/[^\s]+|(?<![/@\w])[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

function renderWithLinks(text: string) {
  // Split on markdown links [label](url) first, then handle bare URLs in text segments
  const segments: Array<{ type: "text" | "mdlink"; text: string; href?: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text", text: text.slice(last, m.index) });
    segments.push({ type: "mdlink", text: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", text: text.slice(last) });

  return segments.flatMap((seg, si) => {
    if (seg.type === "mdlink") {
      return (
        <a key={si} href={seg.href} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-60 transition-opacity">
          {seg.text}
        </a>
      );
    }
    const parts = seg.text.split(URL_RE);
    return parts.map((part, i) => {
      if (!part.match(/^https?:\/\//) && !part.match(/^[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\.[a-zA-Z]{2,}/)) return part;
      const href = part.startsWith("http") ? part : `https://${part}`;
      const display = part.replace(/[.,;!?]+$/, "");
      const trailing = part.slice(display.length);
      return (
        <span key={`${si}-${i}`}>
          <a href={href.replace(/[.,;!?]+$/, "")} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-60 transition-opacity">
            {display}
          </a>
          {trailing}
        </span>
      );
    });
  });
}

export default function ChatInterface({ initialSessionId }: { initialSessionId?: string }) {
  const posthog = usePostHog();
  const router = useTransitionRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);

  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [pairPhotos, setPairPhotos] = useState<Record<number, string[]>>({});
  const [calPairIndex, setCalPairIndex] = useState<number | null>(null);
  const [guestbookPairIndex, setGuestbookPairIndex] = useState<number | null>(null);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const bottomSpacerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<(text: string) => Promise<void>>(async () => { });
  const streamingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(initialSessionId ?? null);

  const revealQueueRef = useRef<string[]>([]);
  const pendingCharsRef = useRef("");
  const streamDoneRef = useRef(false);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { streamingRef.current = streaming; }, [streaming]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Mobile keyboard fix (iOS Safari + iOS Chrome):
  // Use position:fixed on the container (set via CSS vars) and track both visualViewport
  // height AND offsetTop so the container always exactly covers the visible area.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty("--vph", `${vv.height}px`);
      document.documentElement.style.setProperty("--vp-top", `${vv.offsetTop}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Keep bottom spacer height in sync with the input bar so the last message is never hidden
  useEffect(() => {
    const bar = inputBarRef.current;
    const spacer = bottomSpacerRef.current;
    if (!bar || !spacer) return;
    const ro = new ResizeObserver(() => {
      spacer.style.height = `${bar.offsetHeight}px`;
    });
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setSuggestedPrompt(pickUnusedPrompt(new Set()));
  }, []);

  // Load session from localStorage
  useEffect(() => {
    if (!initialSessionId) {
      setSessionLoaded(true);
      return;
    }
    try {
      const saved = localStorage.getItem(`session:${initialSessionId}`);
      if (saved) setMessages(JSON.parse(saved));
      const savedPhotos = localStorage.getItem(`photos:${initialSessionId}`);
      if (savedPhotos) setPairPhotos(JSON.parse(savedPhotos));
      const savedCal = localStorage.getItem(`cal:${initialSessionId}`);
      if (savedCal !== null) setCalPairIndex(JSON.parse(savedCal));
      const savedGuestbook = localStorage.getItem(`guestbook:${initialSessionId}`);
      if (savedGuestbook !== null) setGuestbookPairIndex(JSON.parse(savedGuestbook));
    } catch { }
    setSessionLoaded(true);
  }, [initialSessionId]);

  // Auto-submit ?send= message (e.g. from "leave a note" button on guestbook page)
  useEffect(() => {
    if (!sessionLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("send");
    if (!msg) return;
    window.history.replaceState(null, "", window.location.pathname);
    submitRef.current(msg);
  }, [sessionLoaded]);

  // Save to localStorage when streaming completes
  useEffect(() => {
    const id = sessionIdRef.current;
    if (!streaming && id && messages.length > 0) {
      localStorage.setItem(`session:${id}`, JSON.stringify(messages));
      localStorage.setItem(`photos:${id}`, JSON.stringify(pairPhotos));
      if (calPairIndex !== null) localStorage.setItem(`cal:${id}`, JSON.stringify(calPairIndex));
      if (guestbookPairIndex !== null) localStorage.setItem(`guestbook:${id}`, JSON.stringify(guestbookPairIndex));
    }
  }, [streaming, pairPhotos, calPairIndex, guestbookPairIndex]);

  // Scroll conversation to bottom on update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pairPhotos]);

  const submit = async (text: string) => {
    const q = text.trim();
    if (!q || streamingRef.current) return;


    // Generate session ID on first message
    let currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      setSessionId(currentSessionId);
      sessionIdRef.current = currentSessionId;
      window.history.pushState(null, "", `/chat/${currentSessionId}`);
    }

    const history: Message[] = [...messages, { role: "user", content: q }];
    const pairIndex = Math.floor(history.length / 2);
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    streamingRef.current = true;

    revealQueueRef.current = [];
    pendingCharsRef.current = "";
    streamDoneRef.current = false;
    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);

    let revealed = "";
    revealIntervalRef.current = setInterval(() => {
      if (revealQueueRef.current.length > 0) {
        revealed += revealQueueRef.current.shift()!;
        setMessages([...history, { role: "assistant", content: revealed }]);
      } else if (streamDoneRef.current) {
        clearInterval(revealIntervalRef.current!);
        revealIntervalRef.current = null;
        setStreaming(false);
        streamingRef.current = false;
      }
    }, CHAR_INTERVAL);

    try {
      posthog?.capture("question_asked", { question: q });

      const shownPhotos = Object.values(pairPhotos).flat().map((url) => url.replace("/api/photos/", ""));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, visitorName: sessionIdRef.current ? visitorName : null, sessionId: currentSessionId, shownPhotos }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });
        if (chunk.includes("\x00SHOW_CAL\x00")) {
          setCalPairIndex((prev) => prev ?? pairIndex); // only set once; bot sometimes re-triggers
          chunk = chunk.replace("\x00SHOW_CAL\x00", "");
        }
        if (chunk.includes("\x00SHOW_GUESTBOOK\x00")) {
          setGuestbookPairIndex((prev) => prev ?? pairIndex);
          chunk = chunk.replace("\x00SHOW_GUESTBOOK\x00", "");
        }
        const photoMatches = [...chunk.matchAll(/\x00PHOTO:([^\x00]+)\x00/g)];
        if (photoMatches.length > 0) {
          const newUrls = photoMatches.map((m) => `/api/photos/${m[1]}`);
          setPairPhotos((prev) => ({ ...prev, [pairIndex]: [...(prev[pairIndex] ?? []), ...newUrls] }));
          chunk = chunk.replace(/\x00PHOTO:[^\x00]+\x00/g, " ");
        }
        const visitorMatch = chunk.match(/\x00VISITOR:([^\x00]+)\x00/);
        if (visitorMatch) {
          const name = visitorMatch[1];
          setVisitorName(name);
          chunk = chunk.replace(visitorMatch[0], "");
        }
        chunk = chunk.replace(/PHOTO:[a-zA-Z0-9_\-\.]+/g, " ");
        for (const ch of chunk) { revealQueueRef.current.push(ch); }
      }
    } catch {
      revealQueueRef.current.push("Something went wrong.");
    } finally {
      streamDoneRef.current = true;
    }
  };

  useEffect(() => { submitRef.current = submit; });

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (document.activeElement === textareaRef.current) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1) textareaRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [promptSending, setPromptSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const usedPromptsRef = useRef(new Set<string>());
  const advancePrompt = (sent: string) => {
    usedPromptsRef.current.add(sent);
    setSuggestedPrompt(pickUnusedPrompt(usedPromptsRef.current));
  };

  const submitPlaceholder = () => {
    if (!suggestedPrompt || streamingRef.current) return;
    setPromptSending(true);
    const prompt = suggestedPrompt;
    setTimeout(() => {
      setPromptSending(false);
      advancePrompt(prompt);
      submit(prompt);
    }, 220);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() && suggestedPrompt) {
        submitPlaceholder();
      } else {
        submit(input);
      }
    }
  };

  const pairs: Array<{ q: string; a: string }> = [];
  for (let i = 0; i < messages.length; i += 2) {
    pairs.push({ q: messages[i].content, a: messages[i + 1]?.content ?? "" });
  }

  const inputRow = (
    <div className="flex items-center gap-5">
      {!streaming && !input.trim() && (
        <button
          onClick={() => {
            const prompt = LUCKY_PROMPTS[Math.floor(Math.random() * LUCKY_PROMPTS.length)];
            submit(prompt);
          }}
          className="font-sans text-[13px] text-[#D8D4CF] hover:text-[#9C9890] active:text-[#9C9890] transition-colors shrink-0"
        >
          ✦
        </button>
      )}
      <div className="relative flex-1">
        {/* Shadow div — always in flow, mirrors textarea content to set height */}
        <div
          aria-hidden
          className="font-sans text-[18px] md:text-[26px] leading-relaxed break-words whitespace-pre-wrap invisible pointer-events-none"
        >
          {input || suggestedPrompt || " "}
        </div>
        {/* Placeholder */}
        {!input && (
          <div
            key={suggestedPrompt}
            onClick={() => { submitPlaceholder(); textareaRef.current?.focus(); }}
            className={[
              "absolute inset-0 font-sans text-[18px] md:text-[26px] leading-relaxed break-words cursor-text animate-fade-in transition-all duration-[220ms]",
              "text-[#C8C4BE]",
              promptSending ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100",
            ].join(" ")}
          >
            {suggestedPrompt ?? "Ask anything"}
          </div>
        )}
        {/* Textarea — always absolute so it never shifts layout */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          className="absolute inset-0 w-full bg-transparent font-sans text-[18px] md:text-[26px] text-[#1B1B19] resize-none outline-none leading-relaxed py-0"
        />
      </div>
      <button
        onClick={() => {
          if (!input.trim() && suggestedPrompt) {
            submitPlaceholder();
          } else {
            submit(input);
          }
        }}
        disabled={(!input.trim() && !suggestedPrompt) || streaming || promptSending}
        aria-label="Send"
        className={[
          "font-sans text-[18px] md:text-[26px] text-[#1B1B19] disabled:text-[#C8C4BE] transition-colors shrink-0",
          pairs.length === 0 && !streaming && !promptSending ? "animate-pulse-strong" : "",
        ].join(" ")}
      >
        →
      </button>
    </div>
  );

  const guestbookHref = sessionId ? `/guestbook?from=/chat/${sessionId}` : "/guestbook";
  const guestbookLink = (
    <Link
      href={guestbookHref}
      onClick={(e) => {
        // View Transitions API causes a visible freeze on mobile — skip it on touch devices
        if (!window.matchMedia("(hover: hover)").matches) {
          e.preventDefault();
          window.location.href = guestbookHref;
        }
      }}
      className="absolute top-6 right-6 md:right-10 z-20 font-sans text-[13px] md:text-[26px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors"
    >
      guest book
    </Link>
  );

  // Empty state: input centered in viewport
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME
    ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  if (pairs.length === 0) {
    return (
      <div className="flex flex-col bg-[#F8F7F3]" style={{ position: "fixed", top: "var(--vp-top, 0px)", left: 0, right: 0, height: "var(--vph, 100dvh)" }}>
        {guestbookLink}
        {buildTime && (
          <span className="absolute top-6 left-6 font-sans text-[11px] text-[#C8C4BE] select-none pointer-events-none">{buildTime}</span>
        )}
        {/* Top spacer — always grows to push input toward center */}
        <div className="flex-1" />
        {/* Input */}
        <div className="shrink-0 w-full px-6 md:px-10 py-5 md:max-w-[560px] mx-auto"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {inputRow}
        </div>
        {/* Bottom spacer — collapses when focused so input slides to bottom */}
        <div className="shrink-0 overflow-hidden" style={{
          flex: "1 1 auto",
          maxHeight: inputFocused ? "0px" : "50vh",
          transition: "max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#F8F7F3]" style={{ position: "fixed", top: "var(--vp-top, 0px)", left: 0, right: 0, height: "var(--vph, 100dvh)" }}>
      {guestbookLink}
      <div className="absolute inset-x-0 top-0 h-12 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, #F8F7F3, transparent)" }} />

      {/* Scrollable messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="w-full max-w-full md:max-w-[75vw] mx-auto px-6 md:px-10 pt-16">
            <div className="space-y-10 md:space-y-14">
              {pairs.map((pair, i) => (
                <div key={i} className="animate-fade-slide-up">
                  {!pair.q.startsWith("\x00") && (
                    <p className="font-sans text-[14px] text-[#9C9890] italic mb-5">— {pair.q}</p>
                  )}
                  {pairPhotos[i]?.length > 0 && (
                    <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
                      {pairPhotos[i].map((url, j) => (
                        <button key={j} onClick={() => setPhotoModal(url)} className="shrink-0 block cursor-zoom-in">
                          <img
                            src={url}
                            alt=""
                            className="max-h-[220px] rounded-lg"
                            onLoad={() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {guestbookPairIndex === i && (
                    <div className="mb-6">
                      <NewEntryCard onPosted={() => {
                        setGuestbookPairIndex(null);
                        const id = sessionIdRef.current;
                        if (id) localStorage.removeItem(`guestbook:${id}`);
                        setMessages((prev) => [
                          ...prev,
                          { role: "user", content: "\x00posted\x00" },
                          { role: "assistant", content: "you're in the book. [check it out](https://claudechen.me/guestbook)" },
                        ]);
                      }} />
                    </div>
                  )}
                  {calPairIndex === i && (
                    <iframe
                      src="https://cal.com/claudechen/30min?embed=true&theme=light&overlayCalendar=true"
                      width="100%"
                      height="600"
                      frameBorder="0"
                      className="mb-6 rounded-lg"
                    />
                  )}
                  <p className="font-sans text-[18px] md:text-[22px] leading-[1.75] text-[#1B1B19] whitespace-pre-wrap">
                    {renderWithLinks(pair.a)}
                  </p>
                </div>
              ))}
            </div>
            {/* Spacer — padding-bottom is ignored by overflow containers on WebKit/mobile; a real element is required */}
            <div ref={bottomSpacerRef} />
          </div>
      </div>

      {/* Sticky input */}
      <div
        ref={inputBarRef}
        className="shrink-0 w-full max-w-full md:max-w-[75vw] mx-auto px-6 md:px-10 py-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {inputRow}
      </div>

      {buildTime && (
        <span className="absolute top-6 left-6 font-sans text-[11px] text-[#C8C4BE] select-none pointer-events-none z-20">{buildTime}</span>
      )}

      {photoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPhotoModal(null)}
        >
          <img
            src={photoModal}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

