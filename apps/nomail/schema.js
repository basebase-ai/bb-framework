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
export const APP_ID = 'nomail';

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
  userConfigs: `${APP_ID}_user-configs`,
  emails: `${APP_ID}_emails`,
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
  // User NoMail configuration
  // Note: OAuth tokens are stored in the global user-secrets collection
  [collections.userConfigs]: {
    fields: {
      userId: { type: "string", required: true },
      phoneNumber: { type: "string" }, // User's phone number for SMS notifications
      enabled: { type: "boolean", default: true }, // Whether monitoring is active
      lastCheckTime: { type: "timestamp" }, // Last time emails were checked
      checkIntervalMinutes: { type: "number", default: 60 }, // How often to check (minutes)
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["userId"],
      ["enabled", "lastCheckTime"],
    ],
    rules: {
      read: "auth != null && auth.uid == resource.data.userId",
      write: "auth != null && auth.uid == resource.data.userId",
      create: "auth != null && request.resource.data.userId == auth.uid",
      delete: "auth != null && auth.uid == resource.data.userId",
    },
  },

  // Email messages
  [collections.emails]: {
    fields: {
      userId: { type: "string", required: true },
      gmailMessageId: { type: "string", required: true }, // Gmail's message ID
      gmailThreadId: { type: "string" }, // Gmail thread ID
      from: { type: "string", required: true },
      to: { type: "array", items: { type: "string" } },
      cc: { type: "array", items: { type: "string" } },
      bcc: { type: "array", items: { type: "string" } },
      subject: { type: "string" },
      snippet: { type: "string" }, // First few lines of the email
      receivedAt: { type: "timestamp", required: true },
      needsResponse: { type: "boolean", default: false }, // Flagged by LLM as important
      llmReason: { type: "string" }, // Why LLM flagged it as important
      isRead: { type: "boolean", default: false }, // User has read it
      isArchived: { type: "boolean", default: false }, // User archived it
      labels: { type: "array", items: { type: "string" } }, // Gmail labels
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["userId", "needsResponse", "receivedAt"],
      ["userId", "isArchived", "receivedAt"],
      ["gmailMessageId"],
    ],
    rules: {
      read: "auth != null && auth.uid == resource.data.userId",
      write: "auth != null && auth.uid == resource.data.userId",
      create: "auth != null",
      delete: "auth != null && auth.uid == resource.data.userId",
    },
  },
};
