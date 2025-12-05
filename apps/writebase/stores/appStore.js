/**
 * WriteBase UI State Store
 */

import { create } from "zustand";

/**
 * @typedef {'list' | 'editor'} ViewMode
 * @typedef {'edit' | 'view' | 'history'} EditorMode
 */

/**
 * @typedef {Object} AppState
 * @property {ViewMode} view - Current view mode
 * @property {string | null} activeDocumentId - Currently open document ID
 * @property {EditorMode} editorMode - Current editor mode
 * @property {boolean} sidebarOpen - Whether sidebar is open
 * @property {boolean} historyPanelOpen - Whether version history panel is open
 * @property {boolean} sharePanelOpen - Whether share panel is open
 * @property {number | null} previewVersion - Version number being previewed (null = current)
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<AppState & Actions>>} */
export const useAppStore = create((set) => ({
  // View state
  /** @type {ViewMode} */
  view: 'list',
  
  /** @type {string | null} */
  activeDocumentId: null,
  
  /** @type {EditorMode} */
  editorMode: 'edit',
  
  // UI state
  /** @type {boolean} */
  sidebarOpen: true,
  
  /** @type {boolean} */
  historyPanelOpen: false,
  
  /** @type {boolean} */
  sharePanelOpen: false,
  
  /** @type {number | null} */
  previewVersion: null,

  // Actions
  
  /**
   * Open a document in the editor
   * @param {string} docId - Document ID to open
   */
  openDocument: (docId) => set({ 
    view: 'editor', 
    activeDocumentId: docId,
    editorMode: 'edit',
    historyPanelOpen: false,
    previewVersion: null,
  }),
  
  /**
   * Close the current document and return to list
   */
  closeDocument: () => set({ 
    view: 'list', 
    activeDocumentId: null,
    editorMode: 'edit',
    historyPanelOpen: false,
    sharePanelOpen: false,
    previewVersion: null,
  }),
  
  /**
   * Set the editor mode
   * @param {EditorMode} mode
   */
  setEditorMode: (mode) => set({ editorMode: mode }),
  
  /**
   * Toggle sidebar visibility
   */
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  /**
   * Toggle version history panel
   */
  toggleHistoryPanel: () => set((state) => ({ 
    historyPanelOpen: !state.historyPanelOpen,
    // Close share panel when opening history
    sharePanelOpen: state.historyPanelOpen ? state.sharePanelOpen : false,
  })),
  
  /**
   * Toggle share panel
   */
  toggleSharePanel: () => set((state) => ({ 
    sharePanelOpen: !state.sharePanelOpen,
    // Close history panel when opening share
    historyPanelOpen: state.sharePanelOpen ? state.historyPanelOpen : false,
  })),
  
  /**
   * Set the version to preview
   * @param {number | null} version
   */
  setPreviewVersion: (version) => set({ 
    previewVersion: version,
    editorMode: version !== null ? 'history' : 'edit',
  }),
  
  /**
   * Close all panels
   */
  closePanels: () => set({
    historyPanelOpen: false,
    sharePanelOpen: false,
  }),
}));
