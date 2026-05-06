"use client";

import { useEffect, useState } from "react";

type PnLStats = {
  joinedAt: string;
  daysActive: number;
  hoursActive: number;
  elapsedMs: number;
  initialCapital: number;
  currentBalance: number;
  totalPnl: number;
  totalPnlPct: number;
  bestAsset: { asset: string; pnl: number } | null;
  worstAsset: { asset: string; pnl: number } | null;
  byAsset: Array<{
    asset: string;
    pnl: number;
    realized: number;
    unrealized: number;
    trades: number;
  }>;
};

function fmtUsd(n: number, withSign = false): string {
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function PnLSummaryCard({ address }: { address: string }) {
  const [stats, setStats] = useState<PnLStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/users/pnl-stats?address=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as PnLStats;
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000); // refresh ทุก 30s
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address]);

  if (loading && !stats) {
    return (
      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <h2 className="font-bold text-lg mb-3">📊 P&L Summary</h2>
        <div className="text-sm text-[color:var(--meteor)] font-mono">
          loading…
        </div>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <h2 className="font-bold text-lg mb-3">📊 P&L Summary</h2>
        <div className="text-sm text-[color:var(--loss,#ef4444)] font-mono">
          {error || "no data"}
        </div>
      </section>
    );
  }

  const pnlPositive = stats.totalPnl >= 0;
  const tone = pnlPositive ? "var(--green-giant,#22c55e)" : "var(--loss,#ef4444)";
  const arrow = pnlPositive ? "▲" : "▼";

  // Active duration text
  let durationText: string;
  if (stats.daysActive > 0) {
    durationText = `${stats.daysActive}d ${stats.hoursActive}h`;
  } else if (stats.hoursActive > 0) {
    const minutes = Math.floor(
      (stats.elapsedMs - stats.hoursActive * 3_600_000) / 60_000,
    );
    durationText = `${stats.hoursActive}h ${minutes}m`;
  } else {
    durationText = `${Math.floor(stats.elapsedMs / 60_000)}m`;
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-bold text-lg">📊 P&L Summary</h2>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
          since join · refresh 30s
        </span>
      </div>

      {/* Top: Total balance (BIG) + Active time + Total PnL */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            Total Balance
          </div>
          <div className="font-bold text-xl mt-1">
            {fmtUsd(stats.currentBalance)}
          </div>
          <div className="text-[10px] font-mono text-[color:var(--meteor)] mt-0.5">
            initial ≈ {fmtUsd(stats.initialCapital)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            Active Time
          </div>
          <div className="font-bold text-xl mt-1">{durationText}</div>
        </div>
        <div
          className="col-span-2 md:col-span-1 rounded-xl border p-3"
          style={{ borderColor: `${tone}55`, backgroundColor: `${tone}10` }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            Total P&L
          </div>
          <div className="font-bold text-xl mt-1" style={{ color: tone }}>
            {arrow} {fmtUsd(stats.totalPnl, true)}
          </div>
          <div
            className="text-[11px] font-mono mt-0.5"
            style={{ color: tone }}
          >
            {fmtPct(stats.totalPnlPct)} since join
          </div>
        </div>
      </div>

      {/* Best / Worst asset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: stats.bestAsset
              ? "var(--green-giant,#22c55e)55"
              : "var(--border)",
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            🏆 Top Winner
          </div>
          {stats.bestAsset ? (
            <>
              <div className="font-bold text-lg mt-1">
                {stats.bestAsset.asset}
              </div>
              <div
                className="text-sm font-mono"
                style={{ color: "var(--green-giant,#22c55e)" }}
              >
                {fmtUsd(stats.bestAsset.pnl, true)}
              </div>
            </>
          ) : (
            <div className="text-sm text-[color:var(--meteor)] mt-1">
              — no winning asset yet
            </div>
          )}
        </div>
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: stats.worstAsset
              ? "var(--loss,#ef4444)55"
              : "var(--border)",
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            💀 Top Loser
          </div>
          {stats.worstAsset ? (
            <>
              <div className="font-bold text-lg mt-1">
                {stats.worstAsset.asset}
              </div>
              <div
                className="text-sm font-mono"
                style={{ color: "var(--loss,#ef4444)" }}
              >
                {fmtUsd(stats.worstAsset.pnl, true)}
              </div>
            </>
          ) : (
            <div className="text-sm text-[color:var(--meteor)] mt-1">
              — no losing asset yet
            </div>
          )}
        </div>
      </div>

      {/* Per-asset breakdown */}
      {stats.byAsset.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)] mb-2">
            All assets (realized + unrealized)
          </div>
          <div className="space-y-1.5">
            {stats.byAsset.map((a) => {
              const positive = a.pnl >= 0;
              return (
                <div
                  key={a.asset}
                  className="flex items-center justify-between text-sm font-mono"
                >
                  <span className="font-bold">{a.asset}</span>
                  <span className="text-[color:var(--meteor)] text-xs">
                    {a.trades} trade{a.trades === 1 ? "" : "s"}
                  </span>
                  <span
                    style={{
                      color: positive
                        ? "var(--green-giant,#22c55e)"
                        : "var(--loss,#ef4444)",
                    }}
                  >
                    {fmtUsd(a.pnl, true)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-[color:var(--meteor)] font-mono">
        * Initial capital ≈ current balance − total PnL (approximate — does not
        account for mid-period deposits/withdrawals)
      </div>
    </section>
  );
}
