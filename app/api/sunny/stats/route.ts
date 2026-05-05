import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { HL_API_URL } from "@/lib/constants";

export const runtime = "nodejs";

const SUNNY_WALLET =
  process.env.SUNNY_WALLET ?? "0xd8b9388e374448d66df4d1bc8bc286a0e3409d7b";

// Bot trades these assets — rest is user manual (not Sunny's perf)
const BOT_ASSETS = new Set(["ETH", "SOL", "kPEPE", "DOGE", "OP"]);

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
  opened_at: string | null;
  closed_at: string | null;
  updated_at: string | null;
  pnl: number | null;
};

// Match buffer — HL fill close timestamp may differ from supabase closed_at by seconds
const CLOSE_TIME_BUFFER_MS = 5 * 60 * 1000;  // 5 min

function parseIso(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export async function GET() {
  // 1) Trade rows from Supabase — for trade COUNT (not pnl)
  const sb = supabaseAdmin();
  const { data: tradeRows, error } = await sb
    .from("trade_log")
    .select("id, asset, opened_at, closed_at, updated_at, pnl, status")
    .eq("status", "closed");

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

  // 3) Enrich each closed trade with PnL from matching HL fills
  // Matching rule: same asset + fill.time within [opened, closed_at + 5min buffer]
  // Sum closedPnl of all closing fills in that window
  const trades = (tradeRows ?? []) as TradeRow[];
  const enriched = trades
    .filter((t) => t.asset && BOT_ASSETS.has(t.asset))
    .map((t) => {
      const openTs = parseIso(t.opened_at);
      const closeIso = t.closed_at ?? t.updated_at;
      const closeTs = parseIso(closeIso);
      if (!openTs || !closeTs) {
        // Fallback to supabase pnl if we can't match
        return { ...t, realized_pnl: Number(t.pnl ?? 0) };
      }
      const matched = fills.filter((f) => {
        if (f.coin !== t.asset) return false;
        const ft = f.time ?? 0;
        if (ft < openTs) return false;
        if (ft > closeTs + CLOSE_TIME_BUFFER_MS) return false;
        const cp = Number(f.closedPnl ?? 0);
        return cp !== 0; // only closing fills
      });
      const sumPnl = matched.reduce(
        (s, f) => s + Number(f.closedPnl ?? 0),
        0,
      );
      // If no fills matched (e.g. very old trade), fall back to supabase pnl
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
    source: "hl_fills+supabase_count",  // for debugging
  });
}
