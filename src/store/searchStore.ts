// src/store/searchStore.ts
import create from "zustand";

interface SearchState {
  query: string;
  city: string;
  setQuery: (q: string) => void;
  setCity: (c: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  city: "",
  setQuery: (q) => set({ query: q }),
  setCity: (c) => set({ city: c }),
}));
