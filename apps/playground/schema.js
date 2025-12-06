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
export const APP_ID = "playground";

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
  // App-specific collections (namespaced)
  messages: "playground_messages", // For discussions and issue comments
  reviews: "playground_reviews", // User reviews with ratings
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

  // Messages for discussions and issue comments
  playground_messages: {
    fields: {
      appId: { type: "string", required: true }, // Which app this belongs to
      type: { type: "enum", values: ["discussion", "issue"], required: true },
      // For discussions: threadId groups replies together (null = new thread)
      threadId: { type: "string" },
      // For issues: issueId links comments to an issue
      issueId: { type: "string" },
      title: { type: "string" }, // For thread starters / issue titles
      content: { type: "string", required: true },
      author: { type: "string", required: true }, // Firebase Auth UID
      // Issue-specific fields
      priority: { type: "enum", values: ["low", "medium", "high", "critical"] },
      status: { type: "enum", values: ["open", "in_progress", "resolved", "closed"] },
      issueType: { type: "enum", values: ["bug", "feature", "question", "other"] },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["appId", "type", "createdAt"],
      ["appId", "threadId", "createdAt"],
      ["appId", "issueId", "createdAt"],
    ],
    rules: {
      read: "true",
      create: "auth != null",
      write: "auth != null && auth.uid == resource.data.author",
      delete: "auth != null && auth.uid == resource.data.author",
    },
  },

  // User reviews with ratings
  playground_reviews: {
    fields: {
      appId: { type: "string", required: true },
      author: { type: "string", required: true }, // Firebase Auth UID
      rating: { type: "number", required: true }, // 1-5 stars
      title: { type: "string" },
      content: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["appId", "createdAt"],
      ["appId", "rating"],
    ],
    rules: {
      read: "true",
      create: "auth != null",
      write: "auth != null && auth.uid == resource.data.author",
      delete: "auth != null && auth.uid == resource.data.author",
    },
  },
};
