"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { clearAgent, clearSettings, loadAgentMeta } from "@/lib/agentStorage";

export function Nav() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [hasAgent, setHasAgent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setHasAgent(!!loadAgentMeta());
  }, [isConnected]);

  const joined = isConnected && hasAgent;

  function handleDisconnect() {
    const ok = window.confirm(
      "Disconnect from ATH? Your agent key in this browser will be cleared and the fleet will stop placing trades from this device.\n\nNote: this does NOT revoke the agent on Hyperliquid. To fully revoke, visit Hyperliquid → API.",
    );
    if (!ok) return;
    clearAgent();
    clearSettings();
    setHasAgent(false);
    setMenuOpen(false);
    disconnect();
    router.push("/");
  }

  return (
    <nav className="border-b border-[color:var(--border)] bg-[color:var(--void)]/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight text-lg"
        >
          <PolarisStar />
          ATH
        </Link>
        <div className="flex items-center gap-5 text-sm text-[color:var(--meteor)]">
          <Link
            href="/#fleet"
            className="hover:text-[color:var(--starlight)] hidden sm:inline"
          >
            Fleet
          </Link>
          <Link
            href="/guide"
            className="hover:text-[color:var(--starlight)] hidden sm:inline"
          >
            Guide
          </Link>
          <Link
            href="/fleet"
            className="hover:text-[color:var(--starlight)] hidden sm:inline"
          >
            Intel
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-[color:var(--starlight)] hidden sm:inline"
          >
            Dashboard
          </Link>
          {joined ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[color:var(--border)] hover:border-[color:var(--meteor)] px-3 py-1.5 text-xs font-mono transition"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--green-giant)] orbit-pulse" />
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg overflow-hidden"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-xs hover:bg-[color:var(--surface-2)]"
                  >
                    Open dashboard
                  </Link>
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-2 text-xs text-[color:var(--red-dwarf)] hover:bg-[color:var(--surface-2)]"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/join"
              className="rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-4 py-1.5 text-xs font-bold hover:opacity-90 transition"
            >
              Join
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function PolarisStar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="opacity-90"
    >
      <path
        d="M10 1 L11.5 8.5 L19 10 L11.5 11.5 L10 19 L8.5 11.5 L1 10 L8.5 8.5 Z"
        fill="var(--polaris)"
      />
    </svg>
  );
}
