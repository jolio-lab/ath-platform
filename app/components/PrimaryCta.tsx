"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { loadAgentMeta } from "@/lib/agentStorage";

type Size = "lg" | "md";

export function PrimaryCta({ size = "md" }: { size?: Size }) {
  const { isConnected } = useAccount();
  const [hasAgent, setHasAgent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasAgent(!!loadAgentMeta());
  }, [isConnected]);

  const joined = mounted && isConnected && hasAgent;
  const padding = size === "lg" ? "px-7 py-3" : "px-6 py-3";

  if (joined) {
    return (
      <Link
        href="/dashboard"
        className={`inline-flex items-center gap-2 rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] ${padding} text-sm font-bold hover:opacity-90 transition`}
      >
        Open dashboard
        <span aria-hidden>→</span>
      </Link>
    );
  }

  return (
    <Link
      href="/join"
      className={`inline-flex items-center gap-2 rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] ${padding} text-sm font-bold hover:opacity-90 transition`}
    >
      Join the fleet
      <span aria-hidden>→</span>
    </Link>
  );
}
