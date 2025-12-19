/**
 * Builder Store - Zustand store for builder app state
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'assistant' | 'system' | 'tool'} role
 * @property {string} content
 * @property {number} timestamp
 * @property {Object} [toolCall] - Tool call info if this is a tool response
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
 * @property {string | null} selectedFile - Currently selected file for viewing
 * @property {Message[]} messages - Chat history
 * @property {LintError[]} lintErrors - Current lint errors
 * @property {boolean} isAgentThinking - Is the agent processing
 * @property {number} previewKey - Key to force iframe refresh
 * @property {boolean} showPreview - Whether preview panel is visible
 */

/** @type {import('zustand').StateCreator<BuilderState & BuilderActions>} */
const storeCreator = (set, get) => ({
  // State
  currentAppId: null,
  files: {},
  selectedFile: null,
  messages: [],
  lintErrors: [],
  isAgentThinking: false,
  previewKey: 0,
  showPreview: true,

  // Actions
  setCurrentApp: (appId, files) =>
    set({
      currentAppId: appId,
      files: files || {},
      selectedFile: null,
      messages: [],
      lintErrors: [],
      previewKey: get().previewKey + 1,
    }),

  clearCurrentApp: () =>
    set({
      currentAppId: null,
      files: {},
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
