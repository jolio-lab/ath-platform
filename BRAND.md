# ATH — Cosmic Fleet

> "Your AI fleet, charting the markets"

## Identity

- **Product name:** ATH
- **Full name:** ATH Trading Fleet
- **Tagline:** "Trade by the stars"
- **Vibe:** Premium · Timeless · Smart-trader · Cosmic
- **NOT:** degen-meme · cute · cyberpunk · corporate-blue

## Color Palette

### Deep Space (backgrounds)

| Token | Hex | Use |
|---|---|---|
| `--void` | `#06101e` | App background |
| `--surface` | `#0c1828` | Card backgrounds |
| `--surface-2` | `#0a1422` | Inset / nested surfaces |
| `--border` | `#1e293b` | Card borders, dividers |

### Starlight (text)

| Token | Hex | Use |
|---|---|---|
| `--starlight` | `#e2e8f0` | Primary text |
| `--meteor` | `#94a3b8` | Secondary text, labels |
| `--dust` | `#475569` | Tertiary text, disabled |

### Signal colors

| Token | Hex | Meaning |
|---|---|---|
| `--green-giant` | `#10b981` | Profit, success |
| `--red-dwarf` | `#f43f5e` | Loss, error |
| `--solar-gold` | `#fbbf24` | Warning, attention |
| `--cyan-nebula` | `#22d3ee` | Info, highlight |
| `--purple-cosmos` | `#a78bfa` | Neutral state, cooldown |

### Captain signatures (each captain has a unique color)

| Captain | Hex | Notes |
|---|---|---|
| Polaris | `#93c5fd` | Cool blue-white (steady) |
| Vega | `#c4b5fd` | Soft violet (decisive) |
| Sirius | `#818cf8` | Sharp blue-violet (aggressive) |
| Lyra | `#fcd34d` | Soft amber (contrarian/mystical) |

## Typography

- **Headings & body:** Geist Sans (already in Next.js default)
- **Numbers & code:** Geist Mono
- **Hierarchy:**
  - H1: 2xl-3xl, bold, tight tracking
  - H2: xl, bold
  - Body: base, regular
  - Numbers: mono, tabular

Avoid serif fonts. Avoid all-caps body text. Use UPPERCASE only for tiny labels (`text-[10px] uppercase tracking-wider`).

## The Fleet

### Captains (rebrand from One Piece)

| Codename | Asset | Star reference | Personality | Color |
|---|---|---|---|---|
| **Polaris** | ETH | The North Star — the steady navigator never loses bearing | Reliable, methodical, long-horizon trades | `#93c5fd` |
| **Vega** | SOL | 5th brightest star, blue-white, fast-spinning | Quick reactor, short timeframes, decisive | `#c4b5fd` |
| **Sirius** | kPEPE | Brightest star in night sky, blue-hot, volatile | Aggressive hunter, high volatility specialist | `#818cf8` |
| **Lyra** | Reversal swing | The harp constellation — mystical, contrarian | Reads turning points, plays against the trend | `#fcd34d` |

### Reserved (future captains)

| Codename | Use case |
|---|---|
| **Andromeda** | Hyperliquid Predictions captain (replaces Going Merry) |
| **Cassiopeia** | When new asset added |
| **Orion** | Reserved |
| **Cygnus** | Reserved |
| **Draco** | Reserved |

## Visual motifs

- **Subtle starfield** background (very low opacity dots, varies by section)
- **Constellation lines** can connect captain cards (decorative, on hover)
- **Each captain card** has a small "constellation diagram" as identity signature (4-6 dots + lines, unique per captain)
- **Loading states** = subtle orbital/rotation animations
- **Card glow** — each captain card has 1px top border in their signature color + subtle glow on hover
- **Hero section** — wide gradient `--void` → `--surface`, faint star particles

## Voice & tone

### DO

- Confident, precise
- Slightly poetic in headlines ("Charting the markets") 
- Data-dense in tables (no fluff)
- Numbers always in mono font, always with $ or % unit

### DON'T

- "moon", "rocket", "wagmi", "ngmi", "wen"
- "trustless", "decentralized" (overused)
- emojis in body copy (sparse use OK in status icons)
- ALL CAPS shouting

## Sample copy

### Hero
> ATH — Trade by the stars
> 
> Your AI fleet runs the markets 24/7. Real captains, real fills, on Hyperliquid.

### CTA
- Primary: "Join the fleet"
- Secondary: "See the captains" / "View track record"

### Empty states
- "Awaiting signal" (not "no data")
- "Captain on standby" (not "offline")
- "The cosmos is quiet" (loading)

## Logo

- **Wordmark only** for v1: "ATH" in Geist Bold, slightly tightened tracking
- **Optional mark:** 4-pointed Polaris star can replace the bar in "A" (subtle treatment)
- **Favicon:** 4-pointed star on `--void` background

## What this brand is NOT

- ❌ Pirate / nautical (was Sunny — copyright)
- ❌ Cyberpunk / glitchy (was option B)
- ❌ Cutesy / emoji-heavy
- ❌ Corporate blue / saas-y
- ❌ Bloomberg-clone / brutalist
