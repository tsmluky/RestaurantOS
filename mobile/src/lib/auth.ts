import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "restaurantos_token";
const MODE_KEY = "restaurantos_mode";
const KIOSK_BRANCH_KEY = "restaurantos_kiosk_branch";

// On web, SecureStore is unavailable — fall back to localStorage.
const store = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ── Token ────────────────────────────────────────────────────────────────────

export async function saveToken(token: string): Promise<void> {
  await store.set(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return store.get(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await store.del(TOKEN_KEY);
}

// ── Mode (employee / kiosk) ──────────────────────────────────────────────────

export async function saveMode(mode: "employee" | "kiosk"): Promise<void> {
  await store.set(MODE_KEY, mode);
}

export async function getMode(): Promise<"employee" | "kiosk" | null> {
  const val = await store.get(MODE_KEY);
  if (val === "employee" || val === "kiosk") return val;
  return null;
}

// ── Kiosk branch ─────────────────────────────────────────────────────────────

export type KioskBranch = { id: string; name: string };

export async function saveKioskBranch(branch: KioskBranch): Promise<void> {
  await store.set(KIOSK_BRANCH_KEY, JSON.stringify(branch));
}

export async function getKioskBranch(): Promise<KioskBranch | null> {
  const raw = await store.get(KIOSK_BRANCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as KioskBranch;
  } catch {
    return null;
  }
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    store.del(TOKEN_KEY),
    store.del(MODE_KEY),
    store.del(KIOSK_BRANCH_KEY),
  ]);
}
