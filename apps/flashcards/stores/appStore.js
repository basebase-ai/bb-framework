/**
 * App Store - Local state management for flashcards app
 */

import { create } from "zustand";

/**
 * @typedef {Object} CachedCards
 * @property {Array<Object>} cards - The cached cards array
 * @property {number} loadedAt - Timestamp when cards were loaded
 */

/**
 * @typedef {Object} AppState
 * @property {string | null} selectedDeckId
 * @property {'front' | 'back'} cardSide
 * @property {Record<string, CachedCards>} cardCache - Cache of cards by deck ID
 * @property {(deckId: string | null) => void} setSelectedDeckId
 * @property {() => void} toggleCardSide
 * @property {(side: 'front' | 'back') => void} setCardSide
 * @property {(deckId: string, cards: Array<Object>) => void} setCachedCards
 * @property {(deckId: string) => void} invalidateCardCache
 * @property {(deckId: string, cardId: string, updates: Object) => void} updateCachedCard
 * @property {(deckId: string, cardId: string) => void} removeCachedCard
 * @property {(deckId: string, card: Object) => void} addCachedCard
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<AppState>>} */
export const useAppStore = create((set) => ({
  // State
  selectedDeckId: null,
  cardSide: /** @type {'front' | 'back'} */ ("front"),
  cardCache: /** @type {Record<string, CachedCards>} */ ({}),

  // Actions
  setSelectedDeckId: (/** @type {string | null} */ deckId) =>
    set({ selectedDeckId: deckId }),

  toggleCardSide: () =>
    set((state) => ({
      cardSide: state.cardSide === "front" ? "back" : "front",
    })),

  setCardSide: (/** @type {'front' | 'back'} */ side) =>
    set({ cardSide: side }),

  // Card cache actions
  /** @param {string} deckId @param {Array<Object>} cards */
  setCachedCards: (deckId, cards) => set((state) => ({
    cardCache: {
      ...state.cardCache,
      [deckId]: { cards, loadedAt: Date.now() },
    },
  })),

  /** @param {string} deckId */
  invalidateCardCache: (deckId) => set((state) => {
    const { [deckId]: removed, ...rest } = state.cardCache;
    return { cardCache: rest };
  }),

  /** @param {string} deckId @param {string} cardId @param {Object} updates */
  updateCachedCard: (deckId, cardId, updates) => set((state) => {
    const cached = state.cardCache[deckId];
    if (!cached) return state;
    return {
      cardCache: {
        ...state.cardCache,
        [deckId]: {
          ...cached,
          cards: cached.cards.map((c) => 
            c.id === cardId ? { ...c, ...updates } : c
          ),
        },
      },
    };
  }),

  /** @param {string} deckId @param {string} cardId */
  removeCachedCard: (deckId, cardId) => set((state) => {
    const cached = state.cardCache[deckId];
    if (!cached) return state;
    return {
      cardCache: {
        ...state.cardCache,
        [deckId]: {
          ...cached,
          cards: cached.cards.filter((c) => c.id !== cardId),
        },
      },
    };
  }),

  /** @param {string} deckId @param {Object} card */
  addCachedCard: (deckId, card) => set((state) => {
    const cached = state.cardCache[deckId];
    if (!cached) return state;
    return {
      cardCache: {
        ...state.cardCache,
        [deckId]: {
          ...cached,
          cards: [...cached.cards, card],
        },
      },
    };
  }),
}));
