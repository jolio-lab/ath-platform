import { Playbook } from "@/app/components/Playbook";
import { ChopperBiasPanel } from "@/app/components/ChopperBias";
import { CrewFeed } from "@/app/components/CrewFeed";

export const metadata = {
  title: "Fleet · ATH",
  description:
    "Read-only intel — Captain's plan, market bias, crew activity from the founder's account.",
};

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
