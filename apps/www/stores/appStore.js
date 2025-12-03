/**
 * Global app state store for www landing page
 */

import { create } from "zustand";

/** @typedef {{ submitted: boolean }} WaitlistState */
/** @typedef {{ setSubmitted: (submitted: boolean) => void }} WaitlistActions */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<WaitlistState & WaitlistActions>>} */
export const useAppStore = create((set) => ({
  submitted: false,
  setSubmitted: (/** @type {boolean} */ submitted) => set({ submitted }),
}));
