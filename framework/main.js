/**
 * Framework entry point
 * Initializes Firebase and loads the app based on URL parameter
 */

// Import Firebase initialization first
import "./core/firebase-init.js";
import { getAppIdFromURL as getAppIdFromURLParser } from "./loader/url-parser.js";

// Get app ID from URL (supports query param, subdomain, and path)
function getAppIdFromURL() {
  // First try the full URL parser (handles subdomains like www.localhost)
  const parsedAppId = getAppIdFromURLParser();
  if (parsedAppId) {
    return parsedAppId;
  }
  
  // Fallback: query param or default
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('app') || 'starter-app';
}

// Dynamic import of the app entry point
// In development, loads from /apps/{app-id}/
// In production, loads from Firestore
const loadApp = async () => {
  try {
    const appId = getAppIdFromURL();
    console.log(`🚀 Loading app: ${appId}`);
    
      // In development, load from /apps/{app-id}/app.jsx
      // Must use relative path for Vite dynamic imports
      await import(`../apps/${appId}/app.jsx`);
  } catch (error) {
    console.error("Failed to load app:", error);
    const appId = getAppIdFromURL();
    document.getElementById("app").innerHTML = `
      <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 2rem auto;">
        <h1>Failed to load app "${appId}"</h1>
        <p>${error.message}</p>
        <p style="color: #666; font-size: 14px;">Available apps: starter-app, playground</p>
        <p style="color: #666; font-size: 14px;">Try: <a href="?app=starter-app">?app=starter-app</a> or <a href="?app=playground">?app=playground</a></p>
      </div>
    `;
  }
};

loadApp();

