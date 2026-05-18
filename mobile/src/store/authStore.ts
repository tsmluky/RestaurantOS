import { create } from "zustand";
import { clearAll, getToken, saveToken, saveMode, getMode } from "@/lib/auth";
import { getMe, type UserProfile } from "@/lib/api";

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  mode: "employee" | "kiosk" | null;
  isLoading: boolean;

  // Acciones
  initialize: () => Promise<void>;
  loginEmployee: (token: string) => Promise<void>;
  setKioskMode: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  mode: null,
  isLoading: true,

  initialize: async () => {
    const token = await getToken();
    const mode = await getMode();
    if (token && mode) {
      try {
        const user = mode === "employee" ? await getMe(token) : null;
        set({ token, user, mode, isLoading: false });
      } catch {
        await clearAll();
        set({ token: null, user: null, mode: null, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  loginEmployee: async (token: string) => {
    await saveToken(token);
    await saveMode("employee");
    const user = await getMe(token);
    set({ token, user, mode: "employee" });
  },

  setKioskMode: async (token: string) => {
    await saveToken(token);
    await saveMode("kiosk");
    set({ token, mode: "kiosk", user: null });
  },

  logout: async () => {
    await clearAll();
    set({ token: null, user: null, mode: null });
  },
}));
