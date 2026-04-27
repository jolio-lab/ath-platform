export type RiskProfile = "conservative" | "balanced" | "aggressive";

export const RISK_PROFILES: Record<RiskProfile, {
  label: string;
  description: string;
  leverageMin: number;
  leverageMax: number;
  default: number;
  color: string;
}> = {
  conservative: {
    label: "Conservative",
    description: "Lower exposure. Slower compounding, smaller drawdowns.",
    leverageMin: 1,
    leverageMax: 3,
    default: 2,
    color: "var(--polaris)",
  },
  balanced: {
    label: "Balanced",
    description: "Match the captain's intended sizing. Default for most users.",
    leverageMin: 3,
    leverageMax: 10,
    default: 5,
    color: "var(--vega)",
  },
  aggressive: {
    label: "Aggressive",
    description: "Amplify the captain's signals. Higher reward, larger drawdowns.",
    leverageMin: 10,
    leverageMax: 20,
    default: 15,
    color: "var(--sirius)",
  },
};
