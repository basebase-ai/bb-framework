/**
 * WriteBase Schema - Collaborative Document Editor
 *
 * Collections:
 * - documents: Document metadata, ownership, sharing
 * - documents/{id}/content: Current document content (single doc)
 * - documents/{id}/presence: Active users and cursor positions
 * - documents/{id}/operations: Fine-grained edit history
 * - documents/{id}/versions: Periodic snapshots for version history
 */

export const APP_ID = "writebase";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections
  documents: `${APP_ID}_documents`,
};

/**
 * Helper to get subcollection paths
 * @param {string} docId - Document ID
 * @returns {Object} Subcollection paths
 */
export function getDocSubcollections(docId) {
  return {
    content: `${collections.documents}/${docId}/content`,
    presence: `${collections.documents}/${docId}/presence`,
    operations: `${collections.documents}/${docId}/operations`,
    versions: `${collections.documents}/${docId}/versions`,
  };
}

/**
 * Helper function to create a namespaced collection name
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

/**
 * Generate a unique color for a user based on their UID
 * Used for cursor/selection colors in collaborative editing
 * @param {string} uid - User ID
 * @returns {string} Hex color
 */
export function getUserColor(uid) {
  const colors = [
    "#e57373",
    "#f06292",
    "#ba68c8",
    "#9575cd",
    "#7986cb",
    "#64b5f6",
    "#4fc3f7",
    "#4dd0e1",
    "#4db6ac",
    "#81c784",
    "#aed581",
    "#dce775",
    "#ffd54f",
    "#ffb74d",
    "#ff8a65",
    "#a1887f",
  ];

  // Simple hash of UID to pick a color
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

// Schema definitions
export const schema = {
  apps: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      logoURL: { type: "string" },
      owner: { type: "string", required: true },
      collaborators: { type: "array", items: { type: "string" } },
      status: {
        type: "enum",
        values: ["draft", "active", "archived"],
        default: "draft",
      },
      version: { type: "string" },
      position: { type: "map" },
      order: { type: "number" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", auto: true },
      updatedBy: { type: "string", auto: true },
    },

    indexes: [
      ["owner", "createdAt"],
      ["status", "updatedAt"],
    ],

    rules: {
      read: "true",
      write:
        "auth != null && (auth.uid == resource.data.owner || auth.uid in resource.data.get('collaborators', []))",
      create: "auth != null && request.resource.data.owner == auth.uid",
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

  // Main documents collection
  [`${APP_ID}_documents`]: {
    fields: {
      title: { type: "string", required: true },
      owner: { type: "string", required: true },
      // Array of user IDs who have access
      sharedWith: { type: "array", items: { type: "string" }, default: [] },
      // Map of userId -> permission level
      permissions: { type: "map", default: {} },
      currentVersion: { type: "number", default: 1 },
      // For search/preview
      excerpt: { type: "string" },
      wordCount: { type: "number", default: 0 },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", auto: true },
      updatedBy: { type: "string", auto: true },
    },

    indexes: [
      ["owner", "updatedAt"],
      ["sharedWith", "updatedAt"],
    ],

    rules: {
      // Any authenticated user can read (filter client-side for owned/shared)
      read: "auth != null",
      // Can write if owner or has edit permission
      write:
        "auth != null && (auth.uid == resource.data.owner || resource.data.get('permissions', {}).get(auth.uid, '') == 'edit')",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  // Document content subcollection
  [`${APP_ID}_documents/{docId}/content`]: {
    subcollection: true,
    fields: {
      version: { type: "number", required: true },
      // TipTap/ProseMirror JSON content
      content: { type: "map", required: true },
      lastEditedBy: { type: "string" },
      updatedAt: { type: "timestamp", auto: true },
    },

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Presence subcollection (ephemeral)
  [`${APP_ID}_documents/{docId}/presence`]: {
    subcollection: true,
    fields: {
      userId: { type: "string", required: true },
      displayName: { type: "string" },
      photoURL: { type: "string" },
      color: { type: "string" },
      // Cursor position
      cursor: { type: "map" }, // { anchor: number, head: number }
      selection: { type: "map" }, // { from: number, to: number }
      isTyping: { type: "boolean", default: false },
      lastSeen: { type: "timestamp", auto: true },
    },

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Operations log for version history
  [`${APP_ID}_documents/{docId}/operations`]: {
    subcollection: true,
    fields: {
      version: { type: "number", required: true },
      userId: { type: "string", required: true },
      userName: { type: "string" },
      timestamp: { type: "timestamp", auto: true },
      // Array of operations performed
      operations: { type: "array" },
      // Content snapshot (stored periodically)
      snapshot: { type: "map" },
    },

    indexes: [["version"], ["timestamp"]],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "false",
    },
  },

  // Version snapshots for efficient history viewing
  [`${APP_ID}_documents/{docId}/versions`]: {
    subcollection: true,
    fields: {
      version: { type: "number", required: true },
      content: { type: "map", required: true },
      createdAt: { type: "timestamp", auto: true },
      createdBy: { type: "string" },
      createdByName: { type: "string" },
      changesSummary: { type: "string" },
    },

    indexes: [["version"], ["createdAt"]],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  "apps/{appId}/versions": {
    subcollection: true,
    fields: {
      source: { type: "map", required: true },
      compiled: { type: "map", required: true },
      metadata: { type: "map" },
    },

    rules: {
      read: "true",
      write:
        "auth != null && (auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner || auth.uid in get(/databases/$(database)/documents/apps/$(appId)).data.get('collaborators', []))",
      create:
        "auth != null && (auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner || auth.uid in get(/databases/$(database)/documents/apps/$(appId)).data.get('collaborators', []))",
      delete:
        "auth != null && auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner",
    },
  },
};

// Generate Firestore rules from schema
export function generateRules(schema) {
  let rules =
    'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';

  Object.entries(schema).forEach(([collectionPath, config]) => {
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
