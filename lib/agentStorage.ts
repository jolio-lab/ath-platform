// Browser-only ephemeral agent storage. Lives in sessionStorage so it survives
// page navigation within the same tab, but is wiped on tab close.
//
// This is the MVP storage. Production will move to encrypted server-side storage
// (AES-GCM + macOS Keychain master) once the trade loop runs server-side.

const KEY = "ath:agent";

export type AgentRecord = {
  privateKey: `0x${string}`;
  address: `0x${string}`;
  name: string;
  approvedAt: number;
  forUser: `0x${string}`;
};

export function saveAgent(rec: AgentRecord) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(rec));
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

export function clearAgent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
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
