"use client";

import { useEffect, useState } from "react";
import type { PlaybookCard, TFPlan, RiskHeat, TPNow, EntryStatus } from "@/app/api/playbook/route";

// ── Entry style toggle: Pullback (60%) / Confirmation (40%) / Both ──
type EntryStyle = "pullback" | "confirmation" | "both";

const STATUS_STYLE: Record<EntryStatus, { color: string; bg: string; label: string }> = {
  active:  { color: "#06d6a0", bg: "rgba(6,214,160,0.18)", label: "ACTIVE" },
  close:   { color: "#ffd166", bg: "rgba(255,209,102,0.18)", label: "CLOSE" },
  waiting: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "WAITING" },
  missed:  { color: "#64748b", bg: "rgba(100,116,139,0.10)", label: "MISSED" },
};

// ── TF picker state (sticky in localStorage) ──
type TF = "15m" | "1h" | "4h" | "1d";
const TFS: TF[] = ["15m", "1h", "4h", "1d"];
const TF_LABEL: Record<TF, string> = {
  "15m": "15m · scalp 1-4h",
  "1h":  "1h · intraday 4-24h",
  "4h":  "4h · swing 1-3d",
  "1d":  "1d · position 1-3w",
};

const RISK_TIER_STYLE: Record<RiskHeat["tier"], { color: string; bg: string; label: string }> = {
  low:      { color: "#06d6a0", bg: "rgba(6, 214, 160, 0.12)",  label: "LOW" },
  elevated: { color: "#ffd166", bg: "rgba(255, 209, 102, 0.12)", label: "ELEVATED" },
  high:     { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)",  label: "HIGH" },
  critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.18)",   label: "CRITICAL" },
};

function fmt(n: number | null | undefined, opts?: { decimals?: number }): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  // Tier decimals by magnitude — kPEPE at $0.004 needs 6dp or TP/SL/Entry collapse
  // to the same rounded value (e.g. 0.003965 vs 0.003940 → both "0.0040" at 4dp).
  const d = opts?.decimals ?? (
    abs >= 100  ? 2 :
    abs >= 0.01 ? 4 :
    6
  );
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}
function pct(a: number, b: number): string {
  if (b === 0) return "—";
  return ((a - b) / b * 100).toFixed(2);
}

// ── Compute "what if I enter at price X?" ──
// SL/TP เป็น level ผูกกับโครงสร้าง (S/R) ไม่ใช่ entry → keep TP/SL fixed, recompute RR
function rrAtEntry(entry: number, tp: number, sl: number): number | null {
  const reward = Math.abs(tp - entry);
  const risk   = Math.abs(entry - sl);
  if (risk <= 0) return null;
  return Math.round((reward / risk) * 10) / 10;
}

// ── Trade Bias Gauge: -10 (SHORT) ←→ +10 (LONG) ──
// รวม Captain's Verdict + Dump/Pump + RR เป็นตัวเลขเดียว
// User ดู bar เอียงทางไหน ก็รู้ทันทีว่าควร LONG/SHORT/WAIT
function computeTradeBias(card: PlaybookCard, tf: TF): {
  score: number;        // -10 to +10
  label: string;
  color: string;
  reasoning: string[];
} {
  const plan = card.tf_plans?.[tf];
  const isFullPlan = plan && !("bias_only" in plan);
  const fullPlan = isFullPlan ? (plan as TFPlan) : null;
  const dump = card.risk_heat?.dump_risk?.score ?? 0;
  const pump = card.risk_heat?.pump_risk?.score ?? 0;

  // Base from Captain's Verdict (synthesizes Robin + multi-TF + Risk Heat precedence)
  // Trend verdicts (LONG/SHORT) have higher conviction than range verdicts
  let base = 0;
  if (card.direction === "LONG")            base = 5;
  else if (card.direction === "SHORT")      base = -5;
  else if (card.direction === "RANGE_LONG") base = 3;   // lower conviction
  else if (card.direction === "RANGE_SHORT")base = -3;
  // WAIT or CAUTION → 0

  // Risk lean: Pump pushes upward, Dump pushes downward (-5 to +5)
  const riskLean = (pump - dump) / 2;

  // RR adjustment based on the leaning direction's RR
  let rrAdj = 0;
  const tentativeScore = base + riskLean;
  const reasoning: string[] = [];

  if (fullPlan) {
    if (tentativeScore > 0) {
      // Leaning LONG — check long RR
      if (fullPlan.long.rr >= 2)       rrAdj = 1;
      else if (fullPlan.long.rr < 1)   rrAdj = -1;
    } else if (tentativeScore < 0) {
      // Leaning SHORT — check short RR
      if (fullPlan.short.rr >= 2)      rrAdj = 1;
      else if (fullPlan.short.rr < 1)  rrAdj = -1;
    }
  }

  let score = base + riskLean + rrAdj;
  // Clamp to [-10, +10]
  score = Math.max(-10, Math.min(10, score));
  score = Math.round(score * 10) / 10;

  // Reasoning chips (top contributors)
  if (card.direction === "LONG")            reasoning.push("Captain LONG (Trend)");
  else if (card.direction === "SHORT")      reasoning.push("Captain SHORT (Trend)");
  else if (card.direction === "RANGE_LONG") reasoning.push("Captain LONG (Range)");
  else if (card.direction === "RANGE_SHORT")reasoning.push("Captain SHORT (Range)");
  else                                      reasoning.push(`Captain ${card.direction}`);
  if (Math.abs(pump - dump) >= 2) {
    reasoning.push(`${pump > dump ? "Pump" : "Dump"} ${Math.max(pump, dump)}/10 dominant`);
  }
  if (fullPlan) {
    if (tentativeScore > 0 && fullPlan.long.rr >= 2)
      reasoning.push(`LONG RR ${fullPlan.long.rr.toFixed(1)} ✓`);
    else if (tentativeScore > 0 && fullPlan.long.rr < 1)
      reasoning.push(`LONG RR ${fullPlan.long.rr.toFixed(1)} ไม่คุ้ม`);
    if (tentativeScore < 0 && fullPlan.short.rr >= 2)
      reasoning.push(`SHORT RR ${fullPlan.short.rr.toFixed(1)} ✓`);
    else if (tentativeScore < 0 && fullPlan.short.rr < 1)
      reasoning.push(`SHORT RR ${fullPlan.short.rr.toFixed(1)} ไม่คุ้ม`);
  }

  // Tier label + color
  let label: string, color: string;
  if (score >= 7)        { label = "🚀 STRONG LONG";  color = "#06d6a0"; }
  else if (score >= 4)   { label = "🟢 LONG";          color = "#06d6a0"; }
  else if (score >= 2)   { label = "🟢 lean LONG";     color = "#a3e635"; }
  else if (score <= -7)  { label = "💥 STRONG SHORT"; color = "#ef4444"; }
  else if (score <= -4)  { label = "🔴 SHORT";         color = "#ef4444"; }
  else if (score <= -2)  { label = "🔴 lean SHORT";    color = "#fb7185"; }
  else                   { label = "⚪ WAIT";          color = "#94a3b8"; }

  return { score, label, color, reasoning };
}

// ─────────── Check Trade Modal ───────────
function CheckTradeModal({
  card,
  tf: initialTf,
  initialPrice,
  onClose,
}: {
  card: PlaybookCard;
  tf: TF;
  initialPrice: number;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState<string>(initialPrice.toString());
  // Local TF state — user can switch TF within modal without closing
  const [tf, setTf] = useState<TF>(initialTf);
  const [side, setSide] = useState<"long" | "short">(
    (card.tf_plans?.[initialTf] as TFPlan | null)?.direction === "short" ? "short" : "long",
  );

  // Fix #7: Escape key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const plan = card.tf_plans?.[tf];
  const isFullPlan = plan && !("bias_only" in plan);
  const fullPlan = isFullPlan ? (plan as TFPlan) : null;

  // ── Fix #3: Plan freshness — drift between agent's plan price + current price ──
  // SL/TP จาก plan = ราคาตอนที่ agent log (~5 นาที ก่อน)
  // ถ้า price drift > 0.5% = stale, ควรเตือน user
  const planAge = card.sources.chopper_updated
    ? Math.floor((Date.now() - new Date(card.sources.chopper_updated).getTime()) / 1000)
    : null;
  const planAgeText = planAge === null ? "—"
    : planAge < 60 ? `${planAge}s ago`
    : `${Math.floor(planAge / 60)}m ago`;
  const planEntry = fullPlan?.entry ?? null;
  const drift = (planEntry && initialPrice > 0)
    ? Math.abs(initialPrice - planEntry) / planEntry * 100
    : 0;
  const isStale = drift >= 0.5 || (planAge !== null && planAge > 600);

  const entryNum = parseFloat(entry);
  const validEntry = !isNaN(entryNum) && entryNum > 0;

  const sidePlan = fullPlan ? fullPlan[side] : null;
  const recomputedRR = (sidePlan && validEntry)
    ? rrAtEntry(entryNum, sidePlan.tp, sidePlan.sl)
    : null;

  const tpDist = (sidePlan && validEntry)
    ? ((sidePlan.tp - entryNum) / entryNum * 100)
    : null;
  const slDist = (sidePlan && validEntry)
    ? ((sidePlan.sl - entryNum) / entryNum * 100)
    : null;

  // Stop hit if entry on wrong side of SL
  const slInvalid = sidePlan && validEntry && (
    (side === "long"  && entryNum <= sidePlan.sl) ||
    (side === "short" && entryNum >= sidePlan.sl)
  );
  const tpAlreadyHit = sidePlan && validEntry && (
    (side === "long"  && entryNum >= sidePlan.tp) ||
    (side === "short" && entryNum <= sidePlan.tp)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl border max-w-md w-full p-5"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-bold">
            🎯 Check Trade — {card.asset}
          </div>
          <button
            onClick={onClose}
            className="text-[18px] font-mono text-[color:var(--meteor)] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* TF Picker — switch TF without closing modal */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {TFS.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className="px-2 py-1 rounded text-[10px] font-mono font-bold border transition flex-1"
              style={{
                borderColor: tf === t ? "var(--accent, #06d6a0)" : "var(--border)",
                backgroundColor: tf === t ? "rgba(6,214,160,0.12)" : "transparent",
                color: tf === t ? "var(--accent, #06d6a0)" : "var(--meteor)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {!isFullPlan && (
          <div className="text-[12px] font-mono text-[color:var(--meteor)] py-4">
            {tf === "1d"
              ? "1d เป็น bias only — ใช้ 4h เป็นตัวนำสำหรับ entry/exit"
              : "Plan ยังไม่ถูกคำนวณ (รอข้อมูลจาก agent)"}
          </div>
        )}

        {fullPlan && (
          <>
            {/* Fix #3: Plan freshness banner */}
            {isStale && (
              <div
                className="mb-3 p-2 rounded text-[11px] font-mono"
                style={{
                  backgroundColor: "rgba(255, 209, 102, 0.15)",
                  color: "#ffd166",
                  borderLeft: "3px solid #ffd166",
                }}
              >
                ⚠️ <b>Plan stale</b> — คำนวณเมื่อ {planAgeText} ที่ราคา ${fmt(planEntry)} ·
                drift {drift.toFixed(2)}% · SL/TP อาจคลาดเคลื่อน รอ refresh ถัดไป
              </div>
            )}
            {!isStale && planAge !== null && (
              <div className="mb-2 text-[10px] font-mono text-[color:var(--meteor)]">
                Plan computed {planAgeText} · drift {drift.toFixed(2)}% (fresh)
              </div>
            )}

            {/* Direction toggle */}
            <div className="flex gap-2 mb-3">
              {(["long", "short"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className="flex-1 px-3 py-1.5 rounded text-[12px] font-mono font-bold border"
                  style={{
                    borderColor: side === s ? (s === "long" ? "#06d6a0" : "#ef4444") : "var(--border)",
                    backgroundColor: side === s ? (s === "long" ? "rgba(6,214,160,0.15)" : "rgba(239,68,68,0.15)") : "transparent",
                    color: side === s ? (s === "long" ? "#06d6a0" : "#ef4444") : "var(--meteor)",
                  }}
                >
                  {s === "long" ? "🟢 LONG" : "🔴 SHORT"}
                </button>
              ))}
            </div>

            {/* Entry input */}
            <div className="mb-3">
              <label className="text-[10px] font-mono text-[color:var(--meteor)] uppercase tracking-wider">
                ราคาเข้า (entry price)
              </label>
              <input
                type="number"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                step="any"
                className="w-full mt-1 px-3 py-2 rounded font-mono text-[14px] border"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--fg)",
                }}
              />
              <div className="text-[10px] font-mono text-[color:var(--meteor)] mt-1">
                ราคาตอนนี้{" "}
                <button
                  onClick={() => setEntry(initialPrice.toString())}
                  className="font-mono hover:underline"
                  style={{ color: "var(--accent, #06d6a0)" }}
                  title="คลิกเพื่อใช้ราคาตอนนี้"
                >
                  ${fmt(initialPrice)}
                </button>{" "}
                · คลิกเพื่อใส่
              </div>
            </div>

            {/* Plan output */}
            {validEntry && sidePlan && (
              <div
                className="rounded-lg border p-3 font-mono text-[12px]"
                style={{
                  borderColor: side === "long" ? "rgba(6,214,160,0.3)" : "rgba(239,68,68,0.3)",
                  backgroundColor: side === "long" ? "rgba(6,214,160,0.05)" : "rgba(239,68,68,0.05)",
                }}
              >
                {slInvalid && (
                  <div className="mb-2 p-2 rounded text-[11px] leading-relaxed" style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    ⚠️ <b>Setup ใช้ไม่ได้</b> — {side === "long"
                      ? `Support $${fmt(sidePlan.sl)} หักแล้ว · ราคาทะลุลงมา → likely ลงต่อ ไม่ใช่ bounce`
                      : `Resistance $${fmt(sidePlan.sl)} หักแล้ว · ราคาทะลุขึ้นไป → likely ขึ้นต่อ ไม่ใช่ reject`}
                    <div className="mt-1 text-[color:var(--meteor)]">
                      💡 รอ setup ใหม่ หรือลองสลับไป {side === "long" ? "🔴 SHORT" : "🟢 LONG"}
                    </div>
                  </div>
                )}
                {tpAlreadyHit && !slInvalid && (
                  <div className="mb-2 p-2 rounded text-[11px] leading-relaxed" style={{ backgroundColor: "rgba(255,209,102,0.2)", color: "#ffd166" }}>
                    ⚠️ <b>เลย TP แล้ว — chasing</b> · ราคาเลยเป้าไปแล้ว → entry ตอนนี้ไม่มี upside เหลือ
                    <div className="mt-1 text-[color:var(--meteor)]">
                      💡 รอ pullback หรือใช้ TF ใหญ่กว่า (TP จะไกลกว่า)
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] text-[color:var(--meteor)] uppercase">Entry</div>
                    <div className="text-[13px] font-bold">${fmt(entryNum)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[color:var(--meteor)] uppercase">TP</div>
                    <div className="text-[13px] font-bold" style={{ color: "#06d6a0" }}>
                      ${fmt(sidePlan.tp)}
                    </div>
                    {tpDist !== null && (
                      <div className="text-[10px] text-[color:var(--meteor)]">{tpDist >= 0 ? "+" : ""}{tpDist.toFixed(2)}%</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-[color:var(--meteor)] uppercase">SL</div>
                    <div className="text-[13px] font-bold" style={{ color: "#ef4444" }}>
                      ${fmt(sidePlan.sl)}
                    </div>
                    {slDist !== null && (
                      <div className="text-[10px] text-[color:var(--meteor)]">{slDist >= 0 ? "+" : ""}{slDist.toFixed(2)}%</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[11px] text-[color:var(--meteor)]">Risk-to-Reward</span>
                  {(slInvalid || tpAlreadyHit) ? (
                    <span className="text-[12px] font-mono italic" style={{ color: "#94a3b8" }}>
                      Setup ใช้ไม่ได้ — RR ไม่มีความหมาย
                    </span>
                  ) : (
                    <span
                      className="text-[14px] font-bold"
                      style={{
                        color: recomputedRR === null ? "var(--meteor)"
                          : recomputedRR >= 2 ? "#06d6a0"
                          : recomputedRR >= 1 ? "#ffd166"
                          : "#ef4444",
                      }}
                    >
                      {recomputedRR === null ? "—" : `${recomputedRR.toFixed(1)}`}
                      {recomputedRR !== null && recomputedRR < 1 && " ✗ ไม่คุ้ม"}
                      {recomputedRR !== null && recomputedRR >= 2 && " ✓ คุ้ม"}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="text-[10px] font-mono text-[color:var(--meteor)] mt-3 leading-relaxed">
              💡 SL/TP เป็น level ตามโครงสร้าง (S/R) — เปลี่ยนราคาเข้าจะแก้แค่ระยะ + RR
              เพื่อให้โจ้รู้ว่า entry นี้คุ้มมั้ย
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────── Asset Card ───────────
function AssetCard({
  card,
  tf,
  entryStyle,
  onCheckTrade,
}: {
  card: PlaybookCard;
  tf: TF;
  entryStyle: EntryStyle;
  onCheckTrade: () => void;
}) {
  const plan = card.tf_plans?.[tf];
  const risk = card.risk_heat;
  const tierStyle = RISK_TIER_STYLE[risk.tier];
  const isFullPlan = plan && !("bias_only" in plan);
  const fullPlan = isFullPlan ? (plan as TFPlan) : null;
  const biasPlan = plan && "bias_only" in plan ? plan : null;

  const dirEmoji = !plan ? "·" :
    plan.direction === "long"  ? "🟢" :
    plan.direction === "short" ? "🔴" : "⚪";
  const dirLabel = !plan ? "—" :
    plan.direction === "long"  ? "LONG bias" :
    plan.direction === "short" ? "SHORT bias" : "WAIT";
  const dirColor = !plan ? "var(--meteor)" :
    plan.direction === "long"  ? "#06d6a0" :
    plan.direction === "short" ? "#ef4444" : "#94a3b8";

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold font-mono">{card.asset}</span>
          {card.price !== null && (
            <span className="text-[11px] font-mono text-[color:var(--meteor)]">${fmt(card.price)}</span>
          )}
        </div>
        <div
          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide"
          style={{ backgroundColor: tierStyle.bg, color: tierStyle.color }}
          title={risk.signals.join(" · ")}
        >
          ⚠️ Risk {risk.score}/10 · {tierStyle.label}
        </div>
      </div>

      {/* ── Trade Bias Gauge: SHORT ←→ LONG (combines all signals) ── */}
      {(() => {
        const bias = computeTradeBias(card, tf);
        const pct = ((bias.score + 10) / 20) * 100; // 0-100% from left
        return (
          <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span style={{ color: "#fb7185" }}>SHORT</span>
              <span className="font-bold" style={{ color: bias.color }}>
                {bias.label} {bias.score > 0 ? "+" : ""}{bias.score}
              </span>
              <span style={{ color: "#06d6a0" }}>LONG</span>
            </div>
            {/* Gauge bar: red → gray → green gradient with marker */}
            <div className="relative h-2 rounded-full overflow-hidden" style={{
              background: "linear-gradient(to right, #ef4444 0%, #94a3b8 50%, #06d6a0 100%)",
              opacity: 0.25,
            }}>
              {/* Center mark */}
              <div className="absolute top-0 bottom-0 w-px bg-white opacity-40" style={{ left: "50%" }} />
              {/* Position marker (filled circle) */}
              <div
                className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2"
                style={{
                  left: `${pct}%`,
                  backgroundColor: bias.color,
                  boxShadow: `0 0 6px ${bias.color}`,
                  border: "2px solid var(--surface)",
                }}
              />
            </div>
            {bias.reasoning.length > 0 && (
              <div className="text-[9px] font-mono text-[color:var(--meteor)] leading-tight">
                {bias.reasoning.join(" · ")}
              </div>
            )}
          </div>
        );
      })()}

      {/* Directional Risk bars: Dump (⬇️) + Pump (⬆️) — with trend labels */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono w-12" title="ความเสี่ยงราคาทุบลง">
            ⬇️ Dump
          </span>
          <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${risk.dump_risk.score * 10}%`,
                backgroundColor: RISK_TIER_STYLE[risk.dump_risk.tier].color,
              }}
            />
          </div>
          <span className="text-[10px] font-mono w-8 text-right" style={{ color: RISK_TIER_STYLE[risk.dump_risk.tier].color }}>
            {risk.dump_risk.score}/10
          </span>
        </div>
        {risk.dump_risk.trend_label && (
          <div className="text-[9px] font-mono pl-14 leading-tight" style={{
            color: risk.dump_risk.trend === "rising_fast" || risk.dump_risk.trend === "rising"
              ? RISK_TIER_STYLE[risk.dump_risk.tier].color
              : "var(--meteor)",
          }}>
            {risk.dump_risk.trend_label}
            {risk.dump_risk.delta !== undefined && risk.dump_risk.delta !== 0 && (
              <span className="ml-1">({risk.dump_risk.delta > 0 ? "+" : ""}{risk.dump_risk.delta})</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono w-12" title="ความเสี่ยงราคาพุ่ง / squeeze">
            ⬆️ Pump
          </span>
          <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${risk.pump_risk.score * 10}%`,
                backgroundColor: RISK_TIER_STYLE[risk.pump_risk.tier].color,
              }}
            />
          </div>
          <span className="text-[10px] font-mono w-8 text-right" style={{ color: RISK_TIER_STYLE[risk.pump_risk.tier].color }}>
            {risk.pump_risk.score}/10
          </span>
        </div>
        {risk.pump_risk.trend_label && (
          <div className="text-[9px] font-mono pl-14 leading-tight" style={{
            color: risk.pump_risk.trend === "rising_fast" || risk.pump_risk.trend === "rising"
              ? RISK_TIER_STYLE[risk.pump_risk.tier].color
              : "var(--meteor)",
          }}>
            {risk.pump_risk.trend_label}
            {risk.pump_risk.delta !== undefined && risk.pump_risk.delta !== 0 && (
              <span className="ml-1">({risk.pump_risk.delta > 0 ? "+" : ""}{risk.pump_risk.delta})</span>
            )}
          </div>
        )}

        {/* TP Now: continuation exhaustion — เทรนด์ปัจจุบันสุก ใกล้พัก */}
        {card.tp_now && (() => {
          const tp = card.tp_now as TPNow;
          const arrow = tp.direction === "up" ? "↑" : "↓";
          const action = tp.direction === "up" ? "Long: ขายล็อกกำไร" : "Short: cover ล็อกกำไร";
          return (
            <>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono w-12" title="เทรนด์ปัจจุบันสุก ใกล้พัก — take profit">
                  💰 TP{arrow}
                </span>
                <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${tp.score * 10}%`,
                      backgroundColor: RISK_TIER_STYLE[tp.tier].color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono w-8 text-right" style={{ color: RISK_TIER_STYLE[tp.tier].color }}>
                  {tp.score}/10
                </span>
              </div>
              {tp.score >= 4 && (
                <div
                  className="text-[9px] font-mono pl-14 leading-tight"
                  style={{ color: RISK_TIER_STYLE[tp.tier].color }}
                  title={tp.signals.join(" · ")}
                >
                  {action}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Direction line */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-1.5">
          <span>{dirEmoji}</span>
          <span className="text-[12px] font-mono font-bold" style={{ color: dirColor }}>
            {dirLabel}
          </span>
          <span className="text-[10px] font-mono text-[color:var(--meteor)]">· {tf}</span>
        </div>
      </div>

      {/* Plan body */}
      {biasPlan && (
        <div className="text-[11px] font-mono text-[color:var(--meteor)] py-1 leading-relaxed">
          {biasPlan.note}
        </div>
      )}

      {fullPlan && (entryStyle === "pullback" || entryStyle === "both") && fullPlan.pullback && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--meteor)" }}>
            🌊 Pullback (เข้าตอนย่อ)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["long", "short"] as const).map((side) => {
              const e = fullPlan.pullback![side];
              const sty = STATUS_STYLE[e.status];
              const isLong = side === "long";
              return (
                <div key={side} className="rounded p-2 border" style={{
                  borderColor: isLong ? "rgba(6,214,160,0.2)" : "rgba(239,68,68,0.2)",
                  backgroundColor: e.status === "active" ? sty.bg : "transparent",
                }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: isLong ? "#06d6a0" : "#ef4444" }}>
                      {isLong ? "🟢 LONG" : "🔴 SHORT"}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-px rounded font-bold" style={{ backgroundColor: sty.bg, color: sty.color }}>
                      {sty.label}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div>Zone <span style={{ color: "var(--fg)" }}>${fmt(e.entry_low)}-{fmt(e.entry_high)}</span></div>
                    <div>TP <span style={{ color: "#06d6a0" }}>${fmt(e.tp)}</span> · SL <span style={{ color: "#ef4444" }}>${fmt(e.sl)}</span></div>
                    <div>RR <span style={{ color: e.rr >= 2 ? "#06d6a0" : e.rr >= 1 ? "#ffd166" : "#ef4444" }}>{e.rr.toFixed(1)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fullPlan && (entryStyle === "confirmation" || entryStyle === "both") && fullPlan.confirmation && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--meteor)" }}>
            ⚡ Confirmation (เข้าตอน break)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["long", "short"] as const).map((side) => {
              const e = fullPlan.confirmation![side];
              const sty = STATUS_STYLE[e.status];
              const isLong = side === "long";
              return (
                <div key={side} className="rounded p-2 border" style={{
                  borderColor: isLong ? "rgba(6,214,160,0.2)" : "rgba(239,68,68,0.2)",
                  backgroundColor: e.status === "active" ? sty.bg : "transparent",
                }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: isLong ? "#06d6a0" : "#ef4444" }}>
                      {isLong ? "🟢 LONG" : "🔴 SHORT"}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-px rounded font-bold" style={{ backgroundColor: sty.bg, color: sty.color }}>
                      {sty.label}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div>Trigger <span style={{ color: "var(--fg)" }}>${fmt(e.entry_target)}</span></div>
                    <div>TP <span style={{ color: "#06d6a0" }}>${fmt(e.tp)}</span> · SL <span style={{ color: "#ef4444" }}>${fmt(e.sl)}</span></div>
                    <div>RR <span style={{ color: e.rr >= 2 ? "#06d6a0" : e.rr >= 1 ? "#ffd166" : "#ef4444" }}>{e.rr.toFixed(1)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback: legacy "at-current-price" plan if pullback/confirmation missing (older agent log) */}
      {fullPlan && !fullPlan.pullback && !fullPlan.confirmation && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded p-2 border" style={{ borderColor: "rgba(6,214,160,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-1">🟢 LONG @ now</div>
            <div className="text-[10px] font-mono space-y-0.5">
              <div>TP <span style={{ color: "#06d6a0" }}>${fmt(fullPlan.long.tp)}</span></div>
              <div>SL <span style={{ color: "#ef4444" }}>${fmt(fullPlan.long.sl)}</span></div>
              <div>RR <span style={{ color: fullPlan.long.rr >= 2 ? "#06d6a0" : "#ffd166" }}>{fullPlan.long.rr.toFixed(1)}</span></div>
            </div>
          </div>
          <div className="rounded p-2 border" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-1">🔴 SHORT @ now</div>
            <div className="text-[10px] font-mono space-y-0.5">
              <div>TP <span style={{ color: "#06d6a0" }}>${fmt(fullPlan.short.tp)}</span></div>
              <div>SL <span style={{ color: "#ef4444" }}>${fmt(fullPlan.short.sl)}</span></div>
              <div>RR <span style={{ color: fullPlan.short.rr >= 2 ? "#06d6a0" : "#ffd166" }}>{fullPlan.short.rr.toFixed(1)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Top risk signals (max 2) */}
      {risk.signals.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          {risk.signals.slice(0, 2).map((sig, i) => (
            <div key={i} className="text-[10px] font-mono text-[color:var(--meteor)] leading-tight">
              {sig}
            </div>
          ))}
          {risk.signals.length > 2 && (
            <div className="text-[10px] font-mono text-[color:var(--meteor)] italic">
              + อีก {risk.signals.length - 2} signals
            </div>
          )}
        </div>
      )}

      {/* Check Trade button */}
      {fullPlan && (
        <button
          onClick={onCheckTrade}
          className="text-[11px] font-mono px-2 py-1 rounded border hover:opacity-80 transition mt-1"
          style={{
            borderColor: "var(--border)",
            color: "var(--accent, #06d6a0)",
          }}
        >
          🎯 Check trade @ price
        </button>
      )}
    </div>
  );
}

// ─────────── Main Card ───────────
export function CaptainVerdict() {
  const [cards, setCards] = useState<PlaybookCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  // Fix #4: Lazy initializer reads localStorage on mount → no flash
  const [tf, setTf] = useState<TF>(() => {
    if (typeof window === "undefined") return "4h";
    try {
      const stored = localStorage.getItem("captain_verdict_tf");
      if (stored && (TFS as readonly string[]).includes(stored)) {
        return stored as TF;
      }
    } catch {
      // ignore
    }
    return "4h";
  });
  const [checkAsset, setCheckAsset] = useState<string | null>(null);
  // Persist TF
  useEffect(() => {
    try {
      localStorage.setItem("captain_verdict_tf", tf);
    } catch {
      // ignore
    }
  }, [tf]);

  // Entry style toggle (sticky)
  const [entryStyle, setEntryStyle] = useState<EntryStyle>(() => {
    if (typeof window === "undefined") return "both";
    try {
      const stored = localStorage.getItem("captain_entry_style");
      if (stored === "pullback" || stored === "confirmation" || stored === "both") return stored;
    } catch {}
    return "both";
  });
  useEffect(() => {
    try { localStorage.setItem("captain_entry_style", entryStyle); } catch {}
  }, [entryStyle]);

  async function fetchData() {
    try {
      const res = await fetch("/api/playbook");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCards(json.cards ?? []);
      setLastFetch(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  // Force re-render every 10s
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const ageSec = lastFetch > 0 ? Math.floor((Date.now() - lastFetch) / 1000) : 0;
  const checkCard = checkAsset ? cards.find((c) => c.asset === checkAsset) : null;

  // Fix #6: Sort by Risk Heat desc, tiebreak by fixed asset order (anti-jitter)
  const ASSET_ORDER = ["BTC", "ETH", "SOL", "kPEPE", "OP", "HYPE"];
  const sorted = [...cards].sort((a, b) => {
    const scoreDiff = (b.risk_heat?.score ?? 0) - (a.risk_heat?.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return ASSET_ORDER.indexOf(a.asset) - ASSET_ORDER.indexOf(b.asset);
  });

  return (
    <section
      className="rounded-2xl border p-3.5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-baseline gap-2">
          <div className="text-[13px] text-[color:var(--meteor)] uppercase tracking-wider font-bold">
            🎯 Captain&apos;s Plan · TF Trade Plan
          </div>
          <span className="text-[12px] text-[color:var(--meteor)] font-mono">
            · เลือก TF เพื่อดูแผน · auto 30s
          </span>
        </div>
        {lastFetch > 0 && (
          <span className="text-[11px] font-mono text-[color:var(--meteor)]">updated {ageSec}s ago</span>
        )}
      </div>

      {/* TF Picker */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {TFS.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className="px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition"
            style={{
              borderColor: tf === t ? "var(--accent, #06d6a0)" : "var(--border)",
              backgroundColor: tf === t ? "rgba(6,214,160,0.12)" : "transparent",
              color: tf === t ? "var(--accent, #06d6a0)" : "var(--meteor)",
            }}
          >
            {TF_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Entry Style Toggle */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[10px] font-mono text-[color:var(--meteor)] uppercase tracking-wider">สไตล์:</span>
        {([
          { key: "pullback",     label: "🌊 Pullback (60%)",   title: "เข้าตอนย่อกลับมา EMA20" },
          { key: "confirmation", label: "⚡ Confirmation (40%)", title: "เข้าตอนทะลุ resistance/support" },
          { key: "both",         label: "ทั้งคู่",                title: "แสดงทั้ง 2 สไตล์" },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setEntryStyle(s.key)}
            title={s.title}
            className="px-2 py-0.5 rounded text-[10px] font-mono border transition"
            style={{
              borderColor: entryStyle === s.key ? "var(--accent, #06d6a0)" : "var(--border)",
              backgroundColor: entryStyle === s.key ? "rgba(6,214,160,0.10)" : "transparent",
              color: entryStyle === s.key ? "var(--accent, #06d6a0)" : "var(--meteor)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && cards.length === 0 && (
        <div className="text-[12px] font-mono text-[color:var(--meteor)]">กำลังโหลด...</div>
      )}
      {error && (
        <div className="text-[12px] font-mono" style={{ color: "var(--red-dwarf)" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sorted.map((card) => (
          <AssetCard
            key={card.asset}
            card={card}
            tf={tf}
            entryStyle={entryStyle}
            onCheckTrade={() => setCheckAsset(card.asset)}
          />
        ))}
      </div>

      <div className="mt-3 text-[10px] font-mono text-[color:var(--meteor)] leading-relaxed">
        💡 <b>วิธีใช้:</b> เลือก TF ด้านบน → ดู LONG/SHORT plan ของแต่ละ asset · เรียงตาม Risk Heat (อันตรายสุดอยู่บน) ·
        กด <b>🎯 Check trade @ price</b> เพื่อใส่ราคาเข้าของตัวเอง ดู RR ใหม่
      </div>

      {checkCard && checkCard.price !== null && (
        <CheckTradeModal
          card={checkCard}
          tf={tf}
          initialPrice={checkCard.price}
          onClose={() => setCheckAsset(null)}
        />
      )}
    </section>
  );
}
