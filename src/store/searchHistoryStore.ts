"use client";

import { create } from "zustand";

/**
 * Recent search queries — stored in Zustand with manual
 * localStorage persistence (avoids the zustand/middleware
 * import that can SSR-break).
 */

interface SearchHistoryState {
  recentSearches: string[];
  addSearch: (query: string) => void;
  clearSearches: () => void;
  _hydrated: boolean;
  _hydrate: () => void;
}

const STORAGE_KEY = "keesdeen:recent-searches";
const MAX_ITEMS = 8;

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  recentSearches: [],
  _hydrated: false,

  _hydrate: () => {
    if (get()._hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ recentSearches: parsed.slice(0, MAX_ITEMS), _hydrated: true });
          return;
        }
      }
    } catch { /* ignore */ }
    set({ _hydrated: true });
  },

  addSearch: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    set((state) => {
      const next = [
        trimmed,
        ...state.recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return { recentSearches: next };
    });
  },

  clearSearches: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    set({ recentSearches: [] });
  },
}));
