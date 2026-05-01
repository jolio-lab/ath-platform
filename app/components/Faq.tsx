"use client";

import { useState } from "react";

const FAQ = [
  {
    q: "Do you hold my private key?",
    a: "Never. You connect with your own wallet, and we ask you to authorize a sub-key (an HL agent) that can only place trades — it cannot withdraw, transfer, or change account settings. Your master key never leaves your wallet.",
  },
  {
    q: "How do you make money?",
    a: "We attach a tiny builder fee to each trade we place on your behalf — 0.05% of notional, paid into our address by Hyperliquid at fill time. That's it. No subscription, no performance fee, no spread games.",
  },
  {
    q: "Can I revoke at any time?",
    a: "Yes. One click in the Hyperliquid UI revokes the agent. The fleet can no longer trade on your account. Your funds were never touched in the first place.",
  },
  {
    q: "What's the minimum to start?",
    a: "$10 USDC is the Hyperliquid minimum order size. We recommend at least $200–$500 to give the captains room to size positions sensibly.",
  },
  {
    q: "Who runs the captains?",
    a: "An AI trading agent built and operated by the founder. Polaris, Vega, Sirius, Atlas, Altair, and Lyra each run a distinct strategy on a distinct market — and have been trading the founder's own account live for months.",
  },
  {
    q: "What happens if the server gets hacked?",
    a: "Worst case: the agent could be used to place bad trades on your account. The agent cannot withdraw funds — that's a Hyperliquid protocol guarantee. You revoke, and the damage stops at whatever positions were opened. Your master key and wallet are unaffected.",
  },
  {
    q: "Where can I see the track record?",
    a: "The founder's account is public on Hyperliquid. The Sunny prototype dashboard at thousand-sunny-five.vercel.app shows every trade in real time.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)] text-center">
        Questions
      </div>
      <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-center">
        Things you might wonder
      </h2>

      <div className="mt-10 space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[color:var(--surface-2)] transition"
              >
                <span className="font-medium text-sm">{item.q}</span>
                <span
                  className="text-[color:var(--meteor)] text-lg transition-transform"
                  style={{
                    transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-[color:var(--meteor)] leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
