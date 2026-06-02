import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "restaurantos.access_token";
const REFRESH_TOKEN_KEY = "restaurantos.refresh_token";
const MODE_KEY = "restaurantos.mode";

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

export async function saveMode(mode: "employee" | "kiosk"): Promise<void> {
  await SecureStore.setItemAsync(MODE_KEY, mode);
}

export async function getMode(): Promise<"employee" | "kiosk" | null> {
  const value = await SecureStore.getItemAsync(MODE_KEY);
  if (value === "employee" || value === "kiosk") return value;
  return null;
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(MODE_KEY),
  ]);
}
