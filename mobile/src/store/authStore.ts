import { create } from "zustand";
import { clearAll, getToken, saveToken, saveMode, getMode } from "@/lib/auth";
import { getMe, type UserProfile } from "@/lib/api";

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  mode: "employee" | "manager" | "kiosk" | null;
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
        const user = mode !== "kiosk" ? await getMe(token) : null;
        set({ token, user, mode: mode as AuthState["mode"], isLoading: false });
      } catch {
        await clearAll();
        set({ token: null, user: null, mode: null, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  loginEmployee: async (token: string) => {
    const user = await getMe(token);
    // Detectar rol: MANAGER, OWNER o SUPERVISOR → interfaz de manager
    const isManager =
      user.role === "MANAGER" ||
      user.role === "OWNER" ||
      user.role === "SUPERVISOR" ||
      user.role === "SUPERADMIN";
    const mode: AuthState["mode"] = isManager ? "manager" : "employee";
    await saveToken(token);
    await saveMode(mode);
    set({ token, user, mode });
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
