"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";

type Message = { role: "user" | "assistant"; content: string };
type MicState = "idle" | "listening" | "transcribing";

const CHAR_INTERVAL = 25;
const VISITOR_KEY = "cc_visitor";
const USED_PROMPTS_KEY = "cc_used_prompts";

const FIRST_PROMPT = "who are you? keep it short";
const PROMPTS = [
  "what are you building?",
  "why'd you quit your job?",
  "what did you do at Amazon / Coupang?",
  "why entrepreneurship?",
  "tell me something about growing up",
  "where have you traveled?",
  "what are your hobbies?",
  "show me a photo",
  "how can I reach you?",
  "schedule a meeting",
  "sign the guest book",
];

function pickUnusedPrompt(exclude: Set<string>): string | null {
  if (!exclude.has(FIRST_PROMPT)) return FIRST_PROMPT;
  const unused = PROMPTS.filter((p) => !exclude.has(p));
  if (!unused.length) return null;
  return unused[Math.floor(Math.random() * unused.length)];
}

const URL_RE = /(https?:\/\/[^\s]+|(?<![/@\w])[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

function renderWithLinks(text: string) {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (!part.match(/^https?:\/\//) && !part.match(/^[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\.[a-zA-Z]{2,}/)) return part;
    const href = part.startsWith("http") ? part : `https://${part}`;
    const display = part.replace(/[.,;!?]+$/, "");
    const trailing = part.slice(display.length);
    return (
      <span key={i}>
        <a href={href.replace(/[.,;!?]+$/, "")} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-60 transition-opacity">
          {display}
        </a>
        {trailing}
      </span>
    );
  });
}

export default function ChatInterface({ initialSessionId }: { initialSessionId?: string }) {
  const posthog = usePostHog();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [showCal, setShowCal] = useState(false);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [guestbookEntryId, setGuestbookEntryId] = useState<string | null>(null);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const submitRef = useRef<(text: string) => Promise<void>>(async () => { });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const micStateRef = useRef<MicState>("idle");
  const streamingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(initialSessionId ?? null);

  const revealQueueRef = useRef<string[]>([]);
  const pendingCharsRef = useRef("");
  const streamDoneRef = useRef(false);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { micStateRef.current = micState; }, [micState]);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // Load visitor name and pick initial suggested prompt from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VISITOR_KEY);
      if (saved) setVisitorName(JSON.parse(saved).name ?? null);
    } catch { }
    try {
      const used = new Set<string>(JSON.parse(localStorage.getItem(USED_PROMPTS_KEY) || "[]"));
      setSuggestedPrompt(pickUnusedPrompt(used));
    } catch { }
  }, []);

  // Load session from localStorage
  useEffect(() => {
    if (!initialSessionId) return;
    try {
      const saved = localStorage.getItem(`session:${initialSessionId}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch { }
  }, [initialSessionId]);

  // Save to localStorage when streaming completes
  useEffect(() => {
    const id = sessionIdRef.current;
    if (!streaming && id && messages.length > 0) {
      localStorage.setItem(`session:${id}`, JSON.stringify(messages));
    }
  }, [streaming]);

  // Scroll conversation to bottom on update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, photoUrl, guestbookEntryId]);

  const submit = async (text: string) => {
    const q = text.trim();
    if (!q || streamingRef.current) return;
    setShowCal(false);
    setPhotoUrl(null);

    // Generate session ID on first message
    let currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      setSessionId(currentSessionId);
      sessionIdRef.current = currentSessionId;
      window.history.pushState(null, "", `/chat/${currentSessionId}`);
    }

    const history: Message[] = [...messages, { role: "user", content: q }];
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, visitorName: sessionIdRef.current ? visitorName : null }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });
        if (chunk.includes("\x00SHOW_CAL\x00")) {
          setShowCal(true);
          chunk = chunk.replace("\x00SHOW_CAL\x00", "");
        }
        chunk = chunk.replace("\x00SHOW_GUESTBOOK\x00", "");
        const guestbookIdMatch = chunk.match(/\x00GUESTBOOK_ID:([^\x00]+)\x00/);
        if (guestbookIdMatch) {
          chunk = chunk.replace(guestbookIdMatch[0], "");
          setGuestbookEntryId(guestbookIdMatch[1]);
        }
        const photoMatch = chunk.match(/\x00PHOTO:([^\x00]+)\x00/);
        if (photoMatch) {
          setPhotoUrl(`/api/photos/${photoMatch[1]}`);
          chunk = chunk.replace(photoMatch[0], "");
        }
        const visitorMatch = chunk.match(/\x00VISITOR:([^\x00]+)\x00/);
        if (visitorMatch) {
          const name = visitorMatch[1];
          setVisitorName(name);
          try { localStorage.setItem(VISITOR_KEY, JSON.stringify({ name })); } catch { }
          chunk = chunk.replace(visitorMatch[0], "");
        }
        for (const ch of chunk) { revealQueueRef.current.push(ch); }
      }
    } catch {
      revealQueueRef.current.push("Something went wrong.");
    } finally {
      streamDoneRef.current = true;
    }
  };

  useEffect(() => { submitRef.current = submit; });

  const stopRecording = () => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    mediaRecorderRef.current?.stop();
  };

  const startRecording = async (ptt = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      if (!ptt) {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let silenceStart: number | null = null;
        const startedAt = Date.now();
        const tick = () => {
          if (recorder.state !== "recording") return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) { const n = (v - 128) / 128; sum += n * n; }
          const rms = Math.sqrt(sum / data.length);
          if (Date.now() - startedAt > 700 && rms < 0.015) {
            silenceStart ??= Date.now();
            if (Date.now() - silenceStart > 1500) { stopRecording(); return; }
          } else if (rms >= 0.015) { silenceStart = null; }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setMicState("transcribing");
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        try {
          const fd = new FormData();
          fd.append("file", blob, `recording.${ext}`);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const json = await res.json();
          if (json.transcript?.trim()) await submitRef.current(json.transcript);
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setMicState("idle");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setMicState("listening");
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const startRecordingRef = useRef(startRecording);
  useEffect(() => { startRecordingRef.current = startRecording; });

  useEffect(() => {
    const onDown = (e: globalThis.KeyboardEvent) => {
      if (e.code === "Backquote" && !e.repeat && micStateRef.current === "idle" && !streamingRef.current) {
        e.preventDefault();
        startRecordingRef.current(true);
      }
    };
    const onUp = (e: globalThis.KeyboardEvent) => {
      if (e.code === "Backquote" && micStateRef.current === "listening") {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", onDown, { capture: true });
      window.removeEventListener("keyup", onUp, { capture: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (document.activeElement === textareaRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1) textareaRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleMic = () => {
    if (streaming || micState === "transcribing") return;
    if (micState === "listening") { stopRecording(); return; }
    startRecording(false);
  };

  const advancePrompt = (sent: string) => {
    try {
      const used = new Set<string>(JSON.parse(localStorage.getItem(USED_PROMPTS_KEY) || "[]"));
      used.add(sent);
      localStorage.setItem(USED_PROMPTS_KEY, JSON.stringify([...used]));
      setSuggestedPrompt(pickUnusedPrompt(used));
    } catch { }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() && suggestedPrompt) {
        advancePrompt(suggestedPrompt);
        submit(suggestedPrompt);
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
      <button
        onClick={toggleMic}
        disabled={streaming || micState === "transcribing"}
        aria-label={micState === "listening" ? "Stop" : "Record"}
        className="shrink-0 disabled:opacity-30 transition-opacity"
      >
        {micState === "listening" ? (
          <span className="inline-block w-3 h-3 rounded-full bg-red-400 animate-pulse" />
        ) : micState === "transcribing" ? (
          <span className="inline-block w-3 h-3 rounded-full bg-[#C8C4BE] animate-pulse" />
        ) : (
          <MicIcon className="text-[#C8C4BE] hover:text-[#9C9890] transition-colors" />
        )}
      </button>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={suggestedPrompt ?? "Ask anything"}
        rows={1}
        className="flex-1 bg-transparent font-sans text-[18px] text-[#1B1B19] placeholder-[#C8C4BE] resize-none outline-none leading-relaxed caret-transparent"
      />
      <button
        onClick={() => {
          if (!input.trim() && suggestedPrompt) {
            advancePrompt(suggestedPrompt);
            submit(suggestedPrompt);
          } else {
            submit(input);
          }
        }}
        disabled={(!input.trim() && !suggestedPrompt) || streaming}
        aria-label="Send"
        className="font-sans text-[18px] text-[#1B1B19] disabled:text-[#C8C4BE] transition-colors shrink-0"
      >
        →
      </button>
    </div>
  );

  const guestbookLink = (
    <Link
      href="/guestbook"
      className="absolute top-6 right-10 font-sans text-[13px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors"
    >
      guest book
    </Link>
  );

  // Empty state: input centered in viewport
  if (pairs.length === 0) {
    return (
      <div className="relative flex h-screen items-center justify-center bg-[#F8F7F3] px-10">
        {guestbookLink}
        <div className="w-full max-w-[680px]">{inputRow}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F8F7F3] py-16">
      <div className="w-full max-w-[680px] px-10">
        {guestbookLink}
        <div className="relative mb-14">
          <div className="absolute inset-x-0 top-0 h-12 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, #F8F7F3, transparent)" }} />

          <div ref={scrollRef} className="max-h-[33vh] overflow-y-auto space-y-14">
            {pairs.map((pair, i) => (
              <div key={i}>
                {!pair.q.startsWith("\x00") && (
                  <p className="font-sans text-[14px] text-[#9C9890] italic mb-5">— {pair.q}</p>
                )}
                <p className="font-sans text-[22px] leading-[1.75] text-[#1B1B19] whitespace-pre-wrap">
                  {renderWithLinks(pair.a)}
                </p>
              </div>
            ))}
            {photoUrl && (
              <img src={photoUrl} alt="" className="w-full rounded-lg object-cover max-h-[400px]" />
            )}
            {guestbookEntryId && (
              <PhotoUploadButton
                entryId={guestbookEntryId}
                onUploaded={() => {
                  setGuestbookEntryId(null);
                  setMessages((prev) => [
                    ...prev,
                    { role: "user", content: "\x00photo\x00" },
                    { role: "assistant", content: "got it. photo's in." },
                  ]);
                }}
              />
            )}
          </div>
        </div>
        {inputRow}
        {showCal && (
          <div className="mt-10">
            <iframe
              src="https://cal.com/claudechen/30min?embed=true&theme=light&overlayCalendar=true"
              width="100%"
              height="600"
              frameBorder="0"
              className="rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoUploadButton({ entryId, onUploaded }: { entryId: string; onUploaded: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("id", entryId);
      fd.append("image", file);
      await fetch("/api/guestbook", { method: "PATCH", body: fd });
      onUploaded();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <img src={preview} alt="" className="h-10 w-10 rounded object-cover opacity-60" />
      ) : null}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="font-sans text-[14px] text-[#C8C4BE] hover:text-[#9C9890] transition-colors disabled:opacity-40"
      >
        {uploading ? "uploading…" : "+ add a photo"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="21" viewBox="0 0 12 16" fill="none" className={className}>
      <rect x="3" y="0.5" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 8C1 11.31 3.24 13.5 6 13.5C8.76 13.5 11 11.31 11 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="6" y1="13.5" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
