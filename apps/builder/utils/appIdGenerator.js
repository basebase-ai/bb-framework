/**
 * App ID Generator
 * Generates short, URL-safe app IDs
 */

/**
 * Generate a short, URL-safe app ID
 * Uses lowercase alphanumeric only (URLs are case-insensitive)
 * @returns {string} An 8-character lowercase alphanumeric ID
 */
export function generateAppId() {
  // Lowercase only - URLs/subdomains are case-insensitive
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  const length = 8;
  let result = "";

  // Use crypto.getRandomValues for better randomness
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * Validate an app ID
 * @param {string} appId
 * @returns {boolean}
 */
export function isValidAppId(appId) {
  // Must be 1-50 characters, alphanumeric with dashes allowed
  return /^[a-zA-Z0-9-]{1,50}$/.test(appId);
}
