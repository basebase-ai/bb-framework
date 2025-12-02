/**
 * Global app state store
 */

import { create } from "zustand";

export const useAppStore = create((set) => ({
  // UI state
  sidebarOpen: true,
  theme: "light",

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
}));
