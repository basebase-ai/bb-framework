/**
 * Production server for Basebase Framework
 * Serves static files from /dist and handles SPA routing
 * Dynamically injects app-specific Open Graph meta tags for link previews
 */

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import compression from "compression";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Firebase Admin SDK Initialization
// =============================================================================

/** @type {import('firebase-admin/firestore').Firestore | null} */
let db = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from file or environment variable
 */
function initializeFirebase() {
  try {
    // Try to load service account from file first
    const serviceAccountPath = join(
      __dirname,
      "vibe-together-d2159-firebase-adminsdk-fbsvc-920807cb5c.json"
    );

    if (existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, "utf8")
      );
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("🔥 Firebase Admin initialized from service account file");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Fall back to environment variable (for Railway/production)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log(
        "🔥 Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT env"
      );
    } else {
      console.warn(
        "⚠️ No Firebase credentials found - link previews will use defaults"
      );
      return;
    }

    db = getFirestore();
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    // Continue without Firebase - will use default meta tags
  }
}

initializeFirebase();

// =============================================================================
// LRU Cache with TTL for App Metadata
// =============================================================================

/**
 * @typedef {Object} AppMetadata
 * @property {string} name - App display name
 * @property {string} description - App description
 * @property {string} logoURL - App logo/icon URL
 * @property {number} cachedAt - Timestamp when cached
 */

/** @type {Map<string, AppMetadata>} */
const metadataCache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 100;

/**
 * Get app metadata from cache or Firestore
 * @param {string} appId - The app ID to fetch
 * @returns {Promise<AppMetadata | null>}
 */
async function getAppMetadata(appId) {
  if (!db) return null;

  // Check cache first
  const cached = metadataCache.get(appId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const appDoc = await db.collection("apps").doc(appId).get();

    if (!appDoc.exists) {
      return null;
    }

    const data = appDoc.data();
    /** @type {AppMetadata} */
    const metadata = {
      name: data?.name || appId,
      description: data?.description || "",
      logoURL: data?.logoURL || "",
      cachedAt: Date.now(),
    };

    // LRU eviction: remove oldest entries if cache is full
    if (metadataCache.size >= CACHE_MAX_SIZE) {
      const oldestKey = metadataCache.keys().next().value;
      if (oldestKey) {
        metadataCache.delete(oldestKey);
      }
    }

    metadataCache.set(appId, metadata);
    return metadata;
  } catch (error) {
    console.error(`Failed to fetch metadata for ${appId}:`, error.message);
    return null;
  }
}

// =============================================================================
// Default Meta Tag Values (Basebase Platform)
// =============================================================================

const DEFAULT_META = {
  title: "Basebase – Build a production app with 1 file and 2 commands",
  description:
    "No GitHub. No Vercel. No Supabase. No credit card. Just clone, write React, and ship. Database, auth, and real-time sync included.",
  image:
    "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914399563_basebase_white_64.png?alt=media&token=b00983f8-b6b5-41f4-9c9a-83fd3f71f695",
  url: "https://www.basebase.com",
};

// =============================================================================
// Subdomain Parsing
// =============================================================================

/**
 * Extract app ID from request hostname
 * @param {string} hostname - The request hostname (e.g., "langbase.basebase.com")
 * @returns {string | null} - The app ID or null if root domain
 */
function getAppIdFromHostname(hostname) {
  const parts = hostname.split(".");

  // Handle localhost subdomains (e.g., langbase.localhost)
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0] === "localhost" ? null : parts[0];
  }

  // Handle production subdomains (e.g., langbase.basebase.com)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // "www" on basebase.com is the landing page app, not a redirect
    // So we return it as a valid app ID
    return subdomain;
  }

  return null;
}

// =============================================================================
// HTML Template Injection
// =============================================================================

/** @type {string | null} */
let htmlTemplate = null;

/**
 * Load and cache the HTML template
 * @returns {string}
 */
function getHtmlTemplate() {
  if (!htmlTemplate) {
    const templatePath = join(__dirname, "dist", "index.html");
    htmlTemplate = readFileSync(templatePath, "utf8");
  }
  return htmlTemplate;
}

/**
 * Inject meta tags into HTML template
 * @param {string} appId - The app ID
 * @param {AppMetadata | null} metadata - The app metadata
 * @param {string} fullUrl - The full request URL
 * @returns {string} - HTML with injected meta tags
 */
function injectMetaTags(appId, metadata, fullUrl) {
  const template = getHtmlTemplate();

  // Determine values to use
  const name = metadata?.name || capitalizeAppId(appId);
  const description =
    metadata?.description || `${name} – A Basebase app`;
  const image = metadata?.logoURL || DEFAULT_META.image;

  // Build the page title
  const pageTitle = appId === "www" ? DEFAULT_META.title : `${name} – Basebase`;

  // Build the full description for OG tags
  const ogDescription =
    metadata?.description || DEFAULT_META.description;

  // Replace placeholders
  return template
    .replace(/\{\{PAGE_TITLE\}\}/g, escapeHtml(pageTitle))
    .replace(/\{\{META_DESCRIPTION\}\}/g, escapeHtml(description))
    .replace(/\{\{CANONICAL_URL\}\}/g, escapeHtml(fullUrl))
    .replace(/\{\{OG_URL\}\}/g, escapeHtml(fullUrl))
    .replace(/\{\{OG_TITLE\}\}/g, escapeHtml(name))
    .replace(/\{\{OG_DESCRIPTION\}\}/g, escapeHtml(ogDescription))
    .replace(/\{\{OG_IMAGE\}\}/g, escapeHtml(image));
}

/**
 * Capitalize app ID for display (e.g., "langbase" -> "Langbase")
 * @param {string} appId
 * @returns {string}
 */
function capitalizeAppId(appId) {
  if (!appId) return "Basebase";
  return appId.charAt(0).toUpperCase() + appId.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =============================================================================
// Express App Setup
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
  // Allow eval for dynamic module loading
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
      "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; " +
      "frame-src http://localhost:3000 http://*.localhost:3000 https://accounts.google.com https://*.firebaseapp.com https://*.basebase.com https://www.google.com https://api.nango.dev https://connect.nango.dev https://live.airtop.ai; " +
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://api.nango.dev wss://api.nango.dev; " +
      "img-src 'self' data: https:;"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  // X-Frame-Options removed to allow Builder preview iframe
  // TODO: Re-enable with proper restrictions in production
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Serve static files from dist directory
// index: false prevents express.static from serving index.html for directory requests
// This allows our wildcard route to handle HTML with injected meta tags
app.use(
  express.static(join(__dirname, "dist"), {
    maxAge: "1y",
    etag: true,
    lastModified: true,
    index: false, // Don't auto-serve index.html - let wildcard route handle it
    setHeaders: (res, path) => {
      // Cache static assets aggressively
      if (path.match(/\.(js|css|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

// Reserved admin namespace: /__basebase/* for framework health/admin endpoints
// This ensures customer apps can use ANY other path for their routing

// Health check endpoint for Railway (reserved path)
app.get("/__basebase/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Future admin API endpoints can go under /__basebase/api/*
// app.get('/__basebase/api/stats', ...)

// SPA fallback - serve index.html for ALL other routes
// Customer apps own their URL space and can use any path for routing
// (e.g., /about, /profile, /dashboard/settings, etc.)
// Dynamically injects app-specific meta tags for link previews
app.get("*", async (req, res) => {
  try {
    const hostname = req.hostname || req.headers.host?.split(":")[0] || "";
    const appId = getAppIdFromHostname(hostname);

    // Build full URL for og:url
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const fullUrl = `${protocol}://${req.headers.host}${req.originalUrl}`;

    // Fetch app metadata (uses cache)
    const metadata = appId ? await getAppMetadata(appId) : null;

    // Inject meta tags and send response
    const html = injectMetaTags(appId || "www", metadata, fullUrl);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Don't cache the HTML - meta tags may change
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(html);
  } catch (error) {
    console.error("Error serving HTML:", error);
    // Fall back to static file on error
    res.sendFile(join(__dirname, "dist", "index.html"));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Basebase Framework server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});
