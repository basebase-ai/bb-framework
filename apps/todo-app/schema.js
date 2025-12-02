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
export const APP_ID = "todo-app";

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
  appMembers: "app-members", // User membership/subscription data for all apps

  // Your app-specific collections (automatically namespaced)
  projects: `${APP_ID}_projects`,
  todoItems: `${APP_ID}_todo-items`,
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

  "app-members": {
    fields: {
      appId: { type: "string", required: true },
      userId: { type: "string", required: true },
      role: {
        type: "enum",
        values: ["owner", "admin", "member", "viewer"],
        default: "member",
      },
      status: {
        type: "enum",
        values: ["active", "pending", "suspended", "cancelled"],
        default: "active",
      },
      tier: {
        type: "string",
        default: "free",
        // Apps define their own tiers: "free", "basic", "premium", etc.
      },
      joinedAt: { type: "timestamp", auto: true },
      lastVisitedAt: { type: "timestamp" },
      expiresAt: { type: "timestamp" }, // For trials/subscriptions
    },

    indexes: [
      ["appId", "userId"],
      ["appId", "status"],
      ["userId", "status"],
    ],

    rules: {
      // Users can read their own memberships
      read: "auth != null && (doc.id.matches('.*_' + auth.uid) || get(/databases/$(database)/documents/apps/$(doc.data.appId)).data.owner == auth.uid)",
      // Only app owners can write memberships
      write:
        "auth != null && get(/databases/$(database)/documents/apps/$(doc.data.appId)).data.owner == auth.uid",
      // Auto-create on first visit (handled by framework)
      create:
        "auth != null && (request.resource.data.userId == auth.uid || get(/databases/$(database)/documents/apps/$(request.resource.data.appId)).data.owner == auth.uid)",
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

  [`${APP_ID}_projects`]: {
    fields: {
      name: { type: "string", required: true },
      memberIds: { type: "array", items: { type: "string" }, required: true }, // Array of Firebase Auth UIDs
      owner: { type: "string", required: true }, // Firebase Auth UID of creator
      customFields: { type: "array", items: { type: "map" }, default: [] }, // Array of custom field definitions
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [["memberIds", "createdAt"]],

    rules: {
      // Users can read projects they are members of
      read: "auth != null && auth.uid in resource.data.memberIds",
      // Members can update projects
      write: "auth != null && auth.uid in resource.data.memberIds",
      // Authenticated users can create projects (they become owner and member)
      create:
        "auth != null && request.resource.data.owner == auth.uid && auth.uid in request.resource.data.memberIds",
      // Only owners can delete projects
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  [`${APP_ID}_todo-items`]: {
    fields: {
      projectId: { type: "string", required: true }, // Reference to project
      title: { type: "string", required: true },
      description: { type: "string" },
      completed: { type: "boolean", default: false },
      status: {
        type: "enum",
        values: ["backlog", "todo", "in-progress", "done"],
        default: "todo",
      },
      priority: {
        type: "enum",
        values: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      customFieldValues: { type: "map", default: {} }, // Map of custom field values (fieldId -> value)
      attachments: { type: "array", items: { type: "map" }, default: [] }, // Array of {url, name, path, uploadedAt}
      order: { type: "number", default: 0 }, // For drag-to-reorder
      owner: { type: "string", required: true }, // Firebase Auth UID of creator
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["projectId", "order"],
      ["projectId", "status"],
      ["owner", "createdAt"],
    ],

    rules: {
      // Users can read todo items if they're members of the project
      read: "auth != null",
      // Members of the project can update todo items
      write: "auth != null",
      // Authenticated users can create todo items
      create: "auth != null && request.resource.data.owner == auth.uid",
      // Owner or project members can delete todo items
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
