import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from '../../../shared/contracts/types';

interface AuthState {
  token: string | null;
  user: User | null;
  elderId: string | null; // The elder this user monitors (for family roles)
  setAuth: (token: string, user: User) => void;
  setElderId: (elderId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      elderId: null,
      setAuth: (token, user) => set({ token, user }),
      setElderId: (elderId) => set({ elderId }),
      clearAuth: () => set({ token: null, user: null, elderId: null }),
    }),
    {
      name: "agecare-auth",
    }
  )
);
