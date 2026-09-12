import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

// Deliberately NOT persisted to localStorage — the access token lives only
// in memory (Zustand state, which lives in JS memory and disappears on
// reload). The refresh token never touches JS at all; it's an HttpOnly
// cookie the browser sends automatically. On a hard reload the app calls
// POST /api/auth/refresh once to re-hydrate this store from the cookie.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}));
