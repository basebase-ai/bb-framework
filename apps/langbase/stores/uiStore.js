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
}));
