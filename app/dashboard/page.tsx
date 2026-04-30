"use client";

import { useAccount } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchUserState } from "@/lib/hl";
import {
  loadAgentMeta,
  loadPaused,
  loadSettings,
  savePaused,
  type AgentMeta,
  type UserSettings,
} from "@/lib/agentStorage";
import { RISK_PROFILES } from "@/lib/leverage";
import { FLEET } from "@/app/components/CaptainCard";
import { Constellation } from "@/app/components/Constellation";
import { AlphaBanner } from "@/app/components/AlphaBanner";
import { CaptainLog } from "@/app/components/CaptainLog";
import { TelegramConnect } from "@/app/components/TelegramConnect";
import { PnLSummaryCard } from "@/app/components/PnLSummaryCard";

type AssetPosition = {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    leverage: { type: string; value: number };
    unrealizedPnl: string;
    returnOnEquity: string;
    positionValue: string;
  };
};

type ClearinghouseState = {
  marginSummary?: { accountValue: string; totalNtlPos: string; totalRawUsd: string };
  assetPositions?: AssetPosition[];
  withdrawable?: string;
};

type CaptainStatus = {
  id: string;
  asset: string;
  status: string;
  emoji?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [hlState, setHlState] = useState<ClearinghouseState | null>(null);
  const [agent, setAgent] = useState<AgentMeta | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [captains, setCaptains] = useState<CaptainStatus[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setAgent(loadAgentMeta());
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (address) setPaused(loadPaused(address));
  }, [address]);

  function togglePause() {
    if (!address) return;
    const next = !paused;
    savePaused(address, next);
    setPaused(next);
  }

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/join");
      return;
    }
  }, [isConnected, address, router]);

  useEffect(() => {
    if (!address) return;
    let mounted = true;
    const tick = () =>
      fetchUserState(address)
        .then((s) => mounted && setHlState(s))
        .catch(() => null);
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [address]);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/playbook", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        // Sunny playbook structure varies; we attempt to extract captain info loosely.
        const list: CaptainStatus[] = [];
        const captains = d?.captains ?? d?.fleet ?? d ?? null;
        if (captains && typeof captains === "object") {
          for (const [asset, info] of Object.entries(captains)) {
            if (typeof info !== "object" || !info) continue;
            const i = info as Record<string, unknown>;
            list.push({
              id: asset,
              asset,
              status:
                (i.status as string) ||
                (i.state as string) ||
                (i.label as string) ||
                "—",
              emoji: i.emoji as string | undefined,
            });
          }
        }
        if (mounted) setCaptains(list);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const balance = hlState?.marginSummary?.accountValue
    ? parseFloat(hlState.marginSummary.accountValue)
    : 0;
  const totalNtl = hlState?.marginSummary?.totalNtlPos
    ? parseFloat(hlState.marginSummary.totalNtlPos)
    : 0;
  const positions = hlState?.assetPositions ?? [];
  const totalUnrealizedPnl = positions.reduce(
    (sum, p) => sum + parseFloat(p.position.unrealizedPnl ?? "0"),
    0,
  );

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-[color:var(--meteor)]">Redirecting to onboarding…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 flex-1 flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
            Your fleet
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[color:var(--meteor)] font-mono">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full orbit-pulse"
              style={{
                backgroundColor: paused
                  ? "var(--red-dwarf)"
                  : "var(--green-giant)",
              }}
            />
            {paused ? "Paused" : "Live"} · {address?.slice(0, 6)}…
            {address?.slice(-4)}
          </div>
          <button
            onClick={togglePause}
            className="rounded-full border px-4 py-1.5 text-xs font-bold font-mono uppercase tracking-wider transition"
            style={{
              borderColor: paused
                ? "var(--green-giant)"
                : "var(--red-dwarf)",
              color: paused
                ? "var(--green-giant)"
                : "var(--red-dwarf)",
            }}
          >
            {paused ? "Resume fleet" : "Pause fleet"}
          </button>
        </div>
      </header>

      <AlphaBanner />

      {paused && (
        <div className="rounded-xl border border-[color:var(--red-dwarf)]/40 bg-[color:var(--red-dwarf)]/10 px-4 py-3 text-xs text-[color:var(--meteor)]">
          <span className="text-[color:var(--red-dwarf)] font-bold">
            Fleet paused.
          </span>{" "}
          Existing positions stay open and will continue to update; the fleet
          will not enter new positions until you resume. Pause is enforced once
          the multi-account runner ships — until then it&apos;s a UI flag only.
        </div>
      )}

      {/* P&L Summary Card */}
      {address && <PnLSummaryCard address={address} />}

      {/* Top stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="HL Balance" value={fmtUsd(balance)} />
        <Stat
          label="Open positions"
          value={positions.length.toString()}
          sub={`${fmtUsd(totalNtl)} notional`}
        />
        <Stat
          label="Unrealized P&L"
          value={`${totalUnrealizedPnl >= 0 ? "+" : ""}${fmtUsd(totalUnrealizedPnl)}`}
          tone={totalUnrealizedPnl >= 0 ? "good" : "loss"}
        />
        <Stat
          label="Risk profile"
          value={settings ? RISK_PROFILES[settings.riskProfile].label : "—"}
          sub={settings ? `${settings.leverage}x default` : undefined}
        />
      </section>

      {/* Fleet status */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-bold text-lg">Fleet status</h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
              live · refresh 15s
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {FLEET.map((c) => {
              const live = captains.find(
                (s) => s.asset?.toUpperCase() === c.asset.toUpperCase(),
              );
              return (
                <div
                  key={c.key}
                  className="relative overflow-hidden rounded-xl border p-4"
                  style={{
                    borderColor: `${c.color.replace("var(--", "").replace(")", "")}30`,
                    backgroundColor: "var(--surface-2)",
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <div
                        className="text-[10px] uppercase tracking-widest font-mono"
                        style={{ color: c.color }}
                      >
                        {c.asset}
                      </div>
                      <div className="font-bold text-base mt-0.5">{c.name}</div>
                    </div>
                    <Constellation name={c.key} color={c.color} size={48} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: live ? "var(--green-giant)" : "var(--dust)",
                      }}
                    />
                    <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--meteor)]">
                      {live ? live.status || "active" : "standby"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent panel */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <h2 className="font-bold text-lg">Your agent</h2>
          <p className="text-xs text-[color:var(--meteor)] mt-1">
            Agent is the trade-only sub-key the fleet uses to place orders.
          </p>
          {agent ? (
            <>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
                    Address
                  </dt>
                  <dd className="font-mono text-xs break-all mt-1">
                    {agent.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
                    Name
                  </dt>
                  <dd className="font-mono text-xs mt-1">{agent.name}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
                    Approved
                  </dt>
                  <dd className="font-mono text-xs mt-1">
                    {new Date(agent.approvedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <a
                href={`https://app.hyperliquid.xyz/API`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block text-center text-xs text-[color:var(--meteor)] hover:text-[color:var(--starlight)] underline"
              >
                Manage / revoke on Hyperliquid →
              </a>
            </>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-[color:var(--red-dwarf)]">
                No agent in this browser session.
              </p>
              <Link
                href="/join"
                className="mt-3 inline-block rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-4 py-2 text-sm font-bold"
              >
                Re-authorize agent
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Telegram connect */}
      <TelegramConnect address={address} />

      {/* Captain log — live activity feed from Sunny playbook */}
      <CaptainLog />

      {/* Open positions */}
      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-bold text-lg">Open positions</h2>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            from your HL account
          </span>
        </div>
        {positions.length === 0 ? (
          <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
            No positions open. The fleet is watching.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
                  <th className="text-left py-2 px-2">Coin</th>
                  <th className="text-right py-2 px-2">Side</th>
                  <th className="text-right py-2 px-2">Size</th>
                  <th className="text-right py-2 px-2">Entry</th>
                  <th className="text-right py-2 px-2">Lev</th>
                  <th className="text-right py-2 px-2">Notional</th>
                  <th className="text-right py-2 px-2">PnL</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((ap) => {
                  const p = ap.position;
                  const sz = parseFloat(p.szi);
                  const isLong = sz > 0;
                  const pnl = parseFloat(p.unrealizedPnl);
                  return (
                    <tr
                      key={p.coin}
                      className="border-t border-[color:var(--border)]"
                    >
                      <td className="py-2 px-2 font-bold">{p.coin}</td>
                      <td
                        className="text-right py-2 px-2 font-mono text-xs"
                        style={{
                          color: isLong
                            ? "var(--green-giant)"
                            : "var(--red-dwarf)",
                        }}
                      >
                        {isLong ? "LONG" : "SHORT"}
                      </td>
                      <td className="text-right py-2 px-2 font-mono">
                        {Math.abs(sz)}
                      </td>
                      <td className="text-right py-2 px-2 font-mono">
                        ${parseFloat(p.entryPx).toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-2 font-mono">
                        {p.leverage?.value}x
                      </td>
                      <td className="text-right py-2 px-2 font-mono">
                        ${parseFloat(p.positionValue).toFixed(2)}
                      </td>
                      <td
                        className="text-right py-2 px-2 font-mono font-bold"
                        style={{
                          color: pnl >= 0
                            ? "var(--green-giant)"
                            : "var(--red-dwarf)",
                        }}
                      >
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-center text-xs text-[color:var(--meteor)]">
        ATH dashboard · data direct from Hyperliquid
      </div>
    </main>
  );
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "loss";
}) {
  const color =
    tone === "good"
      ? "text-[color:var(--green-giant)]"
      : tone === "loss"
        ? "text-[color:var(--red-dwarf)]"
        : "text-[color:var(--starlight)]";
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
        {label}
      </div>
      <div className={`text-xl font-bold font-mono mt-1 ${color}`}>{value}</div>
      {sub && (
        <div className="text-[10px] text-[color:var(--meteor)] font-mono mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
