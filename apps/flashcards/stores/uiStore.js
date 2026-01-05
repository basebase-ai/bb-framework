/**
 * UI Store - Local state management for flashcards app
 */

import { create } from "zustand";

/**
 * @typedef {Object} UIState
 * @property {string | null} selectedDeckId
 * @property {boolean} importModalOpen
 * @property {boolean} createDeckModalOpen
 * @property {'front' | 'back'} cardSide
 * @property {(deckId: string | null) => void} setSelectedDeckId
 * @property {(open: boolean) => void} setImportModalOpen
 * @property {(open: boolean) => void} setCreateDeckModalOpen
 * @property {() => void} toggleCardSide
 * @property {(side: 'front' | 'back') => void} setCardSide
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UIState>>} */
export const useUIStore = create((set) => ({
  selectedDeckId: null,
  importModalOpen: false,
  createDeckModalOpen: false,
  cardSide: /** @type {'front' | 'back'} */ ("front"),

  setSelectedDeckId: (/** @type {string | null} */ deckId) =>
    set({ selectedDeckId: deckId }),

  setImportModalOpen: (/** @type {boolean} */ open) =>
    set({ importModalOpen: open }),

  setCreateDeckModalOpen: (/** @type {boolean} */ open) =>
    set({ createDeckModalOpen: open }),

  toggleCardSide: () =>
    set((state) => ({
      cardSide: state.cardSide === "front" ? "back" : "front",
    })),

  setCardSide: (/** @type {'front' | 'back'} */ side) =>
    set({ cardSide: side }),
}));

