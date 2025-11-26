/**
 * Framework Hook: OAuth Management
 * 
 * Provides a unified interface for OAuth flows with any provider (Google, Microsoft, GitHub, etc.)
 * Tokens are stored securely in the user-secrets collection (one doc per user)
 * 
 * @example
 * import { useOAuth } from "../../../framework/hooks/useOAuth.js";
 * 
 * function MyComponent() {
 *   const { initiateOAuth, getTokens, isConnected, disconnect } = useOAuth("google");
 *   
 *   const handleConnect = () => {
 *     initiateOAuth({
 *       scopes: ["gmail.readonly"],
 *       redirectUri: window.location.origin + "/apps/myapp"
 *     });
 *   };
 *   
 *   return <Button onClick={handleConnect}>Connect Google</Button>;
 * }
 */

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../core/firebase-init.js";
import { useAuth } from "./useAuth.js";
import { useFunction } from "./useFunction.js";

/**
 * Hook for managing OAuth tokens for a specific provider
 * @param {string} provider - OAuth provider name (e.g., "google", "microsoft", "github")
 * @returns {Object} OAuth utilities
 */
export function useOAuth(provider) {
  const { user } = useAuth();
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { call: exchangeCode } = useFunction("oauthExchange");
  const { call: refreshTokens } = useFunction("oauthRefresh");
  const { call: revokeAccess } = useFunction("oauthRevoke");

  // Subscribe to user secrets to get tokens
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setTokens(null);
      return;
    }

    let unsubscribe;

    try {
      unsubscribe = onSnapshot(
        doc(db, "user-secrets", user.uid),
        (snapshot) => {
          const data = snapshot.data();
          const providerData = data?.services?.[provider] || null;
          setTokens(providerData);
          setLoading(false);
        },
        (err) => {
          console.error("Error loading OAuth tokens:", err);
          setError(err);
          setTokens(null);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Failed to subscribe to OAuth tokens:", err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, provider]);

  // OAuth callback is now handled by the OAuth Manager app
  // No need to check URL parameters in individual apps

  /**
   * Initiate OAuth flow by opening popup to OAuth Manager app
   * @param {Object} options
   * @param {string[]} options.scopes - OAuth scopes to request
   */
  const initiateOAuth = useCallback(
    (options = {}) => {
      if (!user) {
        throw new Error("User must be authenticated to initiate OAuth");
      }

      const { scopes = [] } = options;

      // Build OAuth Manager URL
      const oauthUrl = new URL(window.location.origin);
      oauthUrl.searchParams.set('app', 'oauth-manager');
      oauthUrl.searchParams.set('provider', provider);
      oauthUrl.searchParams.set('scopes', scopes.join(','));

      // Open popup
      const popup = window.open(
        oauthUrl.toString(),
        'oauth-popup',
        'width=600,height=700,left=100,top=100'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for messages from popup
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth-success') {
          console.log('OAuth success:', event.data.provider);
          window.removeEventListener('message', handleMessage);
          // The useEffect will pick up the new tokens from Firestore
        } else if (event.data.type === 'oauth-error') {
          console.error('OAuth error:', event.data.error);
          window.removeEventListener('message', handleMessage);
          setError(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup if popup is closed without completion
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    },
    [user, provider]
  );

  /**
   * Refresh access token if expired
   */
  const refreshAccessToken = useCallback(async () => {
    if (!user || !tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      await refreshTokens({ provider });
      return true;
    } catch (err) {
      console.error("Token refresh failed:", err);
      throw err;
    }
  }, [user, provider, tokens, refreshTokens]);

  /**
   * Disconnect OAuth provider
   */
  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      await revokeAccess({ provider });
      setTokens(null);
    } catch (err) {
      console.error("OAuth revoke failed:", err);
      throw err;
    }
  }, [user, provider, revokeAccess]);

  /**
   * Check if provider is connected and token is valid
   */
  const isConnected = tokens?.accessToken ? true : false;
  const isExpired = tokens?.expiresAt
    ? new Date(tokens.expiresAt.toDate ? tokens.expiresAt.toDate() : tokens.expiresAt) <= new Date()
    : false;

  return {
    tokens,
    loading,
    error,
    isConnected,
    isExpired,
    initiateOAuth,
    refreshAccessToken,
    disconnect,
  };
}

// OAuth URLs are now handled by the OAuth Manager app

/**
 * Get OAuth scopes for common use cases
 */
export const OAuthScopes = {
  google: {
    gmail: {
      readonly: "https://www.googleapis.com/auth/gmail.readonly",
      modify: "https://www.googleapis.com/auth/gmail.modify",
      send: "https://www.googleapis.com/auth/gmail.send",
      compose: "https://www.googleapis.com/auth/gmail.compose",
    },
    drive: {
      readonly: "https://www.googleapis.com/auth/drive.readonly",
      file: "https://www.googleapis.com/auth/drive.file",
      full: "https://www.googleapis.com/auth/drive",
    },
    calendar: {
      readonly: "https://www.googleapis.com/auth/calendar.readonly",
      events: "https://www.googleapis.com/auth/calendar.events",
      full: "https://www.googleapis.com/auth/calendar",
    },
  },
  microsoft: {
    mail: {
      read: "Mail.Read",
      readWrite: "Mail.ReadWrite",
      send: "Mail.Send",
    },
    calendar: {
      read: "Calendars.Read",
      readWrite: "Calendars.ReadWrite",
    },
  },
  github: {
    repo: "repo",
    user: "user",
    gist: "gist",
  },
};

