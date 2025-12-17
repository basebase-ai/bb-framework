/**
 * Authentication hook
 * 
 * Basic usage:
 *   const { user, loading, authenticated } = useAuth();
 * 
 * With sign-in prompt (requires AuthProvider wrapper):
 *   const { user, promptSignIn } = useAuth();
 *   // promptSignIn() opens the sign-in modal without navigating away
 */

import { useState, useEffect, useContext, createContext } from "react";
import { authState } from "../core/firebase-init.js";

/**
 * Context for auth modal trigger (provided by AuthProvider)
 * @type {React.Context<{ promptSignIn: () => void } | null>}
 */
export const AuthModalContext = createContext(null);

export function useAuth() {
  const [user, setUser] = useState(authState.user);
  const [loading, setLoading] = useState(!authState.ready);
  const modalContext = useContext(AuthModalContext);

  useEffect(() => {
    const unsubscribe = authState.subscribe((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    authenticated: !!user,
    /**
     * Opens the sign-in modal. Only available when inside an AuthProvider.
     * Safe to call even if not inside AuthProvider (will be a no-op with console warning).
     */
    promptSignIn: modalContext?.promptSignIn ?? (() => {
      console.warn("[useAuth] promptSignIn called but no AuthProvider found. Wrap your app in <AuthProvider> to enable sign-in prompts.");
    }),
  };
}

