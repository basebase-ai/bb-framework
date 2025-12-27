/**
 * Extract app ID from URL
 * Supports: subdomain, path, and query param
 */

export function getAppIdFromURL() {
  const url = new URL(window.location.href);

  // Option 1: Query param (e.g., ?app=teg-app) - Highest priority for testing
  const appParam = url.searchParams.get("app");
  if (appParam) {
    return appParam;
  }

  // Option 2: Subdomain (e.g., teg-app.basebase.io or teg-app.localhost)
  const hostname = url.hostname;
  const parts = hostname.split(".");

  // Sub-brands with singular domain names  will go here. Starting with sole revtops.com
  const isRevTopsDomain = hostname.includes("revtops.com");
  
  // Check if this is a basebase domain (where www is a valid app ID)
  const isBasebaseDomain =
    hostname.includes("basebase.com") || hostname.includes("basebase.io") || isRevTopsDomain;

  // Check for localhost subdomains (e.g., teg-app.localhost or www.localhost)
  // www.localhost loads the "www" app for local testing
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0];
  }

  // Check for production subdomains (e.g., teg-app.basebase.io or www.basebase.com)
  // On basebase domains, "www" is treated as a valid app ID (the landing page app)
  if (parts.length > 2 && parts[0] !== "localhost") {
    // For sub-brands
    if (isRevTopsDomain || parts[0] == "www") {
      return "revtops";
    }
    // For basebase domains, always use the subdomain (including www)
    // For other domains, skip www as it's just the standard prefix
    if (isBasebaseDomain || parts[0] !== "www") {
      return parts[0];
    }
  }

  // Option 3: Path-based (e.g., basebase.io/teg-app or localhost:3000/teg-app)
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Ignore paths with file extensions (like .html)
  if (
    pathParts.length > 0 &&
    !pathParts[0].includes(".") &&
    pathParts[0] !== "apps"
  ) {
    return pathParts[0];
  }

  // Default: For development, try to load from localStorage
  const devApp = localStorage.getItem("__dev_app_id");
  if (devApp) {
    return devApp;
  }

  // For production root domain (basebase.com with no subdomain), default to "www" app
  if (isBasebaseDomain) {
    return "www";
  }

  return null;
}

// Helper to check if we're in production mode
export function isProductionMode() {
  // In production, app code will be loaded from Firestore
  // In development, app code is loaded from local files
  return (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  );
}
