/**
 * Global app state store for Snack
 */

import { create } from "zustand";

/**
 * @typedef {Object} AppState
 * @property {string | null} selectedChannelId - Currently selected channel
 * @property {boolean} membersModalOpen - Whether members modal is open
 * @property {boolean} createChannelModalOpen - Whether create channel modal is open
 * @property {string | null} editingMessageId - ID of message being edited
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<AppState & { setSelectedChannel: (id: string | null) => void; openMembersModal: () => void; closeMembersModal: () => void; openCreateChannelModal: () => void; closeCreateChannelModal: () => void; setEditingMessage: (id: string | null) => void }>>} */
export const useAppStore = create((set) => ({
  // UI state
  selectedChannelId: null,
  membersModalOpen: false,
  createChannelModalOpen: false,
  editingMessageId: null,

  // Actions
  setSelectedChannel: (/** @type {string | null} */ id) =>
    set({ selectedChannelId: id }),

  openMembersModal: () => set({ membersModalOpen: true }),
  closeMembersModal: () => set({ membersModalOpen: false }),

  openCreateChannelModal: () => set({ createChannelModalOpen: true }),
  closeCreateChannelModal: () => set({ createChannelModalOpen: false }),

  setEditingMessage: (/** @type {string | null} */ id) =>
    set({ editingMessageId: id }),
}));
