"use client";

import { useEffect, useState } from "react";
import { Constellation } from "./Constellation";
import { FLEET } from "./CaptainCard";

type Card = {
  asset: string;
  price?: number;
  direction?: string;
  verdict_reasons?: string[];
  one_liner?: string;
  confidence?: string;
  triggers?: string[];
  warnings?: string[];
  tp?: number | null;
  sl?: number | null;
  rr?: number | null;
  entry_zone?: string;
};

type Playbook = {
  cards?: Card[];
};

const REFRESH_MS = 30_000;

export function CaptainPlan() {
  const [cards, setCards] = useState<Card[]>([]);
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

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
            Captain&apos;s Plan
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            What each captain is watching
          </h2>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
          refresh 30s
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--red-dwarf)]/40 bg-[color:var(--red-dwarf)]/10 px-4 py-3 text-xs text-[color:var(--meteor)]">
          Could not reach playbook: {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {FLEET.map((captain) => {
          const card = cards.find(
            (c) => c.asset.toUpperCase() === captain.asset.toUpperCase(),
          );
          return (
            <CaptainPlanCard
              key={captain.key}
              captain={captain}
              card={card}
            />
          );
        })}
      </div>
    </section>
  );
}

function CaptainPlanCard({
  captain,
  card,
}: {
  captain: (typeof FLEET)[number];
  card?: Card;
}) {
  const tone = directionTone(card?.direction);
  return (
    <article
      className="relative overflow-hidden rounded-2xl border bg-[color:var(--surface)] p-5"
      style={{
        borderColor: card ? `${captain.color.replace("var(--", "").replace(")", "")}33` : "var(--border)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: captain.color }}
      />

      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-[10px] uppercase tracking-widest font-mono"
            style={{ color: captain.color }}
          >
            {captain.asset}
          </div>
          <h3 className="mt-1 font-bold text-lg">{captain.name}</h3>
          <div className="text-xs text-[color:var(--meteor)] mt-0.5">
            {captain.tagline}
          </div>
        </div>
        <Constellation name={captain.key} color={captain.color} size={56} />
      </div>

      {!card ? (
        <div className="mt-5 text-sm text-[color:var(--meteor)]">
          No active read. Captain is observing.
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-3 flex-wrap">
            {card.direction && (
              <span
                className="text-[10px] font-mono uppercase tracking-widest font-bold"
                style={{ color: tone }}
              >
                {card.direction.replace(/_/g, " ")}
              </span>
            )}
            {typeof card.price === "number" && (
              <span className="text-xs font-mono text-[color:var(--meteor)]">
                @ ${formatPrice(card.price)}
              </span>
            )}
            {card.confidence && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
                {card.confidence}
              </span>
            )}
          </div>

          {card.one_liner && (
            <p className="mt-3 text-sm text-[color:var(--starlight)] leading-snug">
              {card.one_liner}
            </p>
          )}

          {(card.tp || card.sl) && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
              {card.tp && (
                <div className="rounded-lg bg-[color:var(--surface-2)] p-2">
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
                    TP
                  </div>
                  <div className="text-[color:var(--green-giant)]">
                    ${formatPrice(card.tp)}
                  </div>
                </div>
              )}
              {card.sl && (
                <div className="rounded-lg bg-[color:var(--surface-2)] p-2">
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
                    SL
                  </div>
                  <div className="text-[color:var(--red-dwarf)]">
                    ${formatPrice(card.sl)}
                  </div>
                </div>
              )}
            </div>
          )}

          {card.verdict_reasons && card.verdict_reasons.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-[color:var(--meteor)] leading-relaxed">
              {card.verdict_reasons.slice(0, 3).map((r, i) => (
                <li key={i} className="break-words">
                  {r}
                </li>
              ))}
            </ul>
          )}

          {card.triggers && card.triggers.length > 0 && (
            <details className="mt-4">
              <summary className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)] cursor-pointer hover:text-[color:var(--starlight)]">
                Entry triggers ({card.triggers.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-[color:var(--meteor)]">
                {card.triggers.map((t, i) => (
                  <li
                    key={i}
                    className="break-words pl-3 border-l border-[color:var(--border)]"
                  >
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
        </>
      )}
    </article>
  );
}

function directionTone(direction?: string): string {
  if (!direction) return "var(--meteor)";
  const d = direction.toUpperCase();
  if (d.includes("LONG")) return "var(--green-giant)";
  if (d.includes("SHORT")) return "var(--red-dwarf)";
  return "var(--polaris)";
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toPrecision(4);
}
