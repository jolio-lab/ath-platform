import { NextResponse } from "next/server";

const SUNNY_PLAYBOOK_URL = "https://thousand-sunny-five.vercel.app/api/playbook";

// Proxy the live Sunny playbook so the landing page can show real captain status
// without exposing CORS issues. Cached for 30s at the edge.
export const revalidate = 30;

// ── Type definitions mirrored from Sunny's playbook route. ──
// Kept here so ATH components can `import type { PlaybookCard } from "..."`
// without reaching into the Sunny repo.

export type EntryStatus = "active" | "close" | "waiting" | "missed";

export type PullbackEntry = {
  entry_low: number;
  entry_high: number;
  entry_mid: number;
  status: EntryStatus;
  trigger: string;
  tp: number;
  sl: number;
  rr: number;
};

export type ConfirmationEntry = {
  entry_target: number;
  status: EntryStatus;
  trigger: string;
  tp: number;
  sl: number;
  rr: number;
};

export type TFPlan = {
  direction: "long" | "short" | "wait";
  entry: number;
  atr: number;
  ema20: number;
  long: { tp: number; sl: number; rr: number };
  short: { tp: number; sl: number; rr: number };
  pullback?: { long: PullbackEntry; short: PullbackEntry };
  confirmation?: { long: ConfirmationEntry; short: ConfirmationEntry };
};

export type TFPlanBiasOnly = {
  direction: "long" | "short" | "wait";
  bias_only: true;
  note: string;
};

export type TFPlans = {
  "15m": TFPlan | null;
  "1h": TFPlan | null;
  "4h": TFPlan | null;
  "1d": TFPlanBiasOnly | null;
};

export type DirectionalRisk = {
  score: number;
  tier: "low" | "elevated" | "high" | "critical";
  signals: string[];
  delta?: number;
  trend?: "rising_fast" | "rising" | "flat" | "falling" | "falling_fast" | "new";
  trend_label?: string;
};

export type RiskHeat = {
  score: number;
  tier: "low" | "elevated" | "high" | "critical";
  dump_risk: DirectionalRisk;
  pump_risk: DirectionalRisk;
  buckets: {
    trend_health: { score: number; max: number; signals: string[] };
    demand: { score: number; max: number; signals: string[] };
    compression: { score: number; max: number; signals: string[] };
  };
  signals: string[];
};

export type TPNow = {
  score: number;
  tier: "low" | "elevated" | "high" | "critical";
  direction: "up" | "down" | null;
  signals: string[];
};

export type PlaybookCard = {
  asset: string;
  price: number | null;
  direction: "LONG" | "SHORT" | "RANGE_LONG" | "RANGE_SHORT" | "WAIT" | "CAUTION";
  verdict_style: "trend" | "range" | null;
  verdict_reasons: string[];
  confidence: "high" | "medium" | "low";
  entry_zone: string;
  tp: number | null;
  sl: number | null;
  rr: number | null;
  one_liner: string;
  triggers: string[];
  warnings: string[];
  tf_plans: TFPlans | null;
  risk_heat: RiskHeat;
  tp_now: TPNow | null;
  sources: {
    robin_bias: string | null;
    robin_target: string | null;
    robin_invalidation: string | null;
    robin_updated: string | null;
    trends: Record<string, string> | null;
    rsi: { tf: string; value: number }[];
    maturity: Record<string, string>;
    volume_flags: Record<string, string>;
    stack_score: number | null;
    stack_max: number | null;
    stack_label: string | null;
    funding_rate: number | null;
    funding_note: string | null;
    adx: Record<
      string,
      { adx: number; plus_di: number; minus_di: number; tier: string }
    >;
    structure: Record<string, string>;
    macd_flip: Record<string, string>;
    squeeze_tfs: string[];
    score: number;
    tallies: string[];
    chopper_updated: string | null;
    mihawk_updated: string | null;
    nami_updated: string | null;
    freshest_updated: string | null;
    votes: {
      long: { tf: string; weight: number; emoji: string }[];
      short: { tf: string; weight: number; emoji: string }[];
      neutral: { tf: string; emoji: string }[];
      long_total: number;
      short_total: number;
    };
  };
};

export async function GET() {
  try {
    const res = await fetch(SUNNY_PLAYBOOK_URL, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
