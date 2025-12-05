/**
 * SignBase - Global app state store
 * Note: View routing is now handled by useRouter, not this store
 */

import { create } from "zustand";

/**
 * @typedef {'all' | 'owned' | 'to_sign' | 'signed'} FilterMode
 */

/**
 * @typedef {Object} AppState
 * @property {boolean} sidebarOpen
 * @property {FilterMode} filterMode
 * @property {boolean} uploadModalOpen
 * @property {boolean} inviteModalOpen
 */

export const useAppStore = create((set) => ({
  // UI state
  sidebarOpen: true,

  // Filter state
  filterMode: "all", // 'all' | 'owned' | 'to_sign' | 'signed'

  // Modal state
  uploadModalOpen: false,
  inviteModalOpen: false,

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Filter actions
  setFilterMode: (mode) => set({ filterMode: mode }),

  // Modal actions
  openUploadModal: () => set({ uploadModalOpen: true }),
  closeUploadModal: () => set({ uploadModalOpen: false }),
  openInviteModal: () => set({ inviteModalOpen: true }),
  closeInviteModal: () => set({ inviteModalOpen: false }),
}));
