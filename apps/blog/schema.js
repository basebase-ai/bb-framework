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
export const APP_ID = 'blog';

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
  posts: `${APP_ID}_posts`, // Private - drafts and author's posts
  postsPublic: `${APP_ID}_posts_public`, // Public - published posts only
  authorsPublic: `${APP_ID}_authors_public`, // Public - author profiles
  tags: `${APP_ID}_tags`,
};

/**
 * Helper function to create a namespaced collection name
 * Use this if you need to create collection names dynamically
 * @param {string} name
 * @returns {string}
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

// Schema definitions for type generation and documentation
export const schema = {
  [`${APP_ID}_posts`]: {
    // Private collection - drafts and all posts for authors
    fields: {
      title: { type: "string", required: true },
      slug: { type: "string", required: true },
      content: { type: "string", default: "" }, // Markdown content
      excerpt: { type: "string", default: "" }, // Short description
      featuredImage: { type: "string" }, // URL to featured image
      status: {
        type: "enum",
        values: ["draft", "published"],
        default: "draft",
      },
      featured: { type: "boolean", default: false }, // Highlight on homepage
      tags: { type: "array", items: { type: "string" }, default: [] }, // Tag IDs
      authorId: { type: "string", required: true }, // Post author
      publishedAt: { type: "timestamp" }, // When published
      readingTime: { type: "number", default: 0 }, // Estimated minutes
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["authorId", "createdAt"],
      ["authorId", "updatedAt"], // For querying user's posts ordered by updatedAt
      ["status", "updatedAt"],
    ],

    rules: {
      // Authors can read their own posts
      read: "auth != null && auth.uid == resource.data.authorId",
      // Authors can update their own posts
      write: "auth != null && auth.uid == resource.data.authorId",
      // Authenticated users can create posts
      create: "auth != null && request.resource.data.authorId == auth.uid",
      // Authors can delete their own posts
      delete: "auth != null && auth.uid == resource.data.authorId",
    },
  },

  [`${APP_ID}_posts_public`]: {
    // Public collection - published posts only (automatically synced)
    // Uses _public suffix for framework's public read convention
    fields: {
      title: { type: "string", required: true },
      slug: { type: "string", required: true },
      content: { type: "string", default: "" },
      excerpt: { type: "string", default: "" },
      featuredImage: { type: "string" },
      status: { type: "enum", values: ["published"], default: "published" },
      featured: { type: "boolean", default: false },
      tags: { type: "array", items: { type: "string" }, default: [] },
      authorId: { type: "string", required: true },
      publishedAt: { type: "timestamp" },
      readingTime: { type: "number", default: 0 },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["publishedAt"],
      ["featured", "publishedAt"],
      ["updatedAt"],
    ],

    rules: {
      // Public read (handled by framework _public convention)
      read: "true",
      // Only authors can write
      write: "auth != null && auth.uid == resource.data.authorId",
      create: "auth != null && request.resource.data.authorId == auth.uid",
      delete: "auth != null && auth.uid == resource.data.authorId",
    },
  },

  [`${APP_ID}_authors_public`]: {
    // Public collection - author profiles (synced when authors sign in)
    fields: {
      displayName: { type: "string", required: true },
      photoURL: { type: "string" },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [],

    rules: {
      // Public read for displaying author info
      read: "true",
      // Only the author can write their own profile
      write: "auth != null && auth.uid == doc.id",
      create: "auth != null && auth.uid == doc.id",
      delete: "auth != null && auth.uid == doc.id",
    },
  },

  [`${APP_ID}_tags`]: {
    fields: {
      name: { type: "string", required: true },
      slug: { type: "string", required: true },
      description: { type: "string", default: "" },
      color: { type: "string", default: "#228be6" }, // Hex color
      postCount: { type: "number", default: 0 }, // Cached count
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [["slug"], ["postCount", "name"]],

    rules: {
      // Tags are publicly readable
      read: "true",
      // Only authenticated users can create/edit tags
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

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
};

/**
 * Generate Firestore rules from schema
 * @param {typeof schema} schemaObj
 * @returns {string}
 */
export function generateRules(schemaObj) {
  let rules =
    'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';

  Object.entries(schemaObj).forEach(([collectionPath, config]) => {
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
