import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "restaurantos.access_token";
const REFRESH_TOKEN_KEY = "restaurantos.refresh_token";
const MODE_KEY = "restaurantos.mode";
const KIOSK_BRANCH_KEY = "restaurantos.kiosk_branch";

export type AppMode = "employee" | "manager" | "kiosk";

export interface KioskBranch {
  id: string;
  name: string;
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveMode(mode: AppMode): Promise<void> {
  await SecureStore.setItemAsync(MODE_KEY, mode);
}

export async function getMode(): Promise<AppMode | null> {
  const value = await SecureStore.getItemAsync(MODE_KEY);
  if (value === "employee" || value === "manager" || value === "kiosk") return value;
  return null;
}

export async function saveKioskBranch(branch: KioskBranch): Promise<void> {
  await SecureStore.setItemAsync(KIOSK_BRANCH_KEY, JSON.stringify(branch));
}

export async function getKioskBranch(): Promise<KioskBranch | null> {
  const value = await SecureStore.getItemAsync(KIOSK_BRANCH_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as KioskBranch;
    if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") return parsed;
  } catch {
    // valor corrupto — lo ignoramos
  }
  return null;
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(MODE_KEY),
  ]);
}
