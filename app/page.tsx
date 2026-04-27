"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";
import { useEffect, useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import {
  approveAgent,
  approveBuilderFee,
  fetchAgentApprovals,
  fetchBuilderApprovals,
  fetchUserState,
} from "@/lib/hl";
import {
  BUILDER_FEE_F,
  MAX_BUILDER_FEE,
  SUNNY_BUILDER_ADDRESS,
} from "@/lib/constants";

type Status = "idle" | "loading" | "success" | "error";
type StepState = { status: Status; message?: string; data?: unknown };

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [userState, setUserState] = useState<{
    accountValue?: string;
    builderApproved?: boolean;
    agentCount?: number;
  }>({});

  const [step1, setStep1] = useState<StepState>({ status: "idle" });
  const [step2, setStep2] = useState<StepState>({ status: "idle" });
  const [step3, setStep3] = useState<StepState>({ status: "idle" });

  const [agentKey, setAgentKey] = useState<`0x${string}` | null>(null);
  const [agentAddress, setAgentAddress] = useState<`0x${string}` | null>(null);

  async function refreshState() {
    if (!address) return;
    try {
      const [state, builders, agents] = await Promise.all([
        fetchUserState(address),
        fetchBuilderApprovals(address),
        fetchAgentApprovals(address),
      ]);

      const accountValue = state?.marginSummary?.accountValue;
      const builderApproved = Array.isArray(builders)
        ? builders.some(
            (b: { builder: string }) =>
              b.builder?.toLowerCase() === SUNNY_BUILDER_ADDRESS.toLowerCase(),
          )
        : false;
      const agentCount = Array.isArray(agents) ? agents.length : 0;
      setUserState({ accountValue, builderApproved, agentCount });
    } catch (e) {
      console.error("refreshState", e);
    }
  }

  useEffect(() => {
    if (isConnected) refreshState();
  }, [isConnected, address]);

  async function handleApproveBuilder() {
    if (!walletClient || !address) return;
    setStep1({ status: "loading", message: "Sign in your wallet…" });
    try {
      const wallet = {
        address,
        signTypedData: walletClient.signTypedData.bind(walletClient),
      };
      const res = await approveBuilderFee(wallet, MAX_BUILDER_FEE);
      setStep1({ status: "success", message: `Approved ${MAX_BUILDER_FEE} for Sunny`, data: res });
      await refreshState();
    } catch (e: unknown) {
      setStep1({ status: "error", message: (e as Error).message });
    }
  }

  async function handleApproveAgent() {
    if (!walletClient || !address) return;
    setStep2({ status: "loading", message: "Generating agent + sign…" });
    try {
      const pk = generatePrivateKey();
      const account = privateKeyToAccount(pk);
      setAgentKey(pk);
      setAgentAddress(account.address);

      const wallet = {
        address,
        signTypedData: walletClient.signTypedData.bind(walletClient),
      };
      const agentName = `ATHTest ${Date.now().toString().slice(-6)}`;
      const res = await approveAgent(wallet, account.address, agentName);
      setStep2({
        status: "success",
        message: `Agent ${account.address.slice(0, 10)}… approved as "${agentName}"`,
        data: res,
      });
      await refreshState();
    } catch (e: unknown) {
      setStep2({ status: "error", message: (e as Error).message });
    }
  }

  async function handleTestTrade() {
    if (!agentKey || !address) return;
    setStep3({ status: "loading", message: "Placing test order via agent…" });
    try {
      const agent = privateKeyToAccount(agentKey);
      const transport = new HttpTransport();
      const exchange = new ExchangeClient({ transport, wallet: agent });
      const info = new InfoClient({ transport });

      const mids = await info.allMids();
      const mid = parseFloat(mids["ETH"] ?? "0");
      if (!mid) throw new Error("Could not fetch ETH mid");

      const limitPx = Math.round(mid * 1.005).toString();
      // HL min order value $10 — at ETH ~$2300, need ≥0.005 ETH (~$11)
      const size = "0.005";

      const result = await exchange.order({
        orders: [
          {
            a: 1,
            b: true,
            p: limitPx,
            s: size,
            r: false,
            t: { limit: { tif: "Ioc" } },
          },
        ],
        grouping: "na",
        builder: { b: SUNNY_BUILDER_ADDRESS, f: BUILDER_FEE_F },
      });

      setStep3({
        status: "success",
        message: `Order sent! Builder fee ${BUILDER_FEE_F / 10} bps to Sunny`,
        data: result,
      });
    } catch (e: unknown) {
      setStep3({ status: "error", message: (e as Error).message });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 flex-1 flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ATH</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Builder Code + Agent verification harness
          </p>
        </div>
        <ConnectButton />
      </header>

      {!isConnected && (
        <Card>
          <p className="text-sm text-slate-300">
            Connect a Hyperliquid-funded wallet to run the verification flow.
            Use a fresh test wallet (~$30 USDC deposited to HL perps).
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Builder address (Sunny):{" "}
            <code className="text-slate-300">{SUNNY_BUILDER_ADDRESS}</code>
          </p>
        </Card>
      )}

      {isConnected && (
        <>
          <Card>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Connected wallet
            </div>
            <div className="font-mono text-sm break-all">{address}</div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Tile label="HL Balance" value={fmtUsd(userState.accountValue)} />
              <Tile
                label="Builder approved"
                value={userState.builderApproved ? "✓ yes" : "— no"}
                tone={userState.builderApproved ? "good" : "muted"}
              />
              <Tile
                label="Agents"
                value={userState.agentCount?.toString() ?? "—"}
              />
            </div>
            <button
              onClick={refreshState}
              className="text-xs text-slate-400 hover:text-slate-200 mt-3"
            >
              ↻ refresh
            </button>
          </Card>

          <StepCard
            n={1}
            title="Approve Builder Fee"
            desc={`Sign once to allow the Sunny address to charge up to ${MAX_BUILDER_FEE} per trade. Required before any trade can carry a builder fee.`}
            state={step1}
            cta="Approve builder fee"
            onClick={handleApproveBuilder}
          />

          <StepCard
            n={2}
            title="Generate + Approve Agent"
            desc="Generate a fresh agent keypair in your browser. Sign to authorize it to place trades on your HL account (cannot withdraw)."
            state={step2}
            cta="Generate + approve agent"
            onClick={handleApproveAgent}
            extra={
              agentAddress ? (
                <div className="text-xs text-slate-400 font-mono mt-2 break-all">
                  Agent: {agentAddress}
                </div>
              ) : null
            }
          />

          <StepCard
            n={3}
            title="Place test trade with builder code"
            desc={`Agent places a tiny IOC long ETH 0.001 with builder fee = ${BUILDER_FEE_F / 10} bps to Sunny. Verifies the full chain works end-to-end.`}
            state={step3}
            cta="Place test trade"
            onClick={handleTestTrade}
            disabled={!agentKey}
          />

          {step3.status === "success" && (
            <Card>
              <div className="text-sm text-emerald-400 font-bold mb-2">
                ✅ Verified end-to-end
              </div>
              <p className="text-xs text-slate-400">
                Builder fees from this trade should now be claimable from the
                Sunny address. Check{" "}
                <a
                  href={`https://app.hyperliquid.xyz/portfolio?address=${SUNNY_BUILDER_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-slate-200"
                >
                  Sunny portfolio
                </a>{" "}
                and your test user position.
              </p>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

function fmtUsd(v: string | undefined) {
  if (!v) return "—";
  const n = parseFloat(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : v;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#0c1828] p-5">
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "muted";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "muted"
        ? "text-slate-500"
        : "text-slate-100";
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a1422] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`text-sm font-mono font-bold mt-0.5 ${color}`}>
        {value}
      </div>
    </div>
  );
}

function StepCard({
  n,
  title,
  desc,
  state,
  cta,
  onClick,
  disabled,
  extra,
}: {
  n: number;
  title: string;
  desc: string;
  state: StepState;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  const statusColor: Record<Status, string> = {
    idle: "border-slate-700 bg-slate-800 text-slate-300",
    loading: "border-amber-700 bg-amber-900/40 text-amber-300",
    success: "border-emerald-700 bg-emerald-900/40 text-emerald-300",
    error: "border-rose-700 bg-rose-900/40 text-rose-300",
  };
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="text-xl font-bold text-slate-500 leading-tight">{n}</div>
        <div className="flex-1">
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">{desc}</p>
          {extra}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={onClick}
              disabled={disabled || state.status === "loading"}
              className="rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state.status === "loading" ? "…" : cta}
            </button>
            {state.message && (
              <span
                className={`text-xs px-2 py-1 rounded border font-mono ${statusColor[state.status]}`}
              >
                {state.status === "success" && "✓ "}
                {state.status === "error" && "✗ "}
                {state.message}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
