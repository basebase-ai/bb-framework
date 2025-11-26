/**
 * OAuth Utilities for Backend Functions
 * 
 * Helper functions for backend functions to easily access OAuth tokens
 * with automatic refresh if expired.
 */

/**
 * Get a valid OAuth access token for a user and provider
 * Automatically refreshes if expired
 * 
 * @param {string} userId - Firebase user ID
 * @param {string} provider - OAuth provider (google, microsoft, github)
 * @param {Object} context - Function context
 * @returns {Promise<string>} Valid access token
 * 
 * @example
 * const token = await getOAuthToken(userId, "google", context);
 * // Use token to call Gmail API
 */
async function getOAuthToken(userId, provider, context) {
  const db = context.firebase.firestore();

  // Get tokens from user-secrets
  const secretDoc = await db.collection("user-secrets").doc(userId).get();

  if (!secretDoc.exists) {
    throw new Error(`No OAuth tokens found for user ${userId}`);
  }

  const providerData = secretDoc.data().services?.[provider];

  if (!providerData) {
    throw new Error(`Provider ${provider} not connected for user ${userId}`);
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = providerData.expiresAt?.toDate
    ? providerData.expiresAt.toDate()
    : new Date(providerData.expiresAt);

  // Decrypt token
  const { decryptToken } = require("../oauthExchange.js");
  let accessToken = await decryptToken(providerData.accessToken, context);

  // If expired, refresh it
  if (expiresAt <= now) {
    context.log("Access token expired, refreshing", { userId, provider });

    // Call refresh function
    const refreshResult = await context.callFunction("oauthRefresh", {
      provider,
      userId,
    });

    if (!refreshResult.success) {
      throw new Error(`Failed to refresh ${provider} token`);
    }

    // Get the new token
    const updatedDoc = await db.collection("user-secrets").doc(userId).get();
    const updatedProviderData = updatedDoc.data().services?.[provider];
    accessToken = await decryptToken(updatedProviderData.accessToken, context);
  }

  return accessToken;
}

/**
 * Check if a user has connected a specific OAuth provider
 * 
 * @param {string} userId - Firebase user ID
 * @param {string} provider - OAuth provider
 * @param {Object} context - Function context
 * @returns {Promise<boolean>} True if connected
 */
async function isOAuthConnected(userId, provider, context) {
  const db = context.firebase.firestore();

  const secretDoc = await db.collection("user-secrets").doc(userId).get();

  if (!secretDoc.exists) {
    return false;
  }

  const providerData = secretDoc.data().services?.[provider];
  return providerData?.accessToken ? true : false;
}

/**
 * Get all OAuth providers connected for a user
 * 
 * @param {string} userId - Firebase user ID
 * @param {Object} context - Function context
 * @returns {Promise<string[]>} Array of connected provider names
 */
async function getConnectedProviders(userId, context) {
  const db = context.firebase.firestore();

  const secretDoc = await db.collection("user-secrets").doc(userId).get();

  if (!secretDoc.exists) {
    return [];
  }

  const services = secretDoc.data().services || {};
  return Object.keys(services);
}

/**
 * Get OAuth token info (without the actual token)
 * Useful for checking expiration, scopes, etc.
 * 
 * @param {string} userId - Firebase user ID
 * @param {string} provider - OAuth provider
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Token metadata
 */
async function getOAuthTokenInfo(userId, provider, context) {
  const db = context.firebase.firestore();

  const secretDoc = await db.collection("user-secrets").doc(userId).get();

  if (!secretDoc.exists) {
    throw new Error(`No OAuth tokens found for user ${userId}`);
  }

  const providerData = secretDoc.data().services?.[provider];

  if (!providerData) {
    throw new Error(`Provider ${provider} not connected for user ${userId}`);
  }

  const expiresAt = providerData.expiresAt?.toDate
    ? providerData.expiresAt.toDate()
    : new Date(providerData.expiresAt);

  return {
    provider,
    expiresAt,
    isExpired: expiresAt <= new Date(),
    tokenType: providerData.tokenType,
    scope: providerData.scope,
    grantedAt: providerData.grantedAt?.toDate
      ? providerData.grantedAt.toDate()
      : new Date(providerData.grantedAt),
  };
}

module.exports = {
  getOAuthToken,
  isOAuthConnected,
  getConnectedProviders,
  getOAuthTokenInfo,
};

