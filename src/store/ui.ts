import { create } from "zustand";

/**
 * UI-only state store.
 * Golden rule: Zustand owns UI state only (drawer open/closed,
 * overlay open/closed, filter drafts, recent searches).
 * Price, stock, tax, shipping, and coupon/promotion effects
 * are ALWAYS resolved server-side.
 */
interface UIState {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;

  searchOverlayOpen: boolean;
  setSearchOverlayOpen: (open: boolean) => void;

  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  cartDrawerOpen: false,
  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),

  searchOverlayOpen: false,
  setSearchOverlayOpen: (open) => set({ searchOverlayOpen: open }),

  recentSearches: [],
  addRecentSearch: (term) =>
    set((state) => ({
      recentSearches: [
        term,
        ...state.recentSearches.filter((s) => s !== term),
      ].slice(0, 10),
    })),
  clearRecentSearches: () => set({ recentSearches: [] }),
}));
