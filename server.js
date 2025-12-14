/**
 * Production server for Basebase Framework
 * Serves static files from /dist and handles SPA routing
 */

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import compression from "compression";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      "frame-src https://accounts.google.com https://*.firebaseapp.com https://www.google.com https://api.nango.dev https://connect.nango.dev; " +
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://api.nango.dev wss://api.nango.dev; " +
      "img-src 'self' data: https:;"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Serve static files from dist directory
app.use(
  express.static(join(__dirname, "dist"), {
    maxAge: "1y",
    etag: true,
    lastModified: true,
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
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
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
