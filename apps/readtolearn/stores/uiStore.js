/**
 * UI Store for ReadToLearn app
 * Manages local UI state using Zustand
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
 * @property {string} activeView - Current view ('list' | 'read' | 'upload')
 * @property {string | null} activeDocumentId - Currently open document ID
 * @property {SelectedWord | null} selectedWord - Currently selected word for translation
 * @property {string} sourceLanguage - Selected source language code
 * @property {boolean} autoPlayAudio - Whether to auto-play pronunciation
 * @property {number} fontSize - Reader font size
 * @property {(view: string) => void} setActiveView
 * @property {(id: string | null) => void} setActiveDocumentId
 * @property {(word: SelectedWord | null) => void} setSelectedWord
 * @property {(lang: string) => void} setSourceLanguage
 * @property {(autoPlay: boolean) => void} setAutoPlayAudio
 * @property {(size: number) => void} setFontSize
 * @property {() => void} clearSelectedWord
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UIState>>} */
export const useUIStore = create((set) => ({
  activeView: "list",
  activeDocumentId: null,
  selectedWord: null,
  sourceLanguage: "norwegian",
  autoPlayAudio: true,
  fontSize: 18,

  /** @param {string} view */
  setActiveView: (view) => set({ activeView: view }),

  /** @param {string | null} id */
  setActiveDocumentId: (id) => set({ activeDocumentId: id }),

  /** @param {SelectedWord | null} word */
  setSelectedWord: (word) => set({ selectedWord: word }),

  /** @param {string} lang */
  setSourceLanguage: (lang) => set({ sourceLanguage: lang }),

  /** @param {boolean} autoPlay */
  setAutoPlayAudio: (autoPlay) => set({ autoPlayAudio: autoPlay }),

  /** @param {number} size */
  setFontSize: (size) => set({ fontSize: size }),

  clearSelectedWord: () => set({ selectedWord: null }),
}));


