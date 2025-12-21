/**
 * Framework entry point
 * Initializes Firebase and loads the app based on URL parameter
 * Supports ?draft=true to load from Firestore drafts (for Builder preview)
 */

// Import Firebase initialization first
import { app as firebaseApp } from "./core/firebase-init.js";
import { getAppIdFromURL as getAppIdFromURLParser } from "./loader/url-parser.js";
import { AppLoader } from "./loader/app-loader.js";

// Get app ID from URL (supports query param, subdomain, and path)
function getAppIdFromURL() {
  // First try the full URL parser (handles subdomains like www.localhost)
  const parsedAppId = getAppIdFromURLParser();
  if (parsedAppId) {
    return parsedAppId;
  }

  // Fallback: query param or default
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("app") || "starter-app";
}

// Check if we're in draft mode
const isDraftMode =
  new URLSearchParams(window.location.search).get("draft") === "true";

// Update loader text (uses the HTML loader element)
function updateLoaderText(message) {
  const loaderText = document.querySelector("#initial-loader .loader-text");
  if (loaderText) {
    loaderText.textContent = message;
  }
}

// Switch to fallback mode: hide loader, show static content
function showFallbackMode() {
  document.body.classList.add("fallback-mode");
}

// Dynamic import of the app entry point
// In development, loads from /apps/{app-id}/ OR from Firestore drafts if ?draft=true
// In production, loads from Firestore
const loadApp = async () => {
  try {
    const appId = getAppIdFromURL();
    console.log(
      `🚀 Loading app: ${appId}${isDraftMode ? " (DRAFT MODE)" : ""}`
    );

    // Update loader text
    updateLoaderText(`Loading ${appId}...`);

    // If draft mode is enabled, load from Firestore drafts instead of filesystem
    if (isDraftMode) {
      console.log(`📝 Loading draft from Firestore...`);
      const loader = new AppLoader(firebaseApp);
      await loader.loadAndExecute(appId, {}, { url: import.meta.url });
    } else {
      // In development, load from /apps/{app-id}/app.jsx
      // Must use relative path for Vite dynamic imports
      await import(`../apps/${appId}/app.jsx`);
    }

    // Hide loader, show app (static fallback stays hidden)
    document.body.classList.add("app-loaded");
  } catch (error) {
    console.error("Failed to load app:", error);
    const appId = getAppIdFromURL();

    // Switch to fallback mode: hide loader, show static content
    showFallbackMode();

    // Show error in #app area (below static content)
    document.getElementById("app").innerHTML = `
      <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 2rem auto; background: #fff5f5; border: 1px solid #ffc9c9; border-radius: 8px;">
        <h2 style="color: #c92a2a; margin-top: 0;">Failed to load app "${appId}"</h2>
        <p>${error.message}</p>
        <p style="color: #666; font-size: 14px;">Available apps: starter-app, playground</p>
        <p style="color: #666; font-size: 14px;">Try: <a href="?app=starter-app">?app=starter-app</a> or <a href="?app=playground">?app=playground</a></p>
      </div>
    `;
  }
};

loadApp();
