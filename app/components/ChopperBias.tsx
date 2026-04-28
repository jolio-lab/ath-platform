"use client";

import { useEffect, useState } from "react";

type TF = "15m" | "1h" | "4h" | "1d";

type TFStats = {
  tf: TF;
  up_pct: number;
  down_pct: number;
  flat_pct: number;
  dominant: "up" | "down" | "flat" | "mixed";
  dominant_pct: number;
  flips: number;
  momentum: "up" | "down" | "flat";
};

type AssetBias = {
  asset: string;
  total_samples: number;
  timeframes: Record<TF, TFStats>;
};

type Response = {
  window?: string;
  assets?: AssetBias[];
};

const TFS: TF[] = ["15m", "1h", "4h", "1d"];

export function ChopperBiasPanel() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/sunny/chopper-bias", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: Response = await r.json();
        if (mounted) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
            Chopper · Trend Bias
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            Where each market is leaning
          </h2>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
          window {data?.window ?? "1h"} · refresh 60s
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--red-dwarf)]/40 bg-[color:var(--red-dwarf)]/10 px-4 py-3 text-xs text-[color:var(--meteor)]">
          {error}
        </div>
      )}

      {!data?.assets?.length ? (
        <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
          Loading bias…
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[color:var(--meteor)] font-mono">
                <th className="text-left py-3 px-4">Asset</th>
                {TFS.map((tf) => (
                  <th key={tf} className="text-center py-3 px-3">
                    {tf}
                  </th>
                ))}
                <th className="text-right py-3 px-4">Samples</th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map((a) => (
                <tr
                  key={a.asset}
                  className="border-t border-[color:var(--border)]"
                >
                  <td className="py-3 px-4 font-bold">{a.asset}</td>
                  {TFS.map((tf) => {
                    const stats = a.timeframes[tf];
                    return (
                      <td key={tf} className="text-center py-3 px-3">
                        <BiasCell stats={stats} />
                      </td>
                    );
                  })}
                  <td className="text-right py-3 px-4 font-mono text-xs text-[color:var(--meteor)]">
                    {a.total_samples}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BiasCell({ stats }: { stats?: TFStats }) {
  if (!stats) {
    return <span className="text-[color:var(--meteor)] text-xs">—</span>;
  }
  const { dominant, dominant_pct, momentum } = stats;
  const color =
    dominant === "up"
      ? "var(--green-giant)"
      : dominant === "down"
        ? "var(--red-dwarf)"
        : dominant === "mixed"
          ? "var(--meteor)"
          : "var(--dust)";
  const label =
    dominant === "up" ? "▲" :
    dominant === "down" ? "▼" :
    dominant === "mixed" ? "≈" : "•";

  const momMark =
    momentum === dominant && dominant !== "flat" ? "" :
    momentum === "up" ? " ↑" :
    momentum === "down" ? " ↓" : "";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span style={{ color }} className="text-base font-bold leading-none">
        {label}
      </span>
      <span className="text-[10px] font-mono text-[color:var(--meteor)] leading-none">
        {Math.round(dominant_pct)}%{momMark}
      </span>
    </div>
  );
}
