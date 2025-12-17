/**
 * Docs App Schema
 * Technical documentation with sidebar navigation
 */

export const APP_ID = 'docs';

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections
  apps: "apps",
  users: "users",

  // App-specific collections
  docs: `${APP_ID}_docs`,
};

/**
 * @typedef {Object} Doc
 * @property {string} id - Document ID (auto-generated)
 * @property {string} slug - URL-friendly identifier (e.g., "getting-started")
 * @property {string} title - Display title
 * @property {string} content - Markdown content
 * @property {string} category - Category for sidebar grouping (e.g., "Getting Started", "Guides", "API Reference")
 * @property {number} order - Sort order within category
 * @property {boolean} published - Whether the doc is visible to non-admins
 * @property {string} createdBy - User ID who created the doc
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Categories for organizing docs in sidebar
 * @type {string[]}
 */
export const DOC_CATEGORIES = [
  "Getting Started",
  "Guides", 
  "Building Apps",
  "Integrations",
  "API Reference",
  "Troubleshooting",
];

export const schema = {
  [collections.docs]: {
    fields: {
      slug: { type: "string", required: true },
      title: { type: "string", required: true },
      content: { type: "string", default: "" },
      category: { type: "string", required: true },
      order: { type: "number", default: 0 },
      published: { type: "boolean", default: false },
      createdBy: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["category", "order"],
      ["slug"],
      ["published", "category", "order"],
    ],

    rules: {
      // Published docs are publicly readable, unpublished only by admins
      read: "true",
      // Only global admins can write docs
      write: "auth != null && get(/databases/$(database)/documents/users/$(auth.uid)).data.role == 'admin'",
      create: "auth != null && get(/databases/$(database)/documents/users/$(auth.uid)).data.role == 'admin'",
      delete: "auth != null && get(/databases/$(database)/documents/users/$(auth.uid)).data.role == 'admin'",
    },
  },
};
