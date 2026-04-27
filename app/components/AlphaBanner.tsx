export function AlphaBanner() {
  return (
    <div className="rounded-xl border border-[color:var(--polaris)]/40 bg-[color:var(--polaris)]/10 px-4 py-3 text-xs text-[color:var(--meteor)] leading-relaxed">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--polaris)]/20 font-mono text-[10px] font-bold uppercase text-[color:var(--polaris)]">
          α
        </span>
        <div>
          <span className="text-[color:var(--starlight)] font-bold">
            Private alpha.
          </span>{" "}
          Your account is approved but not yet traded automatically. The
          captains shown below are running on the founder&apos;s account
          (Sunny) — you&apos;re seeing a live sample-of-one. Multi-account
          execution ships next; you&apos;ll be among the first wallets the
          fleet trades for.
        </div>
      </div>
    </div>
  );
}
