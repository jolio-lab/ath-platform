import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("address")?.toLowerCase();
  const limitParam = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 200)
    : 50;

  if (!wallet || !ADDR.test(wallet)) {
    return NextResponse.json(
      { error: "address query param required" },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("ath_activity")
    .select("ts, captain, asset, action, direction, size, price, reason, meta")
    .eq("wallet_address", wallet)
    .order("ts", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: `db: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ entries: data ?? [] });
}
