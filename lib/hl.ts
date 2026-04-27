import {
  HL_API_URL,
  HL_HYPERLIQUID_CHAIN,
  HL_SIGNATURE_CHAIN_ID,
  SUNNY_BUILDER_ADDRESS,
} from "./constants";

type Hex = `0x${string}`;
type Address = `0x${string}`;

type WalletLike = {
  address: Address;
  signTypedData: (params: {
    domain: { name: string; version: string; chainId: number; verifyingContract: Address };
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<Hex>;
};

const DOMAIN = {
  name: "HyperliquidSignTransaction",
  version: "1",
  chainId: 42161,
  verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
};

function splitSig(sig: Hex) {
  const r = ("0x" + sig.slice(2, 66)) as Hex;
  const s = ("0x" + sig.slice(66, 130)) as Hex;
  const v = parseInt(sig.slice(130, 132), 16);
  return { r, s, v };
}

async function postExchange(body: unknown) {
  const res = await fetch(`${HL_API_URL}/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || (json && json.status === "err")) {
    throw new Error(typeof json === "string" ? json : JSON.stringify(json));
  }
  return json;
}

export async function approveBuilderFee(wallet: WalletLike, maxFeeRate: string) {
  const nonce = Date.now();
  const action = {
    type: "approveBuilderFee" as const,
    signatureChainId: HL_SIGNATURE_CHAIN_ID,
    hyperliquidChain: HL_HYPERLIQUID_CHAIN,
    maxFeeRate,
    builder: SUNNY_BUILDER_ADDRESS,
    nonce,
  };

  const types = {
    "HyperliquidTransaction:ApproveBuilderFee": [
      { name: "hyperliquidChain", type: "string" },
      { name: "maxFeeRate", type: "string" },
      { name: "builder", type: "address" },
      { name: "nonce", type: "uint64" },
    ],
  };

  const sig = await wallet.signTypedData({
    domain: DOMAIN,
    types,
    primaryType: "HyperliquidTransaction:ApproveBuilderFee",
    message: {
      hyperliquidChain: HL_HYPERLIQUID_CHAIN,
      maxFeeRate,
      builder: SUNNY_BUILDER_ADDRESS,
      nonce,
    },
  });

  return postExchange({
    action,
    nonce,
    signature: splitSig(sig),
  });
}

export async function approveAgent(wallet: WalletLike, agentAddress: Address, agentName: string) {
  const nonce = Date.now();
  const action = {
    type: "approveAgent" as const,
    signatureChainId: HL_SIGNATURE_CHAIN_ID,
    hyperliquidChain: HL_HYPERLIQUID_CHAIN,
    agentAddress,
    agentName,
    nonce,
  };

  const types = {
    "HyperliquidTransaction:ApproveAgent": [
      { name: "hyperliquidChain", type: "string" },
      { name: "agentAddress", type: "address" },
      { name: "agentName", type: "string" },
      { name: "nonce", type: "uint64" },
    ],
  };

  const sig = await wallet.signTypedData({
    domain: DOMAIN,
    types,
    primaryType: "HyperliquidTransaction:ApproveAgent",
    message: {
      hyperliquidChain: HL_HYPERLIQUID_CHAIN,
      agentAddress,
      agentName,
      nonce,
    },
  });

  return postExchange({
    action,
    nonce,
    signature: splitSig(sig),
  });
}

// Returns the max builder fee (in tenth-bps, e.g. 50 = 0.05%) the user has
// approved for the given builder address. Returns 0 if no approval. The HL
// endpoint `userBuilderFeeApprovals` does not exist; `maxBuilderFee` is the
// correct query.
export async function fetchMaxBuilderFee(
  user: Address,
  builder: Address,
): Promise<number> {
  const res = await fetch(`${HL_API_URL}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "maxBuilderFee", user, builder }),
  });
  if (!res.ok) return 0;
  const text = await res.text();
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchAgentApprovals(user: Address) {
  const res = await fetch(`${HL_API_URL}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "extraAgents", user }),
  });
  return res.json();
}

export async function fetchUserState(user: Address) {
  const res = await fetch(`${HL_API_URL}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user }),
  });
  return res.json();
}
