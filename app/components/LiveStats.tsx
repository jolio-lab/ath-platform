"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalTrades?: number;
  winRate?: number;
  totalPnl?: number;
  accountValue?: number;
};

// Best-effort extractor — Sunny's playbook shape may evolve.
function extractStats(d: unknown): Stats {
  const s: Stats = {};
  if (!d || typeof d !== "object") return s;
  const obj = d as Record<string, unknown>;
  const fleet = obj.fleet as Record<string, unknown> | undefined;
  const stats = obj.stats as Record<string, unknown> | undefined;
  const account = obj.account as Record<string, unknown> | undefined;

  const totalTrades =
    (stats?.totalTrades as number | undefined) ??
    (fleet?.totalTrades as number | undefined) ??
    (obj.totalTrades as number | undefined);
  if (typeof totalTrades === "number") s.totalTrades = totalTrades;

  const winRate =
    (stats?.winRate as number | undefined) ??
    (fleet?.winRate as number | undefined) ??
    (obj.winRate as number | undefined);
  if (typeof winRate === "number") s.winRate = winRate;

  const totalPnl =
    (stats?.totalPnl as number | undefined) ??
    (fleet?.totalPnl as number | undefined) ??
    (obj.totalPnl as number | undefined);
  if (typeof totalPnl === "number") s.totalPnl = totalPnl;

  const accountValue =
    (account?.balance as number | undefined) ??
    (obj.balance as number | undefined) ??
    (obj.accountValue as number | undefined);
  if (typeof accountValue === "number") s.accountValue = accountValue;

  return s;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        // Try dedicated stats endpoint first (Sunny trade aggregate)
        const r = await fetch("/api/sunny/stats", { cache: "no-store" });
        if (r.ok) {
          const d = (await r.json()) as Stats;
          if (alive) setStats(d);
          return;
        }
      } catch {
        // fall through
      }
      // Fallback: extract from /api/playbook (legacy shape)
      try {
        const r = await fetch("/api/playbook", { cache: "no-store" });
        const d = await r.json();
        if (alive) setStats(extractStats(d));
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile
          label="Total trades"
          value={stats?.totalTrades?.toString() ?? "—"}
        />
        <Tile
          label="Win rate"
          value={
            stats?.winRate !== undefined
              ? `${stats.winRate.toFixed(1)}%`
              : "—"
          }
          tone={
            stats?.winRate !== undefined && stats.winRate >= 55
              ? "good"
              : "neutral"
          }
        />
        <Tile
          label="Active captains"
          value="5"
          sub="Vega · Sirius · Atlas · Altair · Lyra"
        />
        <Tile
          label="Network"
          value="Hyperliquid"
          sub="Mainnet · perps"
        />
      </div>
      <p className="mt-3 text-center text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
        live from the founder&apos;s account · sample-of-one
      </p>
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-[color:var(--green-giant)]"
      : "text-[color:var(--starlight)]";
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-center">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--meteor)] font-mono">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && (
        <div className="text-[10px] text-[color:var(--meteor)] font-mono mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}
