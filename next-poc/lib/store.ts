"use client";
import { create } from "zustand";
import type { Contact, Company, Deal, Task, Ticket, Template } from "./types";

export interface User { name: string; email: string; uid?: string; }
export type Theme = "light" | "dark";

export interface Toast { id: number; msg: string; kind?: "ok" | "err" | "" }
export interface DrawerState { type: string; id?: string; defaults?: Record<string, any> }

interface AppState {
  user: User | null;
  authReady: boolean;
  theme: Theme;
  collections: Record<string, any[]>;
  drawer: DrawerState | null;
  toasts: Toast[];
  setUser: (u: User | null) => void;
  setAuthReady: (v: boolean) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setCollection: (name: string, rows: any[]) => void;
  openDrawer: (type: string, id?: string, defaults?: Record<string, any>) => void;
  closeDrawer: () => void;
  toast: (msg: string, kind?: "ok" | "err" | "") => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;
export const useStore = create<AppState>((set) => ({
  user: null,
  authReady: false,
  theme: "light",
  collections: {},
  drawer: null,
  toasts: [],
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setCollection: (name, rows) => set((s) => ({ collections: { ...s.collections, [name]: rows } })),
  openDrawer: (type, id, defaults) => set({ drawer: { type, id, defaults } }),
  closeDrawer: () => set({ drawer: null }),
  toast: (msg, kind = "") => { const id = toastSeq++; set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] })); setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600); },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const live = <T extends { deletedAt?: number | null }>(arr: T[]) => arr.filter((x) => !x.deletedAt);

// Stable empty-array reference: returning a fresh `[]` from a selector makes
// zustand see a new value every render → infinite re-render loop (React #185).
const EMPTY: any[] = [];

// Typed, memo-friendly selectors (components subscribe only to what they read).
export const useContactsData = () => useStore((s) => (s.collections.contacts as Contact[]) || EMPTY);
export const useCompaniesData = () => useStore((s) => (s.collections.companies as Company[]) || EMPTY);
export const useDealsData = () => useStore((s) => (s.collections.deals as Deal[]) || EMPTY);
export const useTasksData = () => useStore((s) => (s.collections.tasks as Task[]) || EMPTY);
export const useTicketsData = () => useStore((s) => (s.collections.tickets as Ticket[]) || EMPTY);
export const useTemplatesData = () => useStore((s) => (s.collections.templates as Template[]) || EMPTY);
export const useLiveContacts = () => live(useContactsData());
export const useLiveCompanies = () => live(useCompaniesData());
export const useLiveDeals = () => live(useDealsData());
export const useLiveTasks = () => live(useTasksData());
export const useLiveTickets = () => live(useTicketsData());
export const useLiveTemplates = () => live(useTemplatesData());
