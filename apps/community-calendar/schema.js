/**
 * Define your Firestore collections and their structure
 *
 * IMPORTANT: Collection Namespacing
 * ---------------------------------
 * All app-specific collections MUST be namespaced with your app ID
 * to prevent conflicts with other apps in the multi-tenant environment.
 *
 * Use the `collections` helper below instead of hardcoding collection names.
 */

// Your app's unique identifier
// This is set automatically during app:checkout or app:init
export const APP_ID = "community-calendar";

/**
 * Namespaced collection names
 * Use these throughout your app instead of hardcoding collection names
 *
 * Example:
 *   ❌ DON'T: useCollection('ideas')
 *   ✅ DO:    useCollection(collections.ideas)
 */
export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // Your app-specific collections (automatically namespaced)
  events: `${APP_ID}_events`,
  calendars: `${APP_ID}_calendars`,
};

/**
 * Helper function to create a namespaced collection name
 * Use this if you need to create collection names dynamically
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

// Schema definitions for type generation and documentation
export const schema = {
  apps: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      logoURL: { type: "string" }, // App logo/icon URL
      owner: { type: "string", required: true }, // Firebase Auth UID
      collaborators: { type: "array", items: { type: "string" } }, // Array of UIDs
      status: {
        type: "enum",
        values: ["draft", "active", "archived"],
        default: "draft",
      },
      version: { type: "string" },
      position: { type: "map" }, // { x: number, y: number } for Canvas view
      order: { type: "number" }, // Order index for Reorderable view
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", auto: true }, // Firebase Auth UID
      updatedBy: { type: "string", auto: true }, // Firebase Auth UID
    },

    indexes: [
      ["owner", "createdAt"],
      ["status", "updatedAt"],
    ],

    rules: {
      // Apps are publicly readable (code runs in browser anyway)
      read: "true",
      // Users can only update apps they own or are collaborators on
      write:
        "auth != null && (auth.uid == resource.data.owner || auth.uid in resource.data.get('collaborators', []))",
      // Anyone authenticated can create an app (they become the owner)
      create: "auth != null && request.resource.data.owner == auth.uid",
      // Only owners can delete their apps
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  users: {
    fields: {
      email: { type: "string", required: true },
      displayName: { type: "string" },
      photoURL: { type: "string" },
      role: { type: "enum", values: ["user", "admin"], default: "user" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [["email"], ["role", "createdAt"]],

    rules: {
      read: "auth != null",
      write: "auth.uid == doc.id",
      create: "auth != null",
      delete: "false",
    },
  },

  "apps/{appId}/versions": {
    subcollection: true,
    fields: {
      source: { type: "map", required: true }, // Original source files for checkout
      compiled: { type: "map", required: true }, // Compiled files for production
      metadata: { type: "map" },
    },

    rules: {
      // Versions are publicly readable (code runs in browser anyway)
      read: "true",
      // Users can create/update versions if they own the parent app
      write:
        "auth != null && (auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner || auth.uid in get(/databases/$(database)/documents/apps/$(appId)).data.get('collaborators', []))",
      create:
        "auth != null && (auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner || auth.uid in get(/databases/$(database)/documents/apps/$(appId)).data.get('collaborators', []))",
      delete:
        "auth != null && auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner",
    },
  },

  [`${APP_ID}_events`]: {
    fields: {
      title: { type: "string", required: true },
      description: { type: "string" },
      start: { type: "timestamp", required: true },
      end: { type: "timestamp", required: true },
      location: { type: "string" },
      coordinates: { type: "geopoint" }, // { latitude: number, longitude: number }
      geohash: { type: "string" }, // Geohash for efficient geospatial queries
      imageUrl: { type: "string" },
      eventUrl: { type: "string" },
      calendarId: { type: "string" },
      calendarName: { type: "string" },
      timezone: { type: "string" },
      status: { type: "string" },
      scrapedAt: { type: "timestamp" },
      discoveredAt: { type: "timestamp" },
      lastUpdated: { type: "timestamp" },
      lastError: { type: "string" },
    },

    indexes: [
      ["start", "end"],
      ["calendarId", "start"],
      ["status", "start"],
      ["geohash", "start", "__name__"], // For geospatial queries
    ],

    rules: {
      read: "true", // Events are publicly readable
      write: "auth != null", // Authenticated users can write events
      create: "auth != null",
      delete: "auth != null",
    },
  },

  [`${APP_ID}_calendars`]: {
    fields: {
      name: { type: "string", required: true },
      url: { type: "string", required: true },
      timezone: { type: "string" },
      cssSelector: { type: "string" },
      attribute: { type: "string" },
      wait: { type: "number" },
      timeout: { type: "number" },
      scrapeInterval: { type: "number" },
      enabled: { type: "boolean", default: true },
      useProxy: { type: "boolean", default: false },
      stealthProxy: { type: "boolean", default: false },
      premiumProxy: { type: "boolean", default: false },
      scrapedAt: { type: "timestamp" },
      lastScrapeStatus: { type: "string" },
      lastScrapeCount: { type: "number" },
      lastScrapeNew: { type: "number" },
      lastScrapeDuplicate: { type: "number" },
      lastError: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["enabled", "scrapedAt"],
      ["lastScrapeStatus", "scrapedAt"],
    ],

    rules: {
      read: "true", // Calendars are publicly readable
      write: "auth != null", // Authenticated users can write calendars
      create: "auth != null",
      delete: "auth != null",
    },
  },
};

// Generate Firestore rules from schema
export function generateRules(schema) {
  let rules =
    'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';

  Object.entries(schema).forEach(([collectionPath, config]) => {
    // Check if it's a subcollection (contains path variables like {appId})
    if (config.subcollection) {
      rules += `\n    match /${collectionPath}/{versionDoc} {\n`;
    } else {
      rules += `\n    match /${collectionPath}/{doc} {\n`;
    }

    rules += `      allow read: if ${config.rules.read};\n`;
    rules += `      allow write: if ${config.rules.write};\n`;
    rules += `      allow create: if ${config.rules.create};\n`;
    rules += `      allow delete: if ${config.rules.delete};\n`;
    rules += "    }\n";
  });

  rules += "  }\n}";
  return rules;
}
