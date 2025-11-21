/**
 * Authentication hook
 */

import { useState, useEffect } from "react";
import { authState } from "../core/firebase-init.js";

export function useAuth() {
  const [user, setUser] = useState(authState.user);
  const [loading, setLoading] = useState(!authState.ready);

  useEffect(() => {
    const unsubscribe = authState.subscribe((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading, authenticated: !!user };
}

