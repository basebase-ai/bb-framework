/**
 * Builder App Schema
 * An app for building other Basebase apps through conversation with an LLM
 */

export const APP_ID = "builder";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections
  conversations: `${APP_ID}_conversations`,
};

/**
 * Helper function to create a namespaced collection name
 * @param {string} name
 * @returns {string}
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}
