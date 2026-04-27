import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { encryptAgentKey } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchAgentApprovals } from "@/lib/hl";

export const runtime = "nodejs";

type RegisterBody = {
  wallet_address?: string;
  agent_address?: string;
  agent_priv_key?: string;
  risk_profile?: "conservative" | "balanced" | "aggressive";
  leverage?: number;
};

const ADDR = /^0x[a-fA-F0-9]{40}$/;
const PRIV = /^0x[a-fA-F0-9]{64}$/;
const RISK = new Set(["conservative", "balanced", "aggressive"]);

export async function POST(req: Request) {
  let body: RegisterBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const wallet = body.wallet_address?.toLowerCase();
  const agent = body.agent_address?.toLowerCase();
  const priv = body.agent_priv_key;
  const risk = body.risk_profile;
  const leverage = body.leverage;

  if (!wallet || !ADDR.test(wallet)) {
    return NextResponse.json({ error: "bad wallet_address" }, { status: 400 });
  }
  if (!agent || !ADDR.test(agent)) {
    return NextResponse.json({ error: "bad agent_address" }, { status: 400 });
  }
  if (!priv || !PRIV.test(priv)) {
    return NextResponse.json({ error: "bad agent_priv_key" }, { status: 400 });
  }
  if (!risk || !RISK.has(risk)) {
    return NextResponse.json({ error: "bad risk_profile" }, { status: 400 });
  }
  if (
    typeof leverage !== "number" ||
    !Number.isInteger(leverage) ||
    leverage < 1 ||
    leverage > 50
  ) {
    return NextResponse.json({ error: "bad leverage" }, { status: 400 });
  }

  // Derive address from priv key — must match the claimed agent_address.
  let derived: string;
  try {
    derived = privateKeyToAccount(priv as `0x${string}`).address.toLowerCase();
  } catch {
    return NextResponse.json(
      { error: "agent_priv_key invalid" },
      { status: 400 },
    );
  }
  if (derived !== agent) {
    return NextResponse.json(
      { error: "agent_priv_key does not match agent_address" },
      { status: 400 },
    );
  }

  // Proof of control: the wallet must have the agent in its extraAgents on
  // Hyperliquid. Anyone other than the wallet owner can't get this signed.
  let approvals: unknown;
  try {
    approvals = await fetchAgentApprovals(wallet as `0x${string}`);
  } catch {
    return NextResponse.json(
      { error: "could not verify on Hyperliquid" },
      { status: 502 },
    );
  }
  const onChain =
    Array.isArray(approvals) &&
    approvals.some(
      (a) =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as { address?: unknown }).address === "string" &&
        ((a as { address: string }).address.toLowerCase() === agent),
    );
  if (!onChain) {
    return NextResponse.json(
      {
        error:
          "agent is not approved on Hyperliquid for this wallet — finish step 2 first",
      },
      { status: 409 },
    );
  }

  // Encrypt before insert.
  let agent_priv_enc: string;
  try {
    agent_priv_enc = encryptAgentKey(priv);
  } catch (e) {
    return NextResponse.json(
      { error: `encryption failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from("ath_users").upsert(
    {
      wallet_address: wallet,
      agent_address: agent,
      agent_priv_enc,
      risk_profile: risk,
      leverage,
      paused: false,
    },
    { onConflict: "wallet_address" },
  );

  if (error) {
    return NextResponse.json(
      { error: `db: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
