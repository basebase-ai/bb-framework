/**
 * Snack Schema - Slack Clone
 *
 * Collections:
 * - channels: Chat channels with name, description, members
 * - messages: Messages within channels with reactions support
 * - members: Channel membership tracking
 */

export const APP_ID = "snack";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections
  channels: `${APP_ID}_channels`,
  messages: `${APP_ID}_messages`,
  members: `${APP_ID}_members`, // Document ID format: {channelId}_{userId}
};

/**
 * Helper function to create a namespaced collection name
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

/**
 * Common emoji reactions
 */
export const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "🚀", "👀", "💯", "🔥"];

/**
 * Channel visibility options
 */
export const CHANNEL_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
};

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

  // Channels collection
  [`${APP_ID}_channels`]: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      visibility: {
        type: "enum",
        values: ["public", "private"],
        default: "public",
      },
      // Stats
      memberCount: { type: "number", default: 1 },
      messageCount: { type: "number", default: 0 },
      // Last activity for sorting
      lastMessageAt: { type: "timestamp", nullable: true },
      lastMessagePreview: { type: "string", nullable: true },
      // Timestamps
      createdAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", required: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["createdBy", "createdAt"],
      ["visibility", "lastMessageAt"],
    ],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Messages collection
  [`${APP_ID}_messages`]: {
    fields: {
      channelId: { type: "string", required: true },
      content: { type: "string", required: true },
      authorId: { type: "string", required: true },
      authorName: { type: "string" },
      authorPhotoURL: { type: "string" },
      // Reactions stored as a map: { "👍": ["userId1", "userId2"], "❤️": ["userId3"] }
      reactions: { type: "map", default: {} },
      // Edit tracking
      isEdited: { type: "boolean", default: false },
      editedAt: { type: "timestamp", nullable: true },
      // Timestamps
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["channelId", "createdAt"],
      ["authorId", "createdAt"],
    ],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.authorId == auth.uid",
      delete: "auth != null && auth.uid == resource.data.authorId",
    },
  },

  // Channel members collection
  // Document ID format: {channelId}_{userId}
  [`${APP_ID}_members`]: {
    fields: {
      channelId: { type: "string", required: true },
      userId: { type: "string", required: true },
      displayName: { type: "string" },
      photoURL: { type: "string" },
      role: {
        type: "enum",
        values: ["owner", "admin", "member"],
        default: "member",
      },
      // Timestamps
      joinedAt: { type: "timestamp", auto: true },
      lastReadAt: { type: "timestamp", nullable: true },
    },

    indexes: [
      ["channelId", "joinedAt"],
      ["userId", "joinedAt"],
    ],

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
export function generateRules(schemaDefinition) {
  let rules =
    'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';

  Object.entries(schemaDefinition).forEach(([collectionPath, config]) => {
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
