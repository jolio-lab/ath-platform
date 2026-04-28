import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const ADDR = /^0x[a-fA-F0-9]{40}$/;
const BOT_USERNAME = "sunnyathbot";
const CODE_TTL_MIN = 5;

function makeCode(): string {
  // 6 chars, alphanumeric, uppercase. Telegram /start arg supports a-z A-Z 0-9 _ -
  // and is limited to 64 chars but anything readable is fine.
  return randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
}

export async function POST(req: Request) {
  let body: { wallet_address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const wallet = body.wallet_address?.toLowerCase();
  if (!wallet || !ADDR.test(wallet)) {
    return NextResponse.json({ error: "bad wallet_address" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: userRows, error: userErr } = await sb
    .from("ath_users")
    .select("wallet_address")
    .eq("wallet_address", wallet)
    .limit(1);
  if (userErr) {
    return NextResponse.json({ error: `db: ${userErr.message}` }, { status: 500 });
  }
  if (!userRows || userRows.length === 0) {
    return NextResponse.json(
      { error: "wallet not registered — finish /join first" },
      { status: 404 },
    );
  }

  const code = makeCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString();
  const { error: insErr } = await sb.from("ath_telegram_links").insert({
    code,
    wallet_address: wallet,
    expires_at: expiresAt,
  });
  if (insErr) {
    return NextResponse.json({ error: `db: ${insErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    code,
    expires_at: expiresAt,
    deep_link_url: `https://t.me/${BOT_USERNAME}?start=${code}`,
    bot_username: BOT_USERNAME,
    expires_in_minutes: CODE_TTL_MIN,
  });
}
