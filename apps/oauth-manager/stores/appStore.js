/**
 * OAuth Manager store
 */

import { create } from "zustand";

export const useAppStore = create((set) => ({
  provider: null,
  scopes: [],
  status: 'initializing', // initializing, authenticating, success, error
  error: null,
  
  setProvider: (provider) => set({ provider }),
  setScopes: (scopes) => set({ scopes }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: 'error' }),
}));

