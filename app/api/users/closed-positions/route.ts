import { NextRequest, NextResponse } from "next/server";
import { HL_API_URL } from "@/lib/constants";

export const runtime = "nodejs";

type HLFill = {
  coin: string;
  side: "B" | "A";       // B = buy, A = ask/sell
  px: string;
  sz: string;
  time: number;          // ms epoch
  closedPnl: string;     // != 0 = closing fill
  fee: string;
  oid: number;
  startPosition?: string;
};

type ClosedTrade = {
  asset: string;
  side: "long" | "short";   // ทิศ position ก่อนปิด
  exitPx: number;
  exitSize: number;
  pnl: number;
  fee: number;
  closedAt: number;          // ms epoch (last fill in group)
  fillCount: number;
};

const CLUSTER_WINDOW_MS = 5 * 60 * 1000;  // 5 นาที — fills ภายใน window = 1 trade

/**
 * Aggregate HL closing fills (closedPnl != 0) into "closed trades".
 * Group consecutive fills on same asset within 5-min window.
 *
 * For "side": fill.side="A" (sell) means closing LONG → side="long"
 *             fill.side="B" (buy)  means closing SHORT → side="short"
 */
function aggregateClosedTrades(fills: HLFill[]): ClosedTrade[] {
  // Filter to closing fills only
  const closing = fills.filter((f) => Math.abs(Number(f.closedPnl ?? 0)) > 0);
  if (closing.length === 0) return [];

  // Sort ascending by time
  closing.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

  type Group = {
    asset: string;
    side: "long" | "short";
    fills: HLFill[];
    lastTime: number;
  };

  const groups: Group[] = [];
  for (const f of closing) {
    const side: "long" | "short" = f.side === "A" ? "long" : "short";
    const last = groups[groups.length - 1];
    if (
      last &&
      last.asset === f.coin &&
      last.side === side &&
      f.time - last.lastTime <= CLUSTER_WINDOW_MS
    ) {
      last.fills.push(f);
      last.lastTime = f.time;
    } else {
      groups.push({
        asset: f.coin,
        side,
        fills: [f],
        lastTime: f.time,
      });
    }
  }

  // Reduce each group → ClosedTrade
  return groups
    .map((g) => {
      const totalSz = g.fills.reduce((s, f) => s + Number(f.sz ?? 0), 0);
      const totalNotional = g.fills.reduce(
        (s, f) => s + Number(f.sz ?? 0) * Number(f.px ?? 0),
        0,
      );
      const avgPx = totalSz > 0 ? totalNotional / totalSz : 0;
      const pnl = g.fills.reduce((s, f) => s + Number(f.closedPnl ?? 0), 0);
      const fee = g.fills.reduce((s, f) => s + Number(f.fee ?? 0), 0);
      return {
        asset: g.asset,
        side: g.side,
        exitPx: avgPx,
        exitSize: totalSz,
        pnl,
        fee,
        closedAt: g.lastTime,
        fillCount: g.fills.length,
      };
    })
    .sort((a, b) => b.closedAt - a.closedAt);  // newest first
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  let fills: HLFill[] = [];
  try {
    const r = await fetch(`${HL_API_URL}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFills", user: address }),
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: `hl info: ${r.status}` },
        { status: 500 },
      );
    }
    fills = (await r.json()) as HLFill[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `hl fetch: ${msg}` }, { status: 500 });
  }

  const closed = aggregateClosedTrades(fills).slice(0, limit);

  return NextResponse.json({
    trades: closed,
    count: closed.length,
    address,
  });
}
