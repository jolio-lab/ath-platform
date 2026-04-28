"use client";

import { useEffect, useState } from "react";

type Thought = {
  id: number;
  created_at: string;
  loop_id: number | null;
  actor: string;
  asset: string | null;
  action: string;
  verdict: string;
  confidence: number | null;
};

type Response = { thoughts?: Thought[] };

const REFRESH_MS = 20_000;
const ACTORS = ["all", "ลูฟี่", "นามิ", "โซโล", "ซันจิ", "โรบิน", "มิฮอว์ค", "ช็อปเปอร์"];

export function CrewFeed() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [actor, setActor] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const params = new URLSearchParams({ limit: "60" });
        if (actor !== "all") params.set("actor", actor);
        const r = await fetch(
          `/api/sunny/crew-feed?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: Response = await r.json();
        if (!mounted) return;
        setThoughts(Array.isArray(d.thoughts) ? d.thoughts : []);
        setError(null);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [actor]);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
            Crew Activity Feed
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            Behind the scenes — what the founder&apos;s crew is thinking
          </h2>
          <p className="text-xs text-[color:var(--meteor)] mt-1">
            Sunny ใช้ทีม One Piece characters คุย/ตัดสินใจ. คุณเห็น log ตรงๆ —
            transparent, real-time
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
          refresh 20s
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ACTORS.map((a) => (
          <button
            key={a}
            onClick={() => setActor(a)}
            className="rounded-full border px-3 py-1 text-xs font-mono transition"
            style={{
              borderColor:
                actor === a ? "var(--starlight)" : "var(--border)",
              backgroundColor:
                actor === a ? "var(--surface-2)" : "transparent",
              color:
                actor === a
                  ? "var(--starlight)"
                  : "var(--meteor)",
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-[color:var(--red-dwarf)]/40 bg-[color:var(--red-dwarf)]/10 px-4 py-3 text-xs text-[color:var(--meteor)] mb-3">
          {error}
        </div>
      )}

      {thoughts.length === 0 ? (
        <div className="py-10 text-center text-sm text-[color:var(--meteor)]">
          {error ? "Could not reach feed." : "Loading thoughts…"}
        </div>
      ) : (
        <ul className="space-y-2">
          {thoughts.map((t) => (
            <ThoughtEntry key={t.id} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function actorTone(actor: string): string {
  const colors: Record<string, string> = {
    ลูฟี่: "var(--polaris)",
    โซโล: "var(--vega)",
    ซันจิ: "var(--sirius)",
    นามิ: "var(--meteor)",
    โรบิน: "var(--lyra)",
    มิฮอว์ค: "var(--red-dwarf)",
    ช็อปเปอร์: "var(--green-giant)",
  };
  return colors[actor] ?? "var(--starlight)";
}

function actionEmoji(action: string): string {
  if (action.includes("signal")) return "🚨";
  if (action.includes("analyz")) return "🧠";
  if (action.includes("pass") || action.includes("rest") || action.includes("watch")) return "👁";
  if (action.includes("open") || action.includes("enter")) return "🟢";
  if (action.includes("close") || action.includes("exit")) return "🔚";
  if (action.includes("alert") || action.includes("warn")) return "⚠️";
  return "·";
}

function ThoughtEntry({ t }: { t: Thought }) {
  const tone = actorTone(t.actor);
  return (
    <li className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span style={{ color: tone }} className="font-bold text-sm">
            {t.actor}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--meteor)]">
            {actionEmoji(t.action)} {t.action.replace(/_/g, " ")}
          </span>
          {t.asset && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--starlight)]">
              {t.asset}
            </span>
          )}
          {typeof t.confidence === "number" && (
            <span className="text-[10px] font-mono text-[color:var(--meteor)]">
              {t.confidence}%
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-[color:var(--meteor)]">
          {timeAgo(t.created_at)}
        </span>
      </div>
      <p className="mt-2 text-xs text-[color:var(--meteor)] leading-relaxed break-words">
        {t.verdict}
      </p>
    </li>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
