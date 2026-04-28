"use client";

import { useEffect, useState } from "react";
import type { PlaybookCard } from "@/app/api/playbook/route";

const DIR_STYLE: Record<string, { color: string; label: string; emoji: string }> = {
  LONG:  { color: "#06d6a0", label: "LONG",  emoji: "🚀" },
  SHORT: { color: "#ef4444", label: "SHORT", emoji: "🔻" },
  WAIT:  { color: "#94a3b8", label: "WAIT",  emoji: "⏸️" },
};

const CONF_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: "#06d6a0", label: "มั่นใจสูง" },
  medium: { color: "#ffd166", label: "ปานกลาง" },
  low:    { color: "#94a3b8", label: "ต่ำ" },
};

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Change signature per asset (what counts as "changed") ──
function cardSig(c: PlaybookCard): string {
  return [
    c.asset,
    c.direction,
    c.confidence,
    c.sources.score,
    c.sources.votes?.long_total ?? 0,
    c.sources.votes?.short_total ?? 0,
    c.sources.freshest_updated ?? "",
  ].join("|");
}

export function Playbook() {
  const [cards, setCards] = useState<PlaybookCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [lastFetch, setLastFetch] = useState<number>(0);
  // Track which cards just changed (for flash animation)
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [changedAt, setChangedAt] = useState<Record<string, number>>({});

  async function fetchCards() {
    try {
      const res = await fetch("/api/playbook");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const newCards: PlaybookCard[] = json.cards ?? [];

      // Detect changes vs previous state
      setCards((prev) => {
        if (prev.length > 0) {
          const prevSigs = new Map(prev.map((c) => [c.asset, cardSig(c)]));
          const justChanged = new Set<string>();
          const now = Date.now();
          const newChangedAt: Record<string, number> = {};
          for (const c of newCards) {
            const oldSig = prevSigs.get(c.asset);
            const newSig = cardSig(c);
            if (oldSig && oldSig !== newSig) {
              justChanged.add(c.asset);
              newChangedAt[c.asset] = now;
            }
          }
          if (justChanged.size > 0) {
            setChanged(justChanged);
            setChangedAt((p) => ({ ...p, ...newChangedAt }));
            // Clear flash after 3s
            setTimeout(() => {
              setChanged((cur) => {
                const next = new Set(cur);
                for (const a of justChanged) next.delete(a);
                return next;
              });
            }, 3000);
          }
        }
        return newCards;
      });

      setDisclaimer(json.disclaimer ?? "");
      setLastUpdated(json.timestamp ?? Date.now());
      setLastFetch(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCards();
    const id = setInterval(fetchCards, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every 10s so "updated Xs ago" stays fresh even between fetches
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="rounded-2xl border p-3.5"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-baseline gap-2">
          <div className="text-[13px] text-[color:var(--meteor)] uppercase tracking-wider font-bold">
            🎯 Playbook · Simple Trade Ideas
          </div>
          <span className="text-[12px] text-[color:var(--meteor)] font-mono">
            · สำหรับโจ้เฝ้ากราฟ 15m/1h/4h · auto-refresh 30s
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          {lastFetch > 0 && (
            <span
              className="text-[11px] font-mono inline-flex items-center gap-1"
              style={{
                color:
                  Date.now() - lastFetch < 35000
                    ? "var(--green-giant)"
                    : "var(--meteor)",
              }}
              title="Next auto-fetch in ≤30s"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    Date.now() - lastFetch < 35000
                      ? "var(--green-giant)"
                      : "var(--meteor)",
                  animation:
                    Date.now() - lastFetch < 2000
                      ? "playbookPulse 1s ease-out"
                      : "none",
                }}
              />
              fetched {timeAgo(new Date(lastFetch).toISOString())}
            </span>
          )}
          <button
            onClick={fetchCards}
            className="text-[11px] px-2 py-0.5 rounded font-mono border hover:opacity-80 transition"
            style={{
              borderColor: "var(--border)",
              color: "var(--meteor)",
            }}
            title="ดึงข้อมูลใหม่ตอนนี้"
          >
            ↻ refresh
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes playbookPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes playbookFlash {
          0% { box-shadow: 0 0 0 0 rgba(255, 209, 102, 0.7); }
          50% { box-shadow: 0 0 0 8px rgba(255, 209, 102, 0.15); }
          100% { box-shadow: 0 0 0 0 rgba(255, 209, 102, 0); }
        }
        .playbook-flash {
          animation: playbookFlash 2.5s ease-out;
        }
        @keyframes livePulseLong {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(6, 214, 160, 0.9), 0 0 14px rgba(6, 214, 160, 0.6);
            transform: scale(1);
            background-color: #06d6a0;
          }
          50% {
            box-shadow: 0 0 0 10px rgba(6, 214, 160, 0), 0 0 28px rgba(6, 214, 160, 0.95);
            transform: scale(1.1);
            background-color: #0ef5b4;
          }
        }
        @keyframes livePulseShort {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.9), 0 0 14px rgba(239, 68, 68, 0.6);
            transform: scale(1);
            background-color: #ef4444;
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0), 0 0 28px rgba(239, 68, 68, 0.95);
            transform: scale(1.1);
            background-color: #ff6b6b;
          }
        }
        @keyframes liveDotBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0;  transform: scale(0.5); }
        }
        @keyframes arrowBounceUp {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes arrowBounceDown {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(3px); }
        }
        .tag-live-long  { animation: livePulseLong  1.2s ease-in-out infinite; }
        .tag-live-short { animation: livePulseShort 1.2s ease-in-out infinite; }
        .live-dot       { animation: liveDotBlink   0.8s ease-in-out infinite; }
        .arrow-up       { animation: arrowBounceUp   0.8s ease-in-out infinite; display: inline-block; }
        .arrow-down     { animation: arrowBounceDown 0.8s ease-in-out infinite; display: inline-block; }
      `}</style>

      {loading && (
        <div className="text-center py-6 text-[color:var(--meteor)] text-sm">
          ⚓ loading playbook...
        </div>
      )}

      {error && (
        <div className="text-center py-3 text-[color:var(--red-dwarf)] text-sm font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((c) => {
          const dir = DIR_STYLE[c.direction];
          const conf = CONF_STYLE[c.confidence];
          return (
            <div
              key={c.asset}
              className={`rounded-xl border p-3.5 transition-all relative ${changed.has(c.asset) ? "playbook-flash" : ""}`}
              style={{
                backgroundColor: `${dir.color}08`,
                borderColor: changed.has(c.asset) ? "#ffd166" : `${dir.color}40`,
                borderWidth: changed.has(c.asset) ? "2px" : "1px",
              }}
            >
              {changed.has(c.asset) && (
                <span
                  className="absolute top-2 right-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "#ffd166",
                    color: "#000",
                  }}
                >
                  ✨ UPDATED
                </span>
              )}
              {/* Header: Asset + Price + Direction */}
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[17px] font-bold">{c.asset}</span>
                  <span className="text-[13px] font-mono text-[color:var(--meteor)]">
                    ${fmt(c.price)}
                  </span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: "var(--border)",
                      color: "var(--meteor)",
                      letterSpacing: "0.05em",
                    }}
                    title="มุมมองของ card นี้คือ intraday (15m/1h/4h) — ไม่ใช่ทิศ swing. ดู 1d bias ที่ ChopperBias card"
                  >
                    📅 INTRADAY 15m-4h
                  </span>
                </div>
                <span
                  className={`text-[14px] font-extrabold px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${
                    c.direction === "LONG"
                      ? "tag-live-long"
                      : c.direction === "SHORT"
                        ? "tag-live-short"
                        : ""
                  }`}
                  style={{
                    backgroundColor: dir.color,
                    color: "white",
                    letterSpacing: "0.5px",
                    textShadow:
                      c.direction !== "WAIT"
                        ? "0 0 8px rgba(255,255,255,0.5)"
                        : "none",
                  }}
                  title={
                    c.direction === "WAIT"
                      ? "รอสัญญาณ"
                      : "สถานะ live · อัพเดทตาม loop"
                  }
                >
                  {c.direction === "LONG" && (
                    <>
                      <span
                        className="live-dot inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "white" }}
                      />
                      <span className="arrow-up">▲</span>
                      {dir.label}
                      <span>{dir.emoji}</span>
                    </>
                  )}
                  {c.direction === "SHORT" && (
                    <>
                      <span
                        className="live-dot inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "white" }}
                      />
                      <span className="arrow-down">▼</span>
                      {dir.label}
                      <span>{dir.emoji}</span>
                    </>
                  )}
                  {c.direction === "WAIT" && (
                    <>
                      {dir.emoji} {dir.label}
                    </>
                  )}
                </span>
              </div>

              {/* Confidence badge + Stack score */}
              <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                <span
                  className="text-[11px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                  style={{
                    backgroundColor: `${conf.color}20`,
                    color: conf.color,
                  }}
                >
                  {conf.label}
                </span>
                {c.rr !== null && (
                  <span className="text-[12px] font-mono text-[color:var(--meteor)] font-bold">
                    RR 1:{c.rr}
                  </span>
                )}
                {c.sources.stack_score !== null && c.sources.stack_max !== null && (
                  <span
                    className="text-[12px] font-mono font-bold ml-auto px-2 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        c.sources.stack_score >= 6 ? "#06d6a020" :
                        c.sources.stack_score >= 2 ? "#06d6a015" :
                        c.sources.stack_score <= -6 ? "#ef444420" :
                        c.sources.stack_score <= -2 ? "#ef444415" :
                        "var(--border)",
                      color:
                        c.sources.stack_score >= 2 ? "#06d6a0" :
                        c.sources.stack_score <= -2 ? "#ef4444" :
                        "var(--meteor)",
                      border: "1px solid",
                      borderColor:
                        c.sources.stack_score >= 2 ? "#06d6a040" :
                        c.sources.stack_score <= -2 ? "#ef444440" :
                        "var(--border)",
                    }}
                    title={`Stack score: น้ำหนัก TF ทั้งหมดรวมกัน (1d×3, 4h×3, 1h×2, 1w×2, 15m×1) · max ±${c.sources.stack_max} · ${c.sources.stack_label ?? ""}`}
                  >
                    {c.sources.stack_label ?? ""} {c.sources.stack_score > 0 ? "+" : ""}{c.sources.stack_score}/{c.sources.stack_max}
                  </span>
                )}
              </div>

              {/* Funding warning banner */}
              {c.sources.funding_note && (
                <div
                  className="mb-2 px-2 py-1 rounded text-[12px] font-medium"
                  style={{
                    backgroundColor: "#ffd16615",
                    borderLeft: "3px solid #ffd166",
                    color: "#ffd166",
                  }}
                  title="Funding rate ต่อชั่วโมง — ถ้าเป็นบวกแปลว่า longs จ่าย shorts; ถ้าเป็นลบ shorts จ่าย longs; ค่าสุดขั้ว = ฝั่งใดฝั่งหนึ่งแน่นเกินไป → เสี่ยง squeeze"
                >
                  {c.sources.funding_note}
                </div>
              )}

              {/* One-liner */}
              <div className="text-[14px] mb-2.5 leading-snug text-[color:var(--starlight)]/95 font-medium">
                {c.one_liner}
              </div>

              {/* Entry / TP / SL */}
              {c.direction !== "WAIT" && (
                <div className="grid grid-cols-3 gap-1.5 mb-2.5 text-[13px] font-mono">
                  <div
                    className="rounded p-2 text-center"
                    style={{ backgroundColor: "var(--border)" }}
                  >
                    <div className="text-[11px] text-[color:var(--meteor)] uppercase font-bold">
                      Entry
                    </div>
                    <div className="font-bold text-[12px] leading-tight mt-0.5">
                      {c.entry_zone}
                    </div>
                  </div>
                  <div
                    className="rounded p-2 text-center"
                    style={{ backgroundColor: "#06d6a010" }}
                  >
                    <div className="text-[11px] uppercase font-bold" style={{ color: "#06d6a0" }}>
                      TP
                    </div>
                    <div className="font-bold text-[14px] mt-0.5" style={{ color: "#06d6a0" }}>
                      ${fmt(c.tp)}
                    </div>
                  </div>
                  <div
                    className="rounded p-2 text-center"
                    style={{ backgroundColor: "#ef444410" }}
                  >
                    <div className="text-[11px] uppercase font-bold" style={{ color: "#ef4444" }}>
                      SL
                    </div>
                    <div className="font-bold text-[14px] mt-0.5" style={{ color: "#ef4444" }}>
                      ${fmt(c.sl)}
                    </div>
                  </div>
                </div>
              )}

              {/* Triggers */}
              {c.triggers.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] text-[color:var(--meteor)] uppercase tracking-wider mb-1 font-bold">
                    🎯 Trigger
                  </div>
                  {c.triggers.map((t, i) => (
                    <div
                      key={i}
                      className="text-[13px] text-[color:var(--starlight)]/90 leading-snug mb-1"
                    >
                      • {t}
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {c.warnings.length > 0 && (
                <div className="mb-2">
                  {c.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="text-[12px] leading-snug mb-0.5 font-medium"
                      style={{ color: "#ff8c42" }}
                    >
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Robin bias + vote — เด่น อ่านไว */}
              {(c.sources.robin_bias || (c.sources.tallies && c.sources.tallies.length > 0)) && (
                <div
                  className="mt-2 pt-2 mb-2 border-t space-y-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  {c.sources.robin_bias && (
                    <div
                      className="text-[13px] font-bold flex items-baseline gap-1.5 flex-wrap"
                      style={{
                        color:
                          c.sources.robin_bias === "BULLISH"
                            ? "#06d6a0"
                            : c.sources.robin_bias === "BEARISH"
                              ? "#ef4444"
                              : "#a78bfa",
                      }}
                    >
                      <span>🏛️ INTRADAY {c.sources.robin_bias}</span>
                      <span className="text-[10px] font-normal text-[color:var(--meteor)]">
                        (โรบิน 15m–4h · ไม่ใช่ทิศ swing)
                      </span>
                    </div>
                  )}
                  {c.sources.votes && (
                    <div
                      className="space-y-1 text-[12px] font-mono"
                      title={
                        "น้ำหนัก voters:\n" +
                        "• 4h = 3 (TF หลัก)\n" +
                        "• 1d / 1h / Robin / Nami = 2\n" +
                        "• 15m / Mihawk = 1\n\n" +
                        "หมายเหตุ:\n" +
                        "• 15m นับเฉพาะเมื่อตรงกับ 1h\n" +
                        "• Mihawk โหวตเฉพาะ RSI extreme\n" +
                        "• 1d weight=2 เพราะ lag — score นี้เหมาะ scalp 15m-4h ไม่ใช่ swing 1d+"
                      }
                    >
                      {/* LONG row */}
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold" style={{ color: "#06d6a0" }}>
                          🟢 LONG
                        </span>
                        <span className="text-[color:var(--meteor)]">──</span>
                        {c.sources.votes.long.length === 0 ? (
                          <span className="text-[color:var(--meteor)]">—</span>
                        ) : (
                          c.sources.votes.long.map((v) => (
                            <span key={v.tf} className="text-[color:var(--starlight)]/85">
                              {v.tf}
                              <span className="text-[color:var(--meteor)]">({v.weight})</span>
                            </span>
                          ))
                        )}
                        <span className="ml-auto font-bold text-[14px]" style={{ color: "#06d6a0" }}>
                          = {c.sources.votes.long_total}
                        </span>
                      </div>
                      {/* SHORT row */}
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold" style={{ color: "#ef4444" }}>
                          🔴 SHORT
                        </span>
                        <span className="text-[color:var(--meteor)]">──</span>
                        {c.sources.votes.short.length === 0 ? (
                          <span className="text-[color:var(--meteor)]">—</span>
                        ) : (
                          c.sources.votes.short.map((v) => (
                            <span key={v.tf} className="text-[color:var(--starlight)]/85">
                              {v.tf}
                              <span className="text-[color:var(--meteor)]">({v.weight})</span>
                            </span>
                          ))
                        )}
                        <span className="ml-auto font-bold text-[14px]" style={{ color: "#ef4444" }}>
                          = {c.sources.votes.short_total}
                        </span>
                      </div>
                      {/* Winner */}
                      <div className="text-[11px] text-[color:var(--meteor)] pt-0.5">
                        →{" "}
                        {c.sources.votes.long_total > c.sources.votes.short_total ? (
                          <span style={{ color: "#06d6a0" }} className="font-bold">
                            โน้มไป LONG {c.sources.votes.long_total}-{c.sources.votes.short_total}
                          </span>
                        ) : c.sources.votes.short_total > c.sources.votes.long_total ? (
                          <span style={{ color: "#ef4444" }} className="font-bold">
                            โน้มไป SHORT {c.sources.votes.short_total}-{c.sources.votes.long_total}
                          </span>
                        ) : (
                          <span className="font-bold">
                            เสมอ {c.sources.votes.long_total}-{c.sources.votes.short_total}
                          </span>
                        )}
                        {c.sources.votes.neutral.length > 0 && (
                          <span className="ml-1 text-[color:var(--meteor)]">
                            · ไซด์: {c.sources.votes.neutral.map((n) => n.tf).join(" ")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Structural Context — warn when intraday vote conflicts with 1d trend */}
              {(() => {
                const t1d = c.sources.trends?.["1d"];
                const vLong = c.sources.votes?.long_total ?? 0;
                const vShort = c.sources.votes?.short_total ?? 0;
                const winner = vLong > vShort ? "long" : vShort > vLong ? "short" : null;
                const conflict =
                  winner === "short" && t1d === "up"
                    ? { label: "pullback ใน uptrend", tone: "up" as const }
                    : winner === "long" && t1d === "down"
                      ? { label: "bounce ใน downtrend", tone: "down" as const }
                      : null;
                if (!conflict) return null;
                const color = conflict.tone === "up" ? "#06d6a0" : "#ef4444";
                const dir = conflict.tone === "up" ? "UP" : "DOWN";
                return (
                  <div
                    className="mt-2 mb-2 p-2 rounded-md text-[12px] leading-snug border-l-4"
                    style={{
                      backgroundColor: `${color}14`,
                      borderLeftColor: color,
                      borderTop: "1px solid var(--border)",
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div className="font-bold flex items-center gap-1" style={{ color }}>
                      ⚠️ ขัดกับ 1d (ยัง {dir})
                    </div>
                    <div className="text-[color:var(--starlight)]/85 mt-0.5">
                      นี่คือ <b>{conflict.label}</b> — ไม่ใช่ trend flip
                    </div>
                    <div className="text-[11px] text-[color:var(--meteor)] mt-0.5">
                      เหมาะ scalp 15m–4h · ไม่เหมาะ swing ทิศสวน 1d
                    </div>
                  </div>
                );
              })()}

              {/* Per-source freshness */}
              <div
                className="mt-2 pt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] font-mono border-t"
                style={{ borderColor: "var(--border)" }}
                title="เวลาล่าสุดที่แต่ละลูกเรือ log"
              >
                {[
                  { label: "🦌", ts: c.sources.chopper_updated, name: "Chopper" },
                  { label: "🦅", ts: c.sources.mihawk_updated, name: "Mihawk" },
                  { label: "🗺️", ts: c.sources.nami_updated, name: "Nami" },
                  { label: "🏛️", ts: c.sources.robin_updated, name: "Robin" },
                ].map((s) => {
                  if (!s.ts) {
                    return (
                      <span
                        key={s.name}
                        className="text-[color:var(--meteor)]/50"
                        title={`${s.name}: ไม่มีข้อมูล`}
                      >
                        {s.label}—
                      </span>
                    );
                  }
                  const ageSec = (Date.now() - new Date(s.ts).getTime()) / 1000;
                  const fresh = ageSec < 20 * 60;
                  return (
                    <span
                      key={s.name}
                      style={{
                        color: fresh ? "var(--green-giant)" : "var(--meteor)",
                      }}
                      title={`${s.name} ${timeAgo(s.ts)}`}
                    >
                      {s.label}
                      {timeAgo(s.ts)}
                    </span>
                  );
                })}
              </div>

              {/* Raw sources footer */}
              <div
                className="mt-1.5 pt-1.5 text-[11px] font-mono text-[color:var(--meteor)] leading-relaxed border-t"
                style={{ borderColor: "var(--border)" }}
              >
                {c.sources.trends && (
                  <div>
                    {Object.entries(c.sources.trends)
                      .map(([tf, d]) => {
                        const dirEmoji = d === "up" ? "🟢" : d === "down" ? "🔴" : "⚪";
                        const m = c.sources.maturity?.[tf];
                        const mTag =
                          m === "extended_up" ? "🔥" :
                          m === "extended_down" ? "🧊" :
                          m === "fresh_up" || m === "fresh_down" ? "✨" : "";
                        const v = c.sources.volume_flags?.[tf];
                        const vTag = v === "high" ? "🔊" : v === "low" ? "🔈" : "";
                        const adx = c.sources.adx?.[tf];
                        const adxTag = adx?.tier === "strong" ? "💪" : adx?.tier === "weak" ? "😴" : "";
                        const sq = (c.sources.squeeze_tfs ?? []).includes(tf) ? "🎯" : "";
                        const mf = c.sources.macd_flip?.[tf];
                        const mfTag = mf === "up" ? "📈" : mf === "down" ? "📉" : "";
                        return `${tf}:${dirEmoji}${mTag}${vTag}${adxTag}${sq}${mfTag}`;
                      })
                      .join(" ")}
                  </div>
                )}
                {/* Tier-2 structure strip */}
                {c.sources.structure && Object.keys(c.sources.structure).length > 0 && (
                  <div
                    className="mt-0.5"
                    title="Structure: HH_HL = uptrend ยืนยัน, LH_LL = downtrend ยืนยัน, HH_LL = volatile, LH_HL = consolidate"
                  >
                    struct:{" "}
                    {Object.entries(c.sources.structure)
                      .map(([tf, st]) => `${tf}=${st}`)
                      .join(" ")}
                  </div>
                )}
                {c.sources.rsi.length > 0 && (
                  <div>
                    RSI:{" "}
                    {c.sources.rsi
                      .map((r) => `${r.tf}=${r.value}`)
                      .join(" ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {disclaimer && (
        <div className="mt-3 text-[10px] text-[color:var(--meteor)]/70 text-center italic">
          {disclaimer}
        </div>
      )}
    </section>
  );
}
