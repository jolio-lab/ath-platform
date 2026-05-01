import { Constellation } from "./Constellation";

export type CaptainKey =
  | "polaris"
  | "vega"
  | "sirius"
  | "atlas"
  | "altair"
  | "lyra";

export type Captain = {
  key: CaptainKey;
  name: string;
  asset: string;
  color: string;
  tagline: string;
  description: string;
};

export const FLEET: Captain[] = [
  {
    key: "polaris",
    name: "Polaris",
    asset: "ETH",
    color: "var(--polaris)",
    tagline: "The steady navigator",
    description: "Long-horizon trades on the largest perp market. Methodical, patient, never loses bearing.",
  },
  {
    key: "vega",
    name: "Vega",
    asset: "SOL",
    color: "var(--vega)",
    tagline: "The quick reactor",
    description: "Fast-moving SOL plays, decisive entries. Reads momentum like a blue-white star reads gravity.",
  },
  {
    key: "sirius",
    name: "Sirius",
    asset: "kPEPE",
    color: "var(--sirius)",
    tagline: "The aggressive hunter",
    description: "Volatility specialist on memecoin perps. Bright, sharp, brief — high-conviction strikes.",
  },
  {
    key: "atlas",
    name: "Atlas",
    asset: "DOGE",
    color: "var(--atlas)",
    tagline: "The steel anchor",
    description: "Holds position on memecoin majors. Titan-strong against volatility — patient, dependable, never shaken.",
  },
  {
    key: "altair",
    name: "Altair",
    asset: "OP",
    color: "var(--altair)",
    tagline: "The keen eye",
    description: "Precision strikes on layer-2 perps. Eagle vision — picks entries others miss, locks profits before reverse.",
  },
  {
    key: "lyra",
    name: "Lyra",
    asset: "Reversal",
    color: "var(--lyra)",
    tagline: "The mystical contrarian",
    description: "Reads turning points others miss. Plays against the trend when the cosmos shifts.",
  },
];

export function CaptainCard({ captain }: { captain: Captain }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 transition-all hover:border-opacity-60"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: `${captain.color.replace("var(--", "").replace(")", "")}30`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: captain.color }}
      />
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-15 blur-2xl"
        style={{ backgroundColor: captain.color }}
      />

      <div className="flex items-start justify-between mb-4 relative">
        <div>
          <div
            className="text-xs font-mono tracking-widest uppercase mb-1"
            style={{ color: captain.color }}
          >
            {captain.asset}
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{captain.name}</h3>
          <p className="text-xs text-[color:var(--meteor)] mt-1">
            {captain.tagline}
          </p>
        </div>
        <div className="opacity-80">
          <Constellation name={captain.key} color={captain.color} size={70} />
        </div>
      </div>

      <p className="text-sm text-[color:var(--meteor)] leading-relaxed">
        {captain.description}
      </p>
    </div>
  );
}
