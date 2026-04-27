"use client";

import { useEffect, useState } from "react";

type Card = {
  asset: string;
  price?: number;
  direction?: string;
  verdict_reasons?: string[];
  one_liner?: string;
  confidence?: string;
  triggers?: string[];
  warnings?: string[];
};

type Playbook = {
  cards?: Card[];
};

const REFRESH_MS = 15_000;

export function CaptainLog() {
  const [cards, setCards] = useState<Card[]>([]);
  const [lastTick, setLastTick] = useState<number | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/playbook", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: Playbook = await r.json();
        if (!mounted) return;
        setCards(Array.isArray(d.cards) ? d.cards : []);
        setLastTick(Date.now());
        setError(null);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!lastTick) return;
    const id = setInterval(() => {
      setSecondsSince(Math.floor((Date.now() - lastTick) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastTick]);

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--green-giant)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--green-giant)]" />
          </span>
          <h2 className="font-bold text-lg">Captain log</h2>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
          {error
            ? `error · ${error}`
            : lastTick
              ? `last scan ${secondsSince}s ago · refresh 15s`
              : "scanning…"}
        </div>
      </div>
      <p className="text-xs text-[color:var(--meteor)] mb-4">
        Sample-of-one feed from the founder&apos;s account. Each card is what
        the captain sees right now and the conditions to enter.
      </p>

      {cards.length === 0 ? (
        <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
          {error ? "Could not reach captain feed." : "Captains warming up…"}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <CardEntry key={c.asset} card={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function directionTone(direction?: string): string {
  if (!direction) return "var(--meteor)";
  const d = direction.toUpperCase();
  if (d.includes("LONG")) return "var(--green-giant)";
  if (d.includes("SHORT")) return "var(--red-dwarf)";
  return "var(--polaris)";
}

function CardEntry({ card }: { card: Card }) {
  const tone = directionTone(card.direction);
  return (
    <li
      className="rounded-xl border bg-[color:var(--surface-2)] p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: tone }}
          >
            {card.asset}
          </span>
          {card.direction && (
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: tone }}
            >
              {card.direction.replace(/_/g, " ")}
            </span>
          )}
        </div>
        {typeof card.price === "number" && (
          <span className="text-xs font-mono text-[color:var(--meteor)]">
            ${formatPrice(card.price)}
          </span>
        )}
      </div>

      {card.one_liner && (
        <p className="mt-2 text-sm text-[color:var(--starlight)] leading-snug">
          {card.one_liner}
        </p>
      )}

      {card.verdict_reasons && card.verdict_reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-[color:var(--meteor)] leading-relaxed">
          {card.verdict_reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="break-words">
              {r}
            </li>
          ))}
        </ul>
      )}

      {card.triggers && card.triggers.length > 0 && (
        <details className="mt-3 group">
          <summary className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)] cursor-pointer hover:text-[color:var(--starlight)]">
            Entry triggers ({card.triggers.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-[color:var(--meteor)]">
            {card.triggers.map((t, i) => (
              <li key={i} className="break-words pl-3 border-l border-[color:var(--border)]">
                {t}
              </li>
            ))}
          </ul>
        </details>
      )}

      {card.warnings && card.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-[color:var(--red-dwarf)]">
          {card.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toPrecision(4);
}
