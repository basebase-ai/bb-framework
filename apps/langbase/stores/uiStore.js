/**
 * UI Store - Local state management for flashcards app
 * Includes state for both vocabulary (flashcards) and reading features
 */

import { create } from "zustand";

/**
 * @typedef {Object} SelectedWord
 * @property {string} word - The selected word
 * @property {string | null} translation - The translation (null if loading)
 * @property {{ x: number, y: number }} position - Tooltip position
 * @property {boolean} loading - Whether translation is loading
 * @property {string | null} error - Error message if translation failed
 */

/**
 * @typedef {Object} CachedCards
 * @property {Array<Object>} cards - The cached cards array
 * @property {number} loadedAt - Timestamp when cards were loaded
 */

/**
 * @typedef {Object} UIState
 * @property {string | null} selectedDeckId
 * @property {boolean} importModalOpen
 * @property {boolean} createDeckModalOpen
 * @property {'front' | 'back'} cardSide
 * @property {'vocabulary' | 'reading' | 'conversation'} activeTab
 * @property {SelectedWord | null} selectedWord
 * @property {string} sourceLanguage
 * @property {string | null} primaryLanguage - User's primary study language (from preferences)
 * @property {boolean} autoPlayAudio
 * @property {number} fontSize
 * @property {Record<string, CachedCards>} cardCache - Cache of cards by deck ID
 * @property {(deckId: string | null) => void} setSelectedDeckId
 * @property {(open: boolean) => void} setImportModalOpen
 * @property {(open: boolean) => void} setCreateDeckModalOpen
 * @property {() => void} toggleCardSide
 * @property {(side: 'front' | 'back') => void} setCardSide
 * @property {(tab: 'vocabulary' | 'reading' | 'conversation') => void} setActiveTab
 * @property {(word: SelectedWord | null) => void} setSelectedWord
 * @property {() => void} clearSelectedWord
 * @property {(lang: string) => void} setSourceLanguage
 * @property {(lang: string | null) => void} setPrimaryLanguage
 * @property {(autoPlay: boolean) => void} setAutoPlayAudio
 * @property {(size: number) => void} setFontSize
 * @property {(deckId: string, cards: Array<Object>) => void} setCachedCards
 * @property {(deckId: string) => CachedCards | undefined} getCachedCards
 * @property {(deckId: string) => void} invalidateCardCache
 * @property {(deckId: string, cardId: string, updates: Object) => void} updateCachedCard
 * @property {(deckId: string, cardId: string) => void} removeCachedCard
 * @property {(deckId: string, card: Object) => void} addCachedCard
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UIState>>} */
export const useUIStore = create((set) => ({
  // Flashcards state
  selectedDeckId: null,
  importModalOpen: false,
  createDeckModalOpen: false,
  cardSide: /** @type {'front' | 'back'} */ ("front"),
  
  // Tab state
  activeTab: /** @type {'vocabulary' | 'reading' | 'conversation'} */ ("conversation"),

  // Reading state
  selectedWord: null,
  sourceLanguage: "norwegian",
  primaryLanguage: /** @type {string | null} */ (null), // Loaded from user preferences
  autoPlayAudio: true,
  fontSize: 18,
  
  // Card cache - stores cards by deck ID to avoid reloading
  cardCache: /** @type {Record<string, CachedCards>} */ ({}),

  // Flashcards actions
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

  // Tab actions
  setActiveTab: (/** @type {'vocabulary' | 'reading' | 'conversation'} */ tab) =>
    set({ activeTab: tab }),

  // Reading actions
  /** @param {SelectedWord | null} word */
  setSelectedWord: (word) => set({ selectedWord: word }),

  clearSelectedWord: () => set({ selectedWord: null }),

  /** @param {string} lang */
  setSourceLanguage: (lang) => set({ sourceLanguage: lang }),

  /** @param {string | null} lang */
  setPrimaryLanguage: (lang) => set({ primaryLanguage: lang }),

  /** @param {boolean} autoPlay */
  setAutoPlayAudio: (autoPlay) => set({ autoPlayAudio: autoPlay }),

  /** @param {number} size */
  setFontSize: (size) => set({ fontSize: size }),

  // Card cache actions
  /** @param {string} deckId @param {Array<Object>} cards */
  setCachedCards: (deckId, cards) => set((state) => ({
    cardCache: {
      ...state.cardCache,
      [deckId]: { cards, loadedAt: Date.now() },
    },
  })),

  /** @param {string} deckId @returns {CachedCards | undefined} */
  getCachedCards: (deckId) => {
    // This is a selector, not an action - we'll use it differently
    return undefined; // Placeholder - we'll access via state directly
  },

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
