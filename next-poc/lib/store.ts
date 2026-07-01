"use client";
import { create } from "zustand";
import type { Contact, Company } from "./types";

export interface User { name: string; email: string; uid?: string; }
export type Theme = "light" | "dark";

interface AppState {
  user: User | null;
  authReady: boolean;
  theme: Theme;
  collections: Record<string, any[]>;
  setUser: (u: User | null) => void;
  setAuthReady: (v: boolean) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setCollection: (name: string, rows: any[]) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  authReady: false,
  theme: "light",
  collections: {},
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setCollection: (name, rows) => set((s) => ({ collections: { ...s.collections, [name]: rows } })),
}));

const live = <T extends { deletedAt?: number | null }>(arr: T[]) => arr.filter((x) => !x.deletedAt);

// Typed, memo-friendly selectors (components subscribe only to what they read).
export const useContactsData = () => useStore((s) => (s.collections.contacts as Contact[]) || []);
export const useCompaniesData = () => useStore((s) => (s.collections.companies as Company[]) || []);
export const useLiveContacts = () => live(useContactsData());
