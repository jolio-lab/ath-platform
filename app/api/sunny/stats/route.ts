import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { HL_API_URL } from "@/lib/constants";

export const runtime = "nodejs";

const SUNNY_WALLET =
  process.env.SUNNY_WALLET ?? "0xd8b9388e374448d66df4d1bc8bc286a0e3409d7b";

// Bot trades these assets — rest is user manual (not Sunny's perf)
const BOT_ASSETS = new Set(["SOL", "kPEPE", "DOGE", "OP"]);  // 2026-05-14: ETH retired

// Schema does NOT have closed_at. Use created_at + assume max 7-day hold.
const MAX_HOLD_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

type ClearinghouseState = {
  marginSummary?: { accountValue?: string };
};

type HLFill = {
  coin?: string;
  time?: number;        // ms epoch
  closedPnl?: string;
  fee?: string;
};

type TradeRow = {
  id: number | string;
  asset: string | null;
  created_at: string | null;
  pnl: number | null;
  status: string | null;
};

function parseIso(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export async function GET() {
  // 1) Trade rows from Supabase — for trade COUNT
  const sb = supabaseAdmin();
  const { data: tradeRows, error } = await sb
    .from("trade_log")
    .select("id, asset, created_at, pnl, status")
    .eq("status", "closed")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `db: ${error.message}` },
      { status: 500 },
    );
  }

  // 2) HL fills — source of truth for PnL
  let fills: HLFill[] = [];
  try {
    const r = await fetch(`${HL_API_URL}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFills", user: SUNNY_WALLET }),
    });
    if (r.ok) {
      fills = (await r.json()) as HLFill[];
    }
  } catch {
    // continue with empty fills — fall back to supabase pnl below
  }

  // 3) Match each closed trade to its closing fills
  // Trade lifetime = [created_at, next-trade-on-same-asset.created_at OR +7d]
  // Sum closedPnl from matching fills (closedPnl != 0 = closing fill)
  const trades = (tradeRows ?? [])
    .filter((t: TradeRow) => t.asset && BOT_ASSETS.has(t.asset)) as TradeRow[];

  // Build per-asset next-open-time lookup
  const tradesByAsset: Record<string, number[]> = {};
  for (const t of trades) {
    if (!t.asset) continue;
    const ts = parseIso(t.created_at);
    if (!ts) continue;
    if (!tradesByAsset[t.asset]) tradesByAsset[t.asset] = [];
    tradesByAsset[t.asset].push(ts);
  }
  // Sort each asset's timestamps ascending
  for (const k of Object.keys(tradesByAsset)) {
    tradesByAsset[k].sort((a, b) => a - b);
  }

  const enriched = trades.map((t) => {
    const openTs = parseIso(t.created_at);
    if (!openTs || !t.asset) {
      return { ...t, realized_pnl: Number(t.pnl ?? 0) };
    }
    // Find next trade on same asset (= this trade's max close time)
    const sameAssetTimes = tradesByAsset[t.asset] ?? [];
    const idx = sameAssetTimes.indexOf(openTs);
    const nextOpenTs =
      idx >= 0 && idx + 1 < sameAssetTimes.length
        ? sameAssetTimes[idx + 1]
        : openTs + MAX_HOLD_MS;
    // Filter fills: same asset, time in [open, next_open], closedPnl != 0
    const matched = fills.filter((f) => {
      if (f.coin !== t.asset) return false;
      const ft = f.time ?? 0;
      if (ft < openTs) return false;
      if (ft > nextOpenTs) return false;
      const cp = Number(f.closedPnl ?? 0);
      return cp !== 0;
    });
    const sumPnl = matched.reduce(
      (s, f) => s + Number(f.closedPnl ?? 0),
      0,
    );
    // Fallback to supabase pnl if no fills matched (very old trade?)
    const realized_pnl = matched.length > 0 ? sumPnl : Number(t.pnl ?? 0);
    return { ...t, realized_pnl };
  });

  const totalTrades = enriched.length;
  const wins = enriched.filter((t) => t.realized_pnl > 0).length;
  const losses = enriched.filter((t) => t.realized_pnl < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalPnl = enriched.reduce((s, t) => s + t.realized_pnl, 0);

  // 4) Sunny current account value — clearinghouseState
  let accountValue: number | null = null;
  try {
    const r = await fetch(`${HL_API_URL}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "clearinghouseState",
        user: SUNNY_WALLET,
      }),
    });
    if (r.ok) {
      const state = (await r.json()) as ClearinghouseState;
      const v = state.marginSummary?.accountValue;
      if (v) accountValue = parseFloat(v);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnl,
    accountValue,
    source: "hl_fills+supabase_count",
  });
}
