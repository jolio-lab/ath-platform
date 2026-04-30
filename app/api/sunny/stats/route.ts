import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { HL_API_URL } from "@/lib/constants";

export const runtime = "nodejs";

const SUNNY_WALLET =
  process.env.SUNNY_WALLET ?? "0xd8b9388e374448d66df4d1bc8bc286a0e3409d7b";

type ClearinghouseState = {
  marginSummary?: { accountValue?: string };
};

export async function GET() {
  // 1) Sunny trade stats จาก Supabase trade_log (closed trades)
  const sb = supabaseAdmin();
  const { data: closed, error } = await sb
    .from("trade_log")
    .select("pnl, asset, direction, status")
    .eq("status", "closed");

  if (error) {
    return NextResponse.json(
      { error: `db: ${error.message}` },
      { status: 500 },
    );
  }

  const trades = closed ?? [];
  const totalTrades = trades.length;
  const wins = trades.filter((t) => Number(t.pnl ?? 0) > 0).length;
  const losses = trades.filter((t) => Number(t.pnl ?? 0) < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalPnl = trades.reduce(
    (sum, t) => sum + Number(t.pnl ?? 0),
    0,
  );

  // 2) Sunny current account value จาก HL
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
    // ignore — return null
  }

  return NextResponse.json({
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnl,
    accountValue,
  });
}
