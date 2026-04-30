import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { HL_API_URL } from "@/lib/constants";

export const runtime = "nodejs";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

type ClearinghouseState = {
  marginSummary?: { accountValue?: string };
  assetPositions?: Array<{
    position?: { coin?: string; unrealizedPnl?: string };
  }>;
};

type Fill = {
  coin: string;
  closedPnl: string;
  time: number;
  px: string;
  sz: string;
};

async function hlInfo<T>(body: object): Promise<T | null> {
  try {
    const res = await fetch(`${HL_API_URL}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("address")?.toLowerCase();
  if (!wallet || !ADDR.test(wallet)) {
    return NextResponse.json(
      { error: "address query param required" },
      { status: 400 },
    );
  }

  // 1) joined_at จาก Supabase
  const sb = supabaseAdmin();
  const { data: userRow, error: userErr } = await sb
    .from("ath_users")
    .select("joined_at")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (userErr) {
    return NextResponse.json(
      { error: `db: ${userErr.message}` },
      { status: 500 },
    );
  }
  if (!userRow?.joined_at) {
    return NextResponse.json(
      { error: "user not registered" },
      { status: 404 },
    );
  }

  const joinedAt = new Date(userRow.joined_at as string);
  const startTime = joinedAt.getTime();
  const endTime = Date.now();
  const elapsedMs = endTime - startTime;
  const daysActive = Math.floor(elapsedMs / 86_400_000);
  const hoursActive = Math.floor(
    (elapsedMs - daysActive * 86_400_000) / 3_600_000,
  );

  // 2) Current state จาก HL
  const state = await hlInfo<ClearinghouseState>({
    type: "clearinghouseState",
    user: wallet,
  });

  const currentBalance = state?.marginSummary?.accountValue
    ? parseFloat(state.marginSummary.accountValue)
    : 0;

  // Unrealized PnL per asset (still-open positions)
  const unrealizedByAsset = new Map<string, number>();
  for (const p of state?.assetPositions ?? []) {
    const coin = p.position?.coin;
    const upnl = parseFloat(p.position?.unrealizedPnl ?? "0");
    if (coin) {
      unrealizedByAsset.set(coin, (unrealizedByAsset.get(coin) ?? 0) + upnl);
    }
  }

  // 3) Realized PnL per asset since joinedAt — userFillsByTime
  const fills = await hlInfo<Fill[]>({
    type: "userFillsByTime",
    user: wallet,
    startTime,
    endTime,
    aggregateByTime: true,
  });

  const realizedByAsset = new Map<string, number>();
  const tradeCountByAsset = new Map<string, number>();
  for (const f of fills ?? []) {
    const closed = parseFloat(f.closedPnl ?? "0");
    if (closed === 0) continue; // open-side fill, no PnL contribution
    realizedByAsset.set(
      f.coin,
      (realizedByAsset.get(f.coin) ?? 0) + closed,
    );
    tradeCountByAsset.set(
      f.coin,
      (tradeCountByAsset.get(f.coin) ?? 0) + 1,
    );
  }

  // 4) รวมต่อ asset (realized + unrealized)
  const allAssets = new Set<string>([
    ...realizedByAsset.keys(),
    ...unrealizedByAsset.keys(),
  ]);
  const byAsset = [...allAssets]
    .map((asset) => {
      const realized = realizedByAsset.get(asset) ?? 0;
      const unrealized = unrealizedByAsset.get(asset) ?? 0;
      return {
        asset,
        pnl: realized + unrealized,
        realized,
        unrealized,
        trades: tradeCountByAsset.get(asset) ?? 0,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);

  const totalPnl = byAsset.reduce((sum, a) => sum + a.pnl, 0);

  // 5) ทุนเริ่ม (ประมาณ): currentBalance - totalPnl
  // ไม่นับ deposit/withdraw ระหว่างทาง — แสดงเป็นตัวเลข "ประมาณ"
  const initialCapital = currentBalance - totalPnl;
  const totalPnlPct =
    initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;

  const bestAsset = byAsset.length > 0 ? byAsset[0] : null;
  const worstAsset =
    byAsset.length > 0 ? byAsset[byAsset.length - 1] : null;

  return NextResponse.json({
    joinedAt: userRow.joined_at,
    daysActive,
    hoursActive,
    elapsedMs,
    initialCapital,
    currentBalance,
    totalPnl,
    totalPnlPct,
    bestAsset:
      bestAsset && bestAsset.pnl > 0
        ? { asset: bestAsset.asset, pnl: bestAsset.pnl }
        : null,
    worstAsset:
      worstAsset && worstAsset.pnl < 0
        ? { asset: worstAsset.asset, pnl: worstAsset.pnl }
        : null,
    byAsset,
  });
}
