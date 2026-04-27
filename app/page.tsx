import Link from "next/link";
import { CaptainCard, FLEET } from "./components/CaptainCard";
import { LiveStats } from "./components/LiveStats";
import { Faq } from "./components/Faq";

export default function Home() {
  return (
    <div className="flex-1">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 starfield opacity-60" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/60 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[color:var(--meteor)] mb-6">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--green-giant)] orbit-pulse" />
            Live on Hyperliquid
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            ATH
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-[color:var(--meteor)] font-light">
            Trade by the stars
          </p>
          <p className="mt-6 mx-auto max-w-xl text-sm sm:text-base text-[color:var(--meteor)] leading-relaxed">
            Your AI fleet runs the Hyperliquid markets 24/7. Real captains,
            real fills, real builder fees back to you via referral.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/join"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-6 py-3 text-sm font-bold hover:opacity-90 transition"
            >
              Join the fleet
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#fleet"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-6 py-3 text-sm hover:border-[color:var(--meteor)] transition"
            >
              See the captains
            </a>
          </div>
        </div>
      </section>

      {/* LIVE STATS */}
      <LiveStats />

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)] text-center">
          How it works
        </div>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-center">
          Three steps to the cosmos
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Step
            n={1}
            title="Connect your wallet"
            body="Sign in with the wallet that holds your Hyperliquid USDC. We never touch your private key."
          />
          <Step
            n={2}
            title="Approve the fleet"
            body="One signature gives our captains permission to trade on your account. They cannot withdraw or transfer your funds."
          />
          <Step
            n={3}
            title="Set your leverage"
            body="Pick your risk profile. The fleet trades 24/7 — you watch the chart fill itself."
          />
        </div>
      </section>

      {/* THE FLEET */}
      <section id="fleet" className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)] text-center">
          The fleet
        </div>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-center">
          Four captains, one cosmos
        </h2>
        <p className="mt-3 mx-auto max-w-2xl text-sm text-[color:var(--meteor)] text-center">
          Each captain runs a distinct strategy on their assigned market.
          Together they cover the spectrum — steady, fast, aggressive,
          contrarian.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FLEET.map((c) => (
            <CaptainCard key={c.key} captain={c} />
          ))}
        </div>
      </section>

      {/* WHY ATH */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)] text-center">
          Why ATH
        </div>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-center">
          You keep custody. We do the work.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Bullet title="Non-custodial" body="Your funds stay in your Hyperliquid account. Always." />
          <Bullet title="No subscription" body="Free to use. We earn a tiny builder fee on each trade — aligned incentives." />
          <Bullet title="Revoke anytime" body="One click in Hyperliquid revokes our agent. Done." />
          <Bullet title="Real track record" body="Live captains have traded the founder's account for months. Public history." />
        </div>
      </section>

      {/* FAQ */}
      <Faq />

      {/* CTA */}
      <section className="relative mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="absolute inset-0 starfield opacity-30" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to set sail?
          </h2>
          <p className="mt-3 text-[color:var(--meteor)]">
            The cosmos is waiting.
          </p>
          <Link
            href="/join"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-7 py-3 text-sm font-bold hover:opacity-90 transition"
          >
            Join the fleet
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[color:var(--border)] mt-10">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[color:var(--meteor)]">
          <div className="font-mono">ATH · Cosmic Fleet · Hyperliquid</div>
          <div className="flex items-center gap-5">
            <Link href="/lab" className="hover:text-[color:var(--starlight)]">
              Verification lab
            </Link>
            <a
              href="https://github.com/jolio-lab/ath-platform"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--starlight)]"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="font-mono text-xs text-[color:var(--meteor)] tracking-widest">
        STEP {n.toString().padStart(2, "0")}
      </div>
      <h3 className="mt-2 font-bold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--meteor)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="font-bold text-sm">{title}</div>
      <p className="mt-1 text-xs text-[color:var(--meteor)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}
