import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("address")?.toLowerCase();
  if (!wallet || !ADDR.test(wallet)) {
    return NextResponse.json({ error: "address query param required" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("ath_users")
    .select("telegram_chat_id, telegram_username, telegram_linked_at")
    .eq("wallet_address", wallet)
    .limit(1);
  if (error) {
    return NextResponse.json({ error: `db: ${error.message}` }, { status: 500 });
  }
  const row = data?.[0];
  return NextResponse.json({
    linked: !!row?.telegram_chat_id,
    username: row?.telegram_username ?? null,
    linked_at: row?.telegram_linked_at ?? null,
  });
}
