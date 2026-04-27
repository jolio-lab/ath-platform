"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  approveAgent,
  approveBuilderFee,
  fetchAgentApprovals,
  fetchBuilderApprovals,
  fetchUserState,
} from "@/lib/hl";
import { MAX_BUILDER_FEE, SUNNY_BUILDER_ADDRESS } from "@/lib/constants";
import {
  loadAgent,
  loadSettings,
  saveAgent,
  saveSettings,
} from "@/lib/agentStorage";
import { RISK_PROFILES, type RiskProfile } from "@/lib/leverage";

type Status = "idle" | "loading" | "success" | "error";

const STEPS = [
  "Connect",
  "Approve fleet",
  "Authorize agent",
  "Set risk",
  "Done",
] as const;

export default function JoinPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [step, setStep] = useState(0);
  const [accountValue, setAccountValue] = useState<string | null>(null);

  // Step 1: builder
  const [builderStatus, setBuilderStatus] = useState<Status>("idle");
  const [builderError, setBuilderError] = useState<string | null>(null);

  // Step 2: agent
  const [agentStatus, setAgentStatus] = useState<Status>("idle");
  const [agentAddress, setAgentAddress] = useState<`0x${string}` | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Step 3: risk
  const [risk, setRisk] = useState<RiskProfile>("balanced");
  const [leverage, setLeverage] = useState(RISK_PROFILES.balanced.default);

  useEffect(() => {
    if (!isConnected && step !== 0) setStep(0);
  }, [isConnected, step]);

  // On wallet connect, skip ahead past steps the user has already completed.
  // This is what makes a refresh resume where they left off instead of
  // restarting at "Approve fleet".
  useEffect(() => {
    if (!isConnected || !address) return;
    let cancelled = false;
    (async () => {
      try {
        const [state, builders, agents] = await Promise.all([
          fetchUserState(address),
          fetchBuilderApprovals(address),
          fetchAgentApprovals(address),
        ]);
        if (cancelled) return;

        const v = state?.marginSummary?.accountValue;
        if (v) setAccountValue(v);

        const builderApproved = Array.isArray(builders)
          ? builders.some(
              (b: { builder?: string }) =>
                b?.builder?.toLowerCase() ===
                SUNNY_BUILDER_ADDRESS.toLowerCase(),
            )
          : false;
        if (builderApproved) setBuilderStatus("success");

        const local = loadAgent();
        const agentForThisUser =
          local && local.forUser.toLowerCase() === address.toLowerCase()
            ? local
            : null;
        const agentOnChain =
          agentForThisUser &&
          Array.isArray(agents) &&
          agents.some(
            (a: { address?: string }) =>
              a?.address?.toLowerCase() ===
              agentForThisUser.address.toLowerCase(),
          );
        if (agentOnChain && agentForThisUser) {
          setAgentAddress(agentForThisUser.address);
          setAgentStatus("success");
        }

        const savedSettings = loadSettings();

        // Decide where to resume.
        if (agentOnChain && savedSettings) {
          // Fully onboarded — punt to dashboard so refreshes don't re-show
          // the wizard at all.
          router.replace("/dashboard");
          return;
        }
        if (agentOnChain) {
          setStep(3);
          return;
        }
        if (builderApproved) {
          setStep(2);
          return;
        }
        setStep(1);
      } catch {
        // best-effort skip-ahead — fall back to step 1 on error
        setStep((s) => (s === 0 ? 1 : s));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, router]);

  const profile = RISK_PROFILES[risk];

  useEffect(() => {
    setLeverage(profile.default);
  }, [risk, profile.default]);

  async function approveBuilder() {
    if (!walletClient || !address) return;
    setBuilderStatus("loading");
    setBuilderError(null);
    try {
      await approveBuilderFee(
        {
          address,
          signTypedData: walletClient.signTypedData.bind(walletClient),
        },
        MAX_BUILDER_FEE,
      );
      setBuilderStatus("success");
      setStep(2);
    } catch (e) {
      setBuilderStatus("error");
      setBuilderError((e as Error).message);
    }
  }

  async function authorizeAgent() {
    if (!walletClient || !address) return;
    setAgentStatus("loading");
    setAgentError(null);
    try {
      const pk = generatePrivateKey();
      const acct = privateKeyToAccount(pk);
      const name = `ATH Fleet ${Date.now().toString().slice(-6)}`;
      await approveAgent(
        {
          address,
          signTypedData: walletClient.signTypedData.bind(walletClient),
        },
        acct.address,
        name,
      );
      saveAgent({
        privateKey: pk,
        address: acct.address,
        name,
        approvedAt: Date.now(),
        forUser: address,
      });
      setAgentAddress(acct.address);
      setAgentStatus("success");
      setStep(3);
    } catch (e) {
      setAgentStatus("error");
      setAgentError((e as Error).message);
    }
  }

  const [finishStatus, setFinishStatus] = useState<Status>("idle");
  const [finishError, setFinishError] = useState<string | null>(null);

  async function finish() {
    if (!address) return;
    saveSettings({ riskProfile: risk, leverage });
    setFinishStatus("loading");
    setFinishError(null);

    // Pull the agent record we saved at step 2 — we need the priv key to
    // register server-side so the multi-account runner can sign on behalf
    // of the user later.
    const local = loadAgent();
    if (!local || local.forUser.toLowerCase() !== address.toLowerCase()) {
      setFinishStatus("error");
      setFinishError(
        "agent record missing — please re-authorize agent",
      );
      return;
    }

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          agent_address: local.address,
          agent_priv_key: local.privateKey,
          risk_profile: risk,
          leverage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `register failed (${res.status})`);
      }
      setFinishStatus("success");
      setStep(4);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e) {
      setFinishStatus("error");
      setFinishError((e as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 flex-1 flex flex-col gap-6">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
          Onboarding
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Join the fleet
        </h1>
      </div>

      <Stepper current={step} />

      {step === 0 && (
        <Card>
          <h2 className="font-bold text-lg">Connect your wallet</h2>
          <p className="text-sm text-[color:var(--meteor)] mt-2">
            Sign in with the wallet that holds your Hyperliquid USDC. We never
            see your private key — every signature happens in your wallet.
          </p>
          <div className="mt-5">
            <ConnectButton />
          </div>
        </Card>
      )}

      {step >= 1 && (
        <Card>
          <div className="text-xs uppercase tracking-wider text-[color:var(--meteor)]">
            Connected
          </div>
          <div className="font-mono text-sm break-all mt-1">{address}</div>
          {accountValue && (
            <div className="mt-2 text-xs text-[color:var(--meteor)]">
              HL balance:{" "}
              <span className="text-[color:var(--starlight)] font-mono">
                ${parseFloat(accountValue).toFixed(2)}
              </span>
            </div>
          )}
        </Card>
      )}

      {step === 1 && (
        <StepCard
          n={1}
          title="Approve the fleet"
          desc={`Sign once to allow the fleet builder to charge up to ${MAX_BUILDER_FEE} on each trade. This is how we get paid — no subscription, just a tiny per-trade fee.`}
          ctaLabel="Approve fleet"
          status={builderStatus}
          error={builderError}
          onClick={approveBuilder}
        />
      )}

      {step === 2 && (
        <StepCard
          n={2}
          title="Authorize the agent"
          desc="We generate a fresh agent key in your browser and ask you to authorize it. The agent can place trades — it cannot withdraw or transfer your funds."
          ctaLabel="Authorize agent"
          status={agentStatus}
          error={agentError}
          onClick={authorizeAgent}
          extra={
            agentAddress ? (
              <div className="text-xs text-[color:var(--meteor)] font-mono mt-2 break-all">
                Agent: {agentAddress}
              </div>
            ) : null
          }
        />
      )}

      {step === 3 && (
        <Card>
          <div className="font-mono text-xs text-[color:var(--meteor)]">
            STEP 03
          </div>
          <h2 className="font-bold text-lg mt-1">Set your risk</h2>
          <p className="text-sm text-[color:var(--meteor)] mt-2">
            Pick the profile that matches your appetite. The fleet uses your
            leverage to size each trade against the captain&apos;s signal.
          </p>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {(Object.keys(RISK_PROFILES) as RiskProfile[]).map((key) => {
              const p = RISK_PROFILES[key];
              const active = risk === key;
              return (
                <button
                  key={key}
                  onClick={() => setRisk(key)}
                  className="text-left rounded-xl border p-4 transition"
                  style={{
                    borderColor: active ? p.color : "var(--border)",
                    backgroundColor: active
                      ? `color-mix(in srgb, ${p.color} 12%, var(--surface))`
                      : "var(--surface-2)",
                  }}
                >
                  <div
                    className="text-xs uppercase tracking-wider font-mono"
                    style={{ color: active ? p.color : "var(--meteor)" }}
                  >
                    {p.label}
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {p.leverageMin}x – {p.leverageMax}x
                  </div>
                  <p className="text-xs text-[color:var(--meteor)] mt-2 leading-relaxed">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[color:var(--meteor)]">
                Default leverage
              </span>
              <span
                className="text-2xl font-bold font-mono"
                style={{ color: profile.color }}
              >
                {leverage}x
              </span>
            </div>
            <input
              type="range"
              min={profile.leverageMin}
              max={profile.leverageMax}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: profile.color }}
            />
            <div className="flex justify-between text-[10px] text-[color:var(--meteor)] mt-1 font-mono">
              <span>{profile.leverageMin}x</span>
              <span>{profile.leverageMax}x</span>
            </div>
          </div>

          {finishError && (
            <div className="mt-4 text-xs text-[color:var(--red-dwarf)] font-mono break-all">
              ✗ {finishError}
            </div>
          )}

          <button
            onClick={finish}
            disabled={finishStatus === "loading"}
            className="mt-6 w-full rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] py-3 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition"
          >
            {finishStatus === "loading" ? "Registering…" : "Set sail →"}
          </button>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">⭐</div>
            <h2 className="text-xl font-bold">Welcome aboard</h2>
            <p className="mt-2 text-sm text-[color:var(--meteor)]">
              Taking you to your dashboard…
            </p>
          </div>
        </Card>
      )}
    </main>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1 flex-1 rounded-full transition`}
              style={{
                backgroundColor: done || active
                  ? "var(--polaris)"
                  : "var(--border)",
                opacity: done ? 1 : active ? 0.7 : 1,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      {children}
    </section>
  );
}

function StepCard({
  n,
  title,
  desc,
  ctaLabel,
  status,
  error,
  onClick,
  extra,
}: {
  n: number;
  title: string;
  desc: string;
  ctaLabel: string;
  status: Status;
  error: string | null;
  onClick: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="font-mono text-xs text-[color:var(--meteor)]">
        STEP {n.toString().padStart(2, "0")}
      </div>
      <h2 className="font-bold text-lg mt-1">{title}</h2>
      <p className="text-sm text-[color:var(--meteor)] mt-2 leading-relaxed">
        {desc}
      </p>
      {extra}
      {error && (
        <div className="mt-3 text-xs text-[color:var(--red-dwarf)] font-mono break-all">
          ✗ {error}
        </div>
      )}
      <button
        onClick={onClick}
        disabled={status === "loading"}
        className="mt-5 rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-6 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition"
      >
        {status === "loading" ? "Waiting for signature…" : ctaLabel}
      </button>
    </Card>
  );
}
