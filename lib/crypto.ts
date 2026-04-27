import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM helper for agent private keys.
//
// Storage format: "iv_b64.ciphertext_b64.tag_b64"
//   - iv:        12 random bytes (96 bits — GCM standard)
//   - ciphertext: variable
//   - tag:       16 bytes (128-bit GCM auth tag)
//
// The master key (ATH_AGENT_KEY_SECRET) is base64-encoded 32 bytes (256 bits).
// Both ath-platform (Vercel) and the Python runner (Mac mini) read the same
// value: ath-platform encrypts on register; the runner decrypts before signing
// orders. If the key drifts between sides, decryption fails closed.

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function masterKey(): Buffer {
  const raw = process.env.ATH_AGENT_KEY_SECRET;
  if (!raw) {
    throw new Error("ATH_AGENT_KEY_SECRET is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ATH_AGENT_KEY_SECRET must decode to 32 bytes (got ${key.length}). Regenerate with: openssl rand -base64 32`,
    );
  }
  return key;
}

export function encryptAgentKey(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${ct.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptAgentKey(encoded: string): string {
  const parts = encoded.split(".");
  if (parts.length !== 3) {
    throw new Error("encrypted agent key has wrong shape");
  }
  const [ivB64, ctB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGO, masterKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
