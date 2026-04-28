"use client";

import { useEffect, useState } from "react";

type LinkCode = {
  code: string;
  deep_link_url: string;
  bot_username: string;
  expires_at: string;
  expires_in_minutes: number;
};

type Status = {
  linked: boolean;
  username: string | null;
  linked_at: string | null;
};

export function TelegramConnect({ address }: { address?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState<LinkCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!address) return;
    refreshStatus();
    const id = setInterval(refreshStatus, 8000);
    return () => clearInterval(id);
  }, [address]);

  useEffect(() => {
    if (!code) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const ms = new Date(code.expires_at).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [code]);

  async function refreshStatus() {
    if (!address) return;
    try {
      const r = await fetch(`/api/telegram/status?address=${address}`, {
        cache: "no-store",
      });
      if (r.ok) setStatus(await r.json());
    } catch {
      /* ignore transient */
    }
  }

  async function generate() {
    if (!address) return;
    setBusy(true);
    setErr(null);
    setCode(null);
    try {
      const r = await fetch("/api/telegram/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setCode(d as LinkCode);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--meteor)]">
            Telegram
          </div>
          <div className="text-sm font-bold mt-0.5">
            {status?.linked
              ? `Linked${status.username ? ` · @${status.username}` : ""}`
              : "Not connected"}
          </div>
          {status?.linked && status.linked_at && (
            <div className="text-[10px] text-[color:var(--meteor)] mt-0.5">
              since {new Date(status.linked_at).toLocaleString()}
            </div>
          )}
        </div>
        {!status?.linked && (
          <button
            onClick={generate}
            disabled={busy || !address}
            className="rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-4 py-1.5 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Generating…" : "Connect Telegram"}
          </button>
        )}
        {status?.linked && (
          <span className="text-xs text-[color:var(--meteor)]">
            Send <code className="px-1.5 py-0.5 rounded bg-[color:var(--surface-2)] font-mono">/unlink</code> in
            the bot to disconnect
          </span>
        )}
      </div>

      {err && (
        <div className="mt-3 text-xs text-[color:var(--red-dwarf)] font-mono">
          ✗ {err}
        </div>
      )}

      {code && !status?.linked && (
        <div className="mt-4 rounded-lg border border-[color:var(--polaris)]/40 bg-[color:var(--polaris)]/10 p-4 text-sm">
          <div className="font-bold mb-2">📲 Open Telegram to verify</div>
          <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed text-[color:var(--meteor)]">
            <li>
              Tap{" "}
              <a
                href={code.deep_link_url}
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--starlight)] underline decoration-dotted font-mono"
              >
                {code.deep_link_url}
              </a>
            </li>
            <li>
              Telegram will open <b>@{code.bot_username}</b>. Press{" "}
              <b>Start</b> — that&apos;s it.
            </li>
            <li>
              This page will update automatically once linked.
            </li>
          </ol>
          <div className="mt-3 text-[10px] font-mono text-[color:var(--meteor)]">
            Code: <span className="text-[color:var(--starlight)]">{code.code}</span>
            {" · "}
            expires in {Math.floor(secondsLeft / 60)}:
            {(secondsLeft % 60).toString().padStart(2, "0")}
          </div>
        </div>
      )}
    </div>
  );
}
