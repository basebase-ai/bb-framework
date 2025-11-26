/**
 * OAuth Manager - Platform-level OAuth handler
 * 
 * This app handles OAuth flows for all services (Google, Microsoft, GitHub, etc.)
 * and is opened in a popup window by other apps.
 */

export const APP_ID = 'oauth-manager';

// This app doesn't need its own collections - it writes to user-secrets
export const collections = {
  users: "users",
  userSecrets: "user-secrets",
};

export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

// No schema needed - this app doesn't manage collections
export const schema = {};

