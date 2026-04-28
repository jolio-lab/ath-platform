"use client";

import dynamic from "next/dynamic";

const Playbook = dynamic(
  () => import("@/app/components/Playbook").then((m) => m.Playbook),
  { ssr: false, loading: () => <SectionLoading label="loading playbook…" /> },
);

const ChopperBiasPanel = dynamic(
  () =>
    import("@/app/components/ChopperBias").then((m) => m.ChopperBiasPanel),
  { ssr: false, loading: () => <SectionLoading label="loading bias…" /> },
);

const CrewFeed = dynamic(
  () => import("@/app/components/CrewFeed").then((m) => m.CrewFeed),
  { ssr: false, loading: () => <SectionLoading label="loading feed…" /> },
);

export default function FleetPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 flex-1 flex flex-col gap-10">
      <header>
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
          Fleet intel
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          What the captains see
        </h1>
        <p className="mt-2 text-sm text-[color:var(--meteor)] max-w-2xl leading-relaxed">
          The fleet&apos;s live view of the markets. Captain plans, market
          bias, and the founder&apos;s crew log — read-only. The same data
          drives the trades that hit your account.
        </p>
      </header>

      <Playbook />
      <ChopperBiasPanel />
      <CrewFeed />

      <div className="text-center text-xs text-[color:var(--meteor)] pt-4">
        Intel sourced from the founder&apos;s Sunny captain · live mirror
      </div>
    </main>
  );
}

function SectionLoading({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] py-10 text-center text-sm text-[color:var(--meteor)]">
      {label}
    </div>
  );
}
