/**
 * Builder Store - Zustand store for builder app state
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'assistant' | 'system' | 'tool' | 'tool_request'} role
 * @property {string} content
 * @property {number} timestamp
 * @property {Object} [toolCall] - Tool call info if this is a tool response
 * @property {{ id: string, name: string, arguments: Record<string, any> }[]} [toolCalls] - tool calls produced by assistant
 */

/**
 * @typedef {Object} LintError
 * @property {string} file
 * @property {number} [line]
 * @property {number} [column]
 * @property {string} message
 */

/**
 * @typedef {Object} AppFiles
 * @property {Record<string, string>} files - fileName -> content
 */

/**
 * @typedef {Object} BuilderState
 * @property {string | null} currentAppId - Currently selected app ID
 * @property {Record<string, string>} files - Current app files (fileName -> content)
 * @property {Record<string, string>} originalFiles - Files as they were when loaded (for dirty tracking)
 * @property {string | null} selectedFile - Currently selected file for viewing
 * @property {Message[]} messages - Chat history
 * @property {LintError[]} lintErrors - Current lint errors
 * @property {boolean} isAgentThinking - Is the agent processing
 * @property {number} previewKey - Key to force iframe refresh
 * @property {boolean} showPreview - Whether preview panel is visible
 * @property {Record<string, { files: Record<string, string>, versionHash: string | null, loadedAt: number }>} exampleApps - Curated example apps loaded from Firestore
 * @property {boolean} exampleAppsLoading - Whether examples are loading
 * @property {string | null} exampleAppsError - Error loading examples
 */

/** @type {import('zustand').StateCreator<BuilderState & BuilderActions>} */
const storeCreator = (set, get) => ({
  // State
  currentAppId: null,
  files: {},
  originalFiles: {},
  selectedFile: null,
  messages: [],
  lintErrors: [],
  isAgentThinking: false,
  previewKey: 0,
  showPreview: true,
  exampleApps: {},
  exampleAppsLoading: false,
  exampleAppsError: null,

  // Actions
  setCurrentApp: (appId, files) =>
    set({
      currentAppId: appId,
      files: files || {},
      originalFiles: files || {},
      selectedFile: null,
      messages: [],
      lintErrors: [],
      previewKey: get().previewKey + 1,
    }),

  clearCurrentApp: () =>
    set({
      currentAppId: null,
      files: {},
      originalFiles: {},
      selectedFile: null,
      messages: [],
      lintErrors: [],
    }),

  selectFile: (fileName) => set({ selectedFile: fileName }),

  updateFiles: (files) =>
    set({
      files,
      previewKey: get().previewKey + 1,
    }),

  setFile: (fileName, content) =>
    set((state) => ({
      files: { ...state.files, [fileName]: content },
      previewKey: state.previewKey + 1,
    })),

  deleteFile: (fileName) =>
    set((state) => {
      const newFiles = { ...state.files };
      delete newFiles[fileName];
      return { files: newFiles, previewKey: state.previewKey + 1 };
    }),

  setLintErrors: (errors) => set({ lintErrors: errors }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: message.id || crypto.randomUUID(),
          timestamp: message.timestamp || Date.now(),
        },
      ],
    })),

  clearMessages: () => set({ messages: [] }),

  setAgentThinking: (thinking) => set({ isAgentThinking: thinking }),

  refreshPreview: () => set((state) => ({ previewKey: state.previewKey + 1 })),

  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),

  setExampleApps: (exampleApps) => set({ exampleApps }),
  setExampleAppsLoading: (loading) => set({ exampleAppsLoading: loading }),
  setExampleAppsError: (error) => set({ exampleAppsError: error }),

  // Mark current files as saved (reset originalFiles to match current files)
  markAsSaved: () => set((state) => ({ originalFiles: { ...state.files } })),

  // Check if there are unsaved changes
  hasUnsavedChanges: () => {
    const { files, originalFiles } = get();
    const currentKeys = Object.keys(files).sort();
    const originalKeys = Object.keys(originalFiles).sort();

    // Different number of files
    if (currentKeys.length !== originalKeys.length) return true;

    // Different file names
    if (currentKeys.join(",") !== originalKeys.join(",")) return true;

    // Different content in any file
    for (const key of currentKeys) {
      if (files[key] !== originalFiles[key]) return true;
    }

    return false;
  },
});

export const useBuilderStore = create(
  persist(storeCreator, {
    name: "builder-store",
    partialize: (state) => ({
      currentAppId: state.currentAppId,
      files: state.files,
      // Don't persist messages, lintErrors, or UI state
    }),
  })
);
