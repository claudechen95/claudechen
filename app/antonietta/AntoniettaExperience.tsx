"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "../guestbook/BackButton";

const PHOTOS = Array.from({ length: 14 }, (_, i) => `/antonietta/toni-${String(i + 1).padStart(2, "0")}.jpg`);

const EAT_PHOTOS = ["/antonietta/eat/pizza.jpg", "/antonietta/eat/poke.jpg", "/antonietta/eat/pastry.jpg"];

const TILE_ROTATE = ["-rotate-2", "rotate-2", "-rotate-1", "rotate-1"];

const NAV = [
  { id: "cover", label: "" },
  { id: "intro", label: "" },
  { id: "places", label: "Places" },
  { id: "people", label: "People" },
  { id: "plans", label: "Plans" },
  { id: "praises", label: "Praises" },
  { id: "pictures", label: "Pictures" },
  { id: "peace", label: "Peace" },
  { id: "pizzas", label: "Pizzas" },
];

function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.3,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function Slide({
  id,
  onActive,
  children,
  align = "center",
  wide = false,
}: {
  id: string;
  onActive: (id: string) => void;
  children: React.ReactNode;
  align?: "center" | "start";
  wide?: boolean;
}) {
  const { ref, inView } = useReveal();

  useEffect(() => {
    if (inView) onActive(id);
  }, [inView, id, onActive]);

  return (
    <section
      id={id}
      ref={ref as React.RefObject<HTMLElement>}
      className={`min-h-screen w-full snap-start flex flex-col px-6 sm:px-8 py-28 ${
        align === "center" ? "justify-center items-center" : "justify-start items-center"
      }`}
    >
      <div
        className={`w-full ${wide ? "max-w-3xl lg:max-w-4xl" : "max-w-xl"} transition-all duration-[900ms] ease-out ${
          inView ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-10 blur-[2px]"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif italic text-[#B08D6A] text-[26px] sm:text-[30px] mb-8 text-center">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif text-[#2a2520] text-[18px] sm:text-[19px] leading-[1.9] mb-4">
      {children}
    </p>
  );
}

function Ornament() {
  return <div className="w-8 h-px bg-[#D9C7B8] mx-auto mb-8" />;
}

function Lightbox({
  index,
  onClose,
  onNavigate,
}: {
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((index + 1) % PHOTOS.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + PHOTOS.length) % PHOTOS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, onClose, onNavigate]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) onNavigate((index - 1 + PHOTOS.length) % PHOTOS.length);
    else if (delta < -50) onNavigate((index + 1) % PHOTOS.length);
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={onClose}
        aria-label="close"
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors font-sans text-[28px] leading-none"
      >
        &times;
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((index - 1 + PHOTOS.length) % PHOTOS.length);
        }}
        aria-label="previous"
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 items-center justify-center w-11 h-11 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors font-sans text-[22px]"
      >
        &#8249;
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((index + 1) % PHOTOS.length);
        }}
        aria-label="next"
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 items-center justify-center w-11 h-11 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors font-sans text-[22px]"
      >
        &#8250;
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white p-2 sm:p-3 shadow-2xl max-w-[92vw] max-h-[85vh]"
      >
        <img
          src={PHOTOS[index]}
          alt=""
          className="max-w-[86vw] sm:max-w-[80vw] max-h-[76vh] w-auto h-auto object-contain block select-none"
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-sans text-[12px] tracking-wide text-white/50">
        {index + 1} / {PHOTOS.length}
      </div>
    </div>
  );
}

const PASSWORD = "112233";
const UNLOCK_KEY = "antonietta-unlocked";

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

function PasswordGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(UNLOCK_KEY) === "true") setUnlocked(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (entered.length < PASSWORD.length) return;
    if (entered === PASSWORD) {
      localStorage.setItem(UNLOCK_KEY, "true");
      setUnlocked(true);
      return;
    }
    setError(true);
    const t = setTimeout(() => {
      setError(false);
      setEntered("");
    }, 500);
    return () => clearTimeout(t);
  }, [entered]);

  const press = (key: string) => {
    if (error) return;
    if (key === "del") {
      setEntered((s) => s.slice(0, -1));
    } else if (key && entered.length < PASSWORD.length) {
      setEntered((s) => s + key);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, error]);

  if (!ready) return <div className="min-h-screen bg-[#F8F7F3]" />;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F8F7F3] flex items-center justify-center px-8">
      <div className="w-full max-w-[280px] text-center">
        <p className="font-serif italic text-[#2a2520] text-[24px] mb-2">Dear Antonietta</p>
        <p className="font-sans text-[12px] tracking-[0.15em] uppercase text-[#9C9890] mb-9">
          enter passcode
        </p>

        <div className={`flex justify-center gap-4 mb-12 ${error ? "animate-shake" : ""}`}>
          {Array.from({ length: PASSWORD.length }).map((_, i) => (
            <span
              key={i}
              className="rounded-full border transition-colors duration-150"
              style={{
                width: 12,
                height: 12,
                borderColor: error ? "#C77B6E" : "#B08D6A",
                backgroundColor: i < entered.length ? (error ? "#C77B6E" : "#B08D6A") : "transparent",
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-4 justify-items-center">
          {KEYPAD.map((key, i) =>
            key ? (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                aria-label={key === "del" ? "delete" : key}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-sans text-[22px] text-[#2a2520] transition-transform duration-150 active:scale-90 active:bg-[#F0EBE3]"
              >
                {key === "del" ? "⌫" : key}
              </button>
            ) : (
              <div key={i} className="w-16 h-16" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function AntoniettaContent() {
  const [active, setActive] = useState("cover");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const handleActive = useCallback((id: string) => setActive(id), []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative bg-[#F8F7F3]">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(176,141,106,0.08), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(176,141,106,0.06), transparent 60%)",
        }}
      />

      <div className="fixed top-0 left-0 right-0 z-20 px-8 pt-8 pointer-events-none">
        <div className="max-w-2xl mx-auto flex justify-start pointer-events-auto">
          <BackButton />
        </div>
      </div>

      <nav className="fixed right-5 sm:right-8 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col items-end gap-3">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => scrollTo(n.id)}
            className="group flex items-center gap-2"
            aria-label={n.label || "cover"}
          >
            <span
              className={`font-sans text-[10px] tracking-wide uppercase transition-colors duration-300 ${
                active === n.id ? "text-[#B08D6A]" : "text-transparent group-hover:text-[#C8B9A6]"
              }`}
            >
              {n.label}
            </span>
            <span
              className="rounded-full transition-all duration-300"
              style={{
                width: active === n.id ? 8 : 5,
                height: active === n.id ? 8 : 5,
                backgroundColor: active === n.id ? "#B08D6A" : "#D9D2C8",
              }}
            />
          </button>
        ))}
      </nav>

      <main className="relative z-10 h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Slide id="cover" onActive={handleActive}>
          <div className="text-center">
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#9C9890] mb-6">
              August 11, 2026
            </p>
            <h1 className="font-serif italic text-[#2a2520] text-[40px] sm:text-[52px] leading-tight mb-10">
              Dear Antonietta
            </h1>
            <Ornament />
            <div className="animate-pulse-strong">
              <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#B0A99E]">
                scroll
              </span>
            </div>
          </div>
        </Slide>

        <Slide id="intro" onActive={handleActive}>
          <div className="text-center">
            <p className="font-serif italic text-[#2a2520] text-[24px] sm:text-[30px] leading-snug">
              Three perfect weeks.
              <br />
              I miss you already.
            </p>
          </div>
        </Slide>

        <Slide id="places" onActive={handleActive}>
          <Heading>Places to be..</Heading>
          <P>
            I can still feel you in my arms in the water in Lake Tahoe. Us lying on the rock. Sunsets at
            baker beach. Running with you at crissy field - I dont think I've ever run 5k. You made
            running cool again :p
          </P>
        </Slide>

        <Slide id="people" onActive={handleActive}>
          <Heading>People to see..</Heading>
          <P>
            Introducing you to Alan and listening to you two having the mundane conversation was the
            simple joy I never had.
          </P>
        </Slide>

        <Slide id="plans" onActive={handleActive}>
          <Heading>Plans to delete..</Heading>
          <P>
            From a random Japanese restaurant in Shanghai to the best cappuccino in little Italy, I know
            I'd have had a good time no matter where we ended up. Now the plans I don't have to make are
            the ones I'll miss most.
          </P>
        </Slide>

        <Slide id="praises" onActive={handleActive} align="start">
          <Heading>Praises to repeat..</Heading>
          <P>I love it when you bat your eyes at me. You have no idea how adorable you look when you do that.</P>
          <P>
            I love how genuinely unpretentious you are. I've never taken a girl to Subway before, and I
            love how you were able to appreciate even a moment like that. Panda Express takeout in the
            park, sunsets, snuggling — you enjoy the simple things, unapologetically.
          </P>
          <P>
            I love how independent you are. You never complained about my working too much — you'd
            remind me to go work when I was the one caving to the idea of spending more time with you
            instead.
          </P>
          <P>
            I love how level-headed and open-minded you are. I never told you this directly, but I always
            felt like I could air out my most outrageous opinions and you'd still give them the benefit of
            the doubt. Even today, on a day like this, you can feel the emotion of it without letting it
            carry your judgment away.
          </P>
          <P>
            I love how peaceful you are. In a world where everyone's chasing status, you seem genuinely
            unbothered by all of it — comfortable just being, without wanting extra.
          </P>
          <P>
            You said I'm affectionate, but I'm not naturally a physically affectionate person. You built a
            space safe enough that I became one anyway.
          </P>
        </Slide>

        <Slide id="pictures" onActive={handleActive} align="start" wide>
          <Heading>Pictures to peep..</Heading>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PHOTOS.map((src, i) => (
              <div
                key={src}
                onClick={() => setLightboxIndex(i)}
                className={`group relative overflow-hidden bg-white p-1.5 shadow-[0_3px_14px_rgba(0,0,0,0.12)] cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)] active:scale-[0.97] ${TILE_ROTATE[i % TILE_ROTATE.length]}`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="w-full aspect-square object-cover block transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </Slide>

        <Slide id="peace" onActive={handleActive}>
          <Heading>Peace to keep..</Heading>
          <blockquote className="font-serif italic text-[#2a2520] text-[19px] sm:text-[20px] leading-[1.9] mb-6 pl-5 border-l-2 border-[#D9C7B8]">
            "To feel it's possible to be loved and to love is a truly beautiful thing."
            <footer className="not-italic text-[#9C9890] text-[14px] mt-2">
              — Toni (or Toby.. depending on location)
            </footer>
          </blockquote>
          <P>
            These past three weeks I felt safe, loved, relaxed, and accepted. It's the most I've laughed,
            and the most peaceful I've been in a very, very long time. Thank you.
          </P>
        </Slide>

        <Slide id="pizzas" onActive={handleActive}>
          <div className="text-center">
            <Heading>(Bonus) Pizzas/Poke/Pastry to eat..</Heading>
            <Ornament />
            <div className="flex justify-center gap-5 sm:gap-7 mt-2">
              {EAT_PHOTOS.map((src, i) => (
                <div
                  key={src}
                  className={`bg-white p-2 pb-4 shadow-[0_4px_16px_rgba(0,0,0,0.12)] w-24 sm:w-36 ${
                    TILE_ROTATE[i % TILE_ROTATE.length]
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="w-full aspect-square object-cover block" />
                </div>
              ))}
            </div>
          </div>
        </Slide>
      </main>

      {lightboxIndex !== null && (
        <Lightbox
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

export default function AntoniettaExperience() {
  return (
    <PasswordGate>
      <AntoniettaContent />
    </PasswordGate>
  );
}
