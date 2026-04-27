import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, mainnet } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "ATH",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "ath-test",
  chains: [arbitrum, mainnet],
  ssr: true,
});
