"use client";

import { useEffect, useState } from "react";

type AssetPosition = {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    leverage?: { value: number };
  };
};

type ClosedTrade = {
  asset: string;
  side: "long" | "short";
  exitPx: number;
  exitSize: number;
  pnl: number;
  fee: number;
  closedAt: number;       // ms epoch
  fillCount: number;
};

type Tab = "open" | "closed";

function fmtUsd(n: number, withSign = false): string {
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PositionsTabs({
  address,
  openPositions,
}: {
  address: string;
  openPositions: AssetPosition[];
}) {
  const [tab, setTab] = useState<Tab>("open");
  const [closed, setClosed] = useState<ClosedTrade[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "closed") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/users/closed-positions?address=${encodeURIComponent(address)}&limit=50`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { trades: ClosedTrade[] };
        if (!cancelled) setClosed(data.trades);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60_000); // refresh ทุก 60s
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tab, address]);

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      {/* Tabs */}
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex gap-1">
          <TabButton active={tab === "open"} onClick={() => setTab("open")}>
            Open ({openPositions.length})
          </TabButton>
          <TabButton active={tab === "closed"} onClick={() => setTab("closed")}>
            Closed
          </TabButton>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
          {tab === "open" ? "from your HL account" : "last 50 closed"}
        </span>
      </div>

      {tab === "open" ? (
        <OpenTable positions={openPositions} />
      ) : (
        <ClosedTable trades={closed} loading={loading} error={error} />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
        active
          ? "bg-[color:var(--surface-2)] text-[color:var(--text)] border border-[color:var(--border)]"
          : "text-[color:var(--meteor)] hover:text-[color:var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function OpenTable({ positions }: { positions: AssetPosition[] }) {
  if (positions.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
        No positions open. The fleet is watching.
      </div>
    );
  }
  return (
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
              <tr key={p.coin} className="border-t border-[color:var(--border)]">
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
                <td className="text-right py-2 px-2 font-mono">{Math.abs(sz)}</td>
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
  );
}

function ClosedTable({
  trades,
  loading,
  error,
}: {
  trades: ClosedTrade[] | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !trades) {
    return (
      <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
        loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-10 text-center text-sm text-[color:var(--red-dwarf)]">
        {error}
      </div>
    );
  }
  if (!trades || trades.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
        No closed trades yet.
      </div>
    );
  }

  // Aggregate stats
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  return (
    <>
      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs font-mono">
        <span className="text-[color:var(--meteor)]">
          Total:{" "}
          <span
            className="font-bold"
            style={{
              color:
                totalPnl >= 0 ? "var(--green-giant)" : "var(--red-dwarf)",
            }}
          >
            {fmtUsd(totalPnl, true)}
          </span>
        </span>
        <span className="text-[color:var(--meteor)]">
          W/L:{" "}
          <span className="font-bold text-[color:var(--text)]">
            {wins}/{losses}
          </span>
        </span>
        <span className="text-[color:var(--meteor)]">
          WR:{" "}
          <span className="font-bold text-[color:var(--text)]">
            {winRate.toFixed(0)}%
          </span>
        </span>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)]">
              <th className="text-left py-2 px-2">Coin</th>
              <th className="text-right py-2 px-2">Side</th>
              <th className="text-right py-2 px-2">Exit Size</th>
              <th className="text-right py-2 px-2">Exit Px</th>
              <th className="text-right py-2 px-2">PnL</th>
              <th className="text-right py-2 px-2">Fee</th>
              <th className="text-right py-2 px-2">Closed</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => {
              const isLong = t.side === "long";
              const positive = t.pnl >= 0;
              return (
                <tr
                  key={`${t.asset}-${t.closedAt}-${i}`}
                  className="border-t border-[color:var(--border)]"
                >
                  <td className="py-2 px-2 font-bold">{t.asset}</td>
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
                    {t.exitSize.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-mono">
                    ${t.exitPx.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 5,
                    })}
                  </td>
                  <td
                    className="text-right py-2 px-2 font-mono font-bold"
                    style={{
                      color: positive
                        ? "var(--green-giant)"
                        : "var(--red-dwarf)",
                    }}
                  >
                    {fmtUsd(t.pnl, true)}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-xs text-[color:var(--meteor)]">
                    ${t.fee.toFixed(2)}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-xs">
                    <span title={fmtTime(t.closedAt)}>
                      {fmtRelativeTime(t.closedAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
