import Link from "next/link";

export const metadata = {
  title: "How it works · ATH",
  description:
    "Step-by-step guide to joining the ATH fleet — wallet setup, Arbitrum gas, Hyperliquid deposit, and the one Hyperliquid setting most people miss.",
};

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 flex-1 flex flex-col gap-10">
      <header>
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
          How it works
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight">
          From zero to autopilot
        </h1>
        <p className="mt-3 text-[color:var(--meteor)] leading-relaxed">
          ATH ทำงานบน Hyperliquid. ถ้าโจ้ใช้ HL อยู่แล้ว ข้ามไปดูหัวข้อ{" "}
          <a
            href="#join"
            className="text-[color:var(--starlight)] underline decoration-dotted"
          >
            Join the fleet
          </a>{" "}
          ได้เลย. ถ้ายังใหม่ — เริ่มจากด้านบน
        </p>
      </header>

      <Step
        n={1}
        title="What you need"
        anchor="prerequisites"
      >
        <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed">
          <li>
            <b>Wallet</b> ที่รองรับ EVM — MetaMask, Rabby, Coinbase Wallet
            หรืออื่นๆ
          </li>
          <li>
            <b>USDC ที่ Arbitrum</b> — เงินที่จะใช้เทรด (เริ่มต้นอย่างน้อย
            $50-100 แนะนำ)
          </li>
          <li>
            <b>ETH gas ที่ Arbitrum</b> — สำหรับจ่าย gas ตอน deposit เข้า HL
            (~$2-5 พอ)
          </li>
        </ul>
        <Tip>
          ETH gas บน Arbitrum ถูกมาก ($2-5 พอใช้ได้นาน) — แต่ห้ามลืม. ถ้ามี
          USDC แต่ไม่มี ETH = ฝากเข้า HL ไม่ได้
        </Tip>
      </Step>

      <Step n={2} title="Bridge USDC + ETH gas เข้า Arbitrum" anchor="bridge">
        <p className="text-sm leading-relaxed">
          ถ้ายังไม่มี USDC/ETH ที่ Arbitrum ให้ bridge มาก่อน. ทางเลือก:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed mt-2">
          <li>
            <b>CEX (ง่ายสุด):</b> Binance / OKX / Bybit — withdraw USDC +
            ETH ผ่าน Arbitrum network ตรงเข้า wallet
          </li>
          <li>
            <b>Bridge native:</b>{" "}
            <a
              href="https://bridge.arbitrum.io/"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--starlight)] underline decoration-dotted"
            >
              bridge.arbitrum.io
            </a>{" "}
            จาก Ethereum mainnet (ใช้เวลา ~15 นาที)
          </li>
          <li>
            <b>Cross-chain:</b> Across, Stargate, deBridge — ถ้ามี USDC ที่
            chain อื่น
          </li>
        </ul>
      </Step>

      <Step n={3} title="ฝาก USDC เข้า Hyperliquid" anchor="deposit">
        <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
          <li>
            ไปที่{" "}
            <a
              href="https://app.hyperliquid.xyz/trade"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--starlight)] underline decoration-dotted"
            >
              app.hyperliquid.xyz
            </a>{" "}
            → กด <b>Connect</b> → เลือก wallet → sign
          </li>
          <li>
            กดเมนู <b>Deposit</b> (มุมขวาบน) → เลือกจำนวน USDC → confirm 2
            transactions (approve + deposit)
          </li>
          <li>
            รอ ~30 วินาที balance จะขึ้นในบัญชี Hyperliquid
          </li>
        </ol>
      </Step>

      <Step
        n={4}
        title="ปิด Unified Account Mode"
        anchor="unified-mode"
        critical
      >
        <p className="text-sm leading-relaxed">
          <b className="text-[color:var(--solar-gold)]">
            ขั้นตอนสำคัญที่คนส่วนใหญ่พลาด.
          </b>{" "}
          Hyperliquid default เปิด Unified Account Mode ไว้ — เงินที่ฝากเข้าไป
          จะอยู่ใน <b>Spot</b> account, ไม่ใช่ <b>Perpetual</b> account.
        </p>
        <p className="text-sm leading-relaxed mt-2">
          ATH เทรด <b>Perpetuals</b> (ฟิวเจอร์) — ถ้า Unified Mode เปิดอยู่:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed mt-2 text-[color:var(--meteor)]">
          <li>เงินอยู่ใน Spot → captain เปิด position ไม่ได้</li>
          <li>หรือ position เปิดได้แต่ leverage ผิด</li>
        </ul>

        <div className="mt-4 rounded-xl border border-[color:var(--solar-gold)]/40 bg-[color:var(--solar-gold)]/10 px-4 py-3 text-sm">
          <div className="font-bold text-[color:var(--solar-gold)] mb-1.5">
            วิธีปิด:
          </div>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>HL → กด avatar/icon มุมขวาบน → <b>More</b></li>
            <li>
              หา <b>Disable Unified Account Mode</b> → toggle ON
            </li>
            <li>
              Confirm — เงินจะแยกเป็น <b>Spot</b> + <b>Perpetuals</b> account
            </li>
            <li>
              กดเมนู <b>Transfer</b> → ย้าย USDC จาก Spot → Perpetuals (ทั้งหมด
              หรือบางส่วน)
            </li>
          </ol>
        </div>
      </Step>

      <Step n={5} title="Join the fleet" anchor="join">
        <p className="text-sm leading-relaxed">
          ตอนนี้พร้อมเชื่อม ATH แล้ว. กระบวนการมี 4 signature ใน wallet:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm leading-relaxed mt-2">
          <li>
            <b>Connect wallet</b> — sign-in ครั้งเดียว (ไม่ใช้ gas)
          </li>
          <li>
            <b>Approve fleet builder</b> — sign ให้ ATH คิด fee 0.05%/trade
            (ไม่ใช้ gas)
          </li>
          <li>
            <b>Authorize agent</b> — sign generate ให้ ATH สิทธิ์เปิด/ปิด trade
            <span className="text-[color:var(--meteor)]"> (เปิด/ปิด เท่านั้น
            — withdraw ไม่ได้)</span>
          </li>
          <li>
            <b>Set risk profile + leverage</b> — เลือก Conservative / Balanced
            / Aggressive
          </li>
        </ol>
        <div className="mt-5">
          <Link
            href="/join"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--starlight)] text-[color:var(--void)] px-5 py-2.5 text-sm font-bold hover:opacity-90 transition"
          >
            Start joining →
          </Link>
        </div>
      </Step>

      <Step n={6} title="Risk profiles อธิบาย" anchor="risk">
        <div className="grid sm:grid-cols-3 gap-3">
          <RiskCard
            label="Conservative"
            range="1x – 3x"
            tone="var(--cyan-nebula)"
            body="ความเสี่ยงต่ำ. trade ขนาดเล็ก. drawdown ตื้น. เหมาะคนเริ่มต้น"
          />
          <RiskCard
            label="Balanced"
            range="3x – 10x"
            tone="var(--polaris)"
            body="ตรงกับ leverage ที่ captain ตั้งใจใช้. default สำหรับคนทั่วไป"
          />
          <RiskCard
            label="Aggressive"
            range="10x – 20x"
            tone="var(--andromeda)"
            body="ขยาย signal. compound เร็ว. drawdown ลึก. เฉพาะคนที่รับได้"
          />
        </div>
        <p className="text-xs text-[color:var(--meteor)] mt-3 leading-relaxed">
          เปลี่ยนได้ทีหลังที่ <Link href="/dashboard" className="underline decoration-dotted">/dashboard</Link>.
          Captain เปิด trade เดียวกันทุก profile — ต่างแค่ size + leverage
          ของ user
        </p>
      </Step>

      <Step n={7} title="หลัง join — เกิดอะไรขึ้น" anchor="post-join">
        <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed">
          <li>
            ATH รัน 24/7 — เมื่อ Sunny captain เปิด position, executor mirror
            ใส่บัญชีโจ้ภายในไม่กี่วินาที
          </li>
          <li>
            Position แสดงที่ <Link href="/dashboard" className="underline decoration-dotted">/dashboard</Link>{" "}
            + บน HL UI ของโจ้เอง
          </li>
          <li>
            กด <b>Pause fleet</b> ใน dashboard เพื่อหยุด captain ไม่ให้เปิด
            trade ใหม่ (position ที่เปิดแล้วยังอยู่)
          </li>
          <li>
            <b>Disconnect</b> ใน nav จะลบ session — แต่ agent ยัง active บน HL
            (ดูหัวข้อ <a href="#revoke" className="underline decoration-dotted">Revoke</a>)
          </li>
        </ul>
      </Step>

      <Step n={8} title="Fees + ค่าธรรมเนียม" anchor="fees">
        <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed">
          <li>
            <b>ATH fee:</b> 0.05% ต่อ trade (builder fee — Hyperliquid หักให้
            อัตโนมัติเข้า ATH)
          </li>
          <li>
            <b>HL trading fee:</b> ปกติ HL คิดอยู่แล้ว ~0.025% maker / 0.05%
            taker — ATH ไม่เกี่ยวกับเงินส่วนนี้
          </li>
          <li>
            <b>ไม่มี subscription:</b> จ่ายเฉพาะตอนเทรดจริง. ถ้า fleet
            ไม่เปิด trade = ไม่จ่าย
          </li>
        </ul>
      </Step>

      <Step n={9} title="ความปลอดภัย + Revoke" anchor="revoke">
        <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
          <li>
            ATH agent <b>ไม่มีสิทธิ์ withdraw</b> — Hyperliquid extra agent
            ทำได้แค่เปิด/ปิด trade เท่านั้น. เงินยังอยู่ใน wallet โจ้ตลอด
          </li>
          <li>
            <b>Revoke agent ทันที:</b> HL → API/Agent settings → กด revoke
            เห็น agent ที่ชื่อ <code className="text-xs px-1 py-0.5 rounded bg-[color:var(--surface-2)] font-mono">ATH Fleet ...</code>
          </li>
          <li>
            <b>Withdraw USDC:</b> HL → Withdraw → ส่งกลับ wallet ของโจ้ (ATH
            ไม่เกี่ยวข้อง)
          </li>
        </ul>
      </Step>

      <section
        id="faq"
        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
      >
        <div className="text-xs font-mono uppercase tracking-widest text-[color:var(--meteor)]">
          FAQ
        </div>
        <h2 className="mt-1 text-xl font-bold tracking-tight mb-4">
          คำถามที่เจอบ่อย
        </h2>
        <div className="space-y-3">
          <Faq q="ATH ขโมยเงินได้มั้ย?">
            ไม่ได้. HL extra agent มีสิทธิ์เฉพาะเปิด/ปิด position. withdraw หรือ
            transfer ทำไม่ได้ — protocol level
          </Faq>
          <Faq q="ทำไม fleet ไม่เปิด trade วันนี้?">
            captain เลือกตามตลาด. ถ้าไม่มี setup ที่ confidence สูงพอ จะรอ
            ดู /fleet (Captain&apos;s Plan) เพื่อเช็คว่า captain กำลังคิดอะไร
          </Faq>
          <Faq q="ฉันมี position ของตัวเองอยู่แล้ว ATH กระทบมั้ย?">
            ไม่กระทบ. ATH agent เปิด/ปิด เฉพาะ position ที่ ATH เปิดเอง — ของ
            user เปิดมือเองไม่แตะ. แต่ leverage cap ของ HL ใช้ทั้ง wallet —
            ระวัง over-leverage รวมๆ
          </Faq>
          <Faq q="เปลี่ยน risk profile ทีหลังได้มั้ย?">
            ได้. ที่ /dashboard มีตัวเลือก. Position เปิดอยู่ไม่กระทบ — มีผลกับ
            trade ใหม่
          </Faq>
          <Faq q="ATH รัน server ที่ไหน?">
            ตอนนี้ Mac mini ของ founder (private alpha). อนาคตย้าย cloud
            พร้อม redundancy
          </Faq>
          <Faq q="ถ้า ATH server ดับ?">
            Position ที่เปิดอยู่ยังมี SL/TP บน Hyperliquid (on-chain trigger
            orders) — trigger เองได้. ATH แค่หยุด mirror trade ใหม่
          </Faq>
          <Faq q="HL deposit fail — Spot vs Perp งง?">
            เกือบแน่ว่าลืม Disable Unified Account Mode. ดูหัวข้อ{" "}
            <a href="#unified-mode" className="text-[color:var(--starlight)] underline decoration-dotted">step 4</a>
          </Faq>
          <Faq q="ติดต่อ founder ได้ที่ไหน?">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--starlight)] underline decoration-dotted"
            >
              X / Twitter
            </a>{" "}
            หรือ Telegram (กำลังเปิด channel — TBD)
          </Faq>
        </div>
      </section>

      <div className="text-center text-xs text-[color:var(--meteor)] pt-4 pb-8">
        ยังสับสน? ลองอ่านอีกรอบหรือเริ่มที่{" "}
        <Link
          href="/join"
          className="text-[color:var(--starlight)] underline decoration-dotted"
        >
          /join
        </Link>{" "}
        — ขั้นตอนใน wizard จะ guide ทุก step
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  anchor,
  critical,
  children,
}: {
  n: number;
  title: string;
  anchor: string;
  critical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={anchor}
      className="rounded-2xl border bg-[color:var(--surface)] p-6"
      style={{
        borderColor: critical
          ? "color-mix(in srgb, var(--solar-gold) 40%, var(--border))"
          : "var(--border)",
      }}
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span
          className="font-mono text-xs font-bold rounded-full inline-flex items-center justify-center h-6 w-6 shrink-0"
          style={{
            backgroundColor: critical
              ? "var(--solar-gold)"
              : "var(--surface-2)",
            color: critical ? "var(--void)" : "var(--meteor)",
          }}
        >
          {n}
        </span>
        <h2 className="text-lg font-bold tracking-tight">
          {title}
          {critical && (
            <span className="ml-2 text-[10px] font-mono uppercase tracking-widest text-[color:var(--solar-gold)]">
              ★ ห้ามข้าม
            </span>
          )}
        </h2>
      </div>
      <div className="text-[color:var(--meteor)]">{children}</div>
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 text-xs text-[color:var(--meteor)] border-l-2 border-[color:var(--polaris)] pl-3 py-1">
      💡 {children}
    </div>
  );
}

function RiskCard({
  label,
  range,
  tone,
  body,
}: {
  label: string;
  range: string;
  tone: string;
  body: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 bg-[color:var(--surface-2)]"
      style={{ borderColor: `color-mix(in srgb, ${tone} 30%, var(--border))` }}
    >
      <div
        className="text-[10px] font-mono uppercase tracking-widest"
        style={{ color: tone }}
      >
        {label}
      </div>
      <div className="text-base font-bold mt-1">{range}</div>
      <p className="mt-2 text-xs text-[color:var(--meteor)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function Faq({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3">
      <summary className="text-sm font-bold cursor-pointer list-none flex items-center justify-between gap-3">
        <span>{q}</span>
        <span className="text-[color:var(--meteor)] text-xs group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div className="mt-2 text-sm text-[color:var(--meteor)] leading-relaxed">
        {children}
      </div>
    </details>
  );
}
