import { create } from "zustand";
import type { ClockStatus, WorkSession } from "@/lib/api";

type ClockState = {
  status: ClockStatus | null;
  history: WorkSession[];
  isLoadingStatus: boolean;
  isClocking: boolean;
  error: string | null;

  // Acciones
  setStatus: (status: ClockStatus) => void;
  setHistory: (history: WorkSession[]) => void;
  setLoadingStatus: (loading: boolean) => void;
  setClocking: (clocking: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
};

export const useClockStore = create<ClockState>((set) => ({
  status: null,
  history: [],
  isLoadingStatus: false,
  isClocking: false,
  error: null,

  setStatus: (status) => set({ status, error: null }),
  setHistory: (history) => set({ history }),
  setLoadingStatus: (isLoadingStatus) => set({ isLoadingStatus }),
  setClocking: (isClocking) => set({ isClocking }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
