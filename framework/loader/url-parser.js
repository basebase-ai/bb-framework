/**
 * Extract app ID from URL
 * Supports: subdomain, path, and query param
 */

export function getAppIdFromURL() {
  const url = new URL(window.location.href);
  
  // Option 1: Subdomain (e.g., teg-app.basebase.io)
  const hostname = url.hostname;
  const parts = hostname.split('.');
  
  // If subdomain exists and isn't 'www', use it
  if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    return parts[0];
  }
  
  // Option 2: Path-based (e.g., basebase.io/teg-app or localhost:3000/teg-app)
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && pathParts[0] !== 'apps') {
    return pathParts[0];
  }
  
  // Option 3: Query param (e.g., ?app=teg-app)
  const appParam = url.searchParams.get('app');
  if (appParam) {
    return appParam;
  }
  
  // Default: For development, try to load from localStorage or return null
  const devApp = localStorage.getItem('__dev_app_id');
  if (devApp) {
    return devApp;
  }
  
  return null;
}

// Helper to check if we're in production mode
export function isProductionMode() {
  // In production, app code will be loaded from Firestore
  // In development, app code is loaded from local files
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1';
}

