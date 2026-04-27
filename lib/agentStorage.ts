// Browser-only ephemeral agent storage. Lives in sessionStorage so it survives
// page navigation within the same tab, but is wiped on tab close.
//
// This is the MVP storage. Production will move to encrypted server-side storage
// (AES-GCM + macOS Keychain master) once the trade loop runs server-side.

// Two-tier storage:
//   - sessionStorage holds the full AgentRecord (incl. priv key) only as long
//     as it's needed to register the user server-side. We wipe it the moment
//     POST /api/users/register succeeds — after that the priv key lives only
//     in Supabase, AES-GCM encrypted.
//   - localStorage holds AgentMeta (address, name, approvedAt, forUser) so the
//     UI can keep recognising a returning visitor as "joined" without keeping
//     their priv key around in the browser.
const KEY = "ath:agent";
const META_KEY = "ath:agent_meta";

export type AgentRecord = {
  privateKey: `0x${string}`;
  address: `0x${string}`;
  name: string;
  approvedAt: number;
  forUser: `0x${string}`;
};

export type AgentMeta = Omit<AgentRecord, "privateKey">;

export function saveAgent(rec: AgentRecord) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(rec));
  const meta: AgentMeta = {
    address: rec.address,
    name: rec.name,
    approvedAt: rec.approvedAt,
    forUser: rec.forUser,
  };
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function loadAgent(): AgentRecord | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentRecord;
  } catch {
    return null;
  }
}

export function loadAgentMeta(): AgentMeta | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentMeta;
  } catch {
    return null;
  }
}

// Wipe just the priv key. Meta stays so the UI keeps showing "joined".
// Call this after a successful /api/users/register.
export function clearAgentSecret() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

// Full wipe — used by Disconnect.
export function clearAgent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(META_KEY);
}

const SETTINGS_KEY = "ath:settings";

export type UserSettings = {
  riskProfile: "conservative" | "balanced" | "aggressive";
  leverage: number;
};

export function saveSettings(s: UserSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSettings;
  } catch {
    return null;
  }
}

export function clearSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SETTINGS_KEY);
}

// Pause flag is per-wallet — when paused, the user's fleet should not open new
// positions. The flag lives in localStorage today; the server-side trade loop
// will read it once the multi-account runner is wired up. This NEVER affects
// Sunny (the founder's personal agent on Mac mini) — that runs on its own keys
// and never reads ATH user state.
const PAUSE_KEY_PREFIX = "ath:paused:";

function pauseKey(userAddress: string) {
  return `${PAUSE_KEY_PREFIX}${userAddress.toLowerCase()}`;
}

export function loadPaused(userAddress: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(pauseKey(userAddress)) === "1";
}

export function savePaused(userAddress: string, paused: boolean) {
  if (typeof window === "undefined") return;
  if (paused) {
    localStorage.setItem(pauseKey(userAddress), "1");
  } else {
    localStorage.removeItem(pauseKey(userAddress));
  }
}
