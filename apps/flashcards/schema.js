/**
 * Flashcards App - Schema Definition
 * 
 * Collections:
 * - decks: Flashcard decks with metadata
 * - cards: Individual flashcards with Leitner system tracking
 */

// Your app's unique identifier
export const APP_ID = "flashcards";

/**
 * Namespaced collection names
 * @type {{ apps: string, users: string, decks: string, cards: string }}
 */
export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections (automatically namespaced)
  decks: `${APP_ID}_decks`,
  cards: `${APP_ID}_cards`,
};

/**
 * Helper function to create a namespaced collection name
 * @param {string} name
 * @returns {string}
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

/**
 * Leitner box intervals (in days)
 * Box 1: 1 day, Box 2: 2 days, Box 3: 4 days, Box 4: 7 days, Box 5: 14 days
 * @type {Record<number, number>}
 */
export const LEITNER_INTERVALS = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

// Schema definitions for type generation and documentation
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
      write: "auth != null && (auth.uid == resource.data.owner || auth.uid in resource.data.get('collaborators', []))",
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

  [`${APP_ID}_decks`]: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      owner: { type: "string", required: true },
      isPublic: { type: "boolean", default: false },
      cardCount: { type: "number", default: 0 },
      masteredCount: { type: "number", default: 0 },
      tags: { type: "array", items: { type: "string" } },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["owner"],
      ["isPublic"],
    ],
    rules: {
      read: "auth != null && (auth.uid == resource.data.owner || resource.data.isPublic == true)",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  [`${APP_ID}_cards`]: {
    fields: {
      deckId: { type: "string", required: true },
      front: { type: "string", required: true },
      back: { type: "string", required: true },
      frontAudio: { type: "array", items: { type: "string" } },
      backAudio: { type: "array", items: { type: "string" } },
      owner: { type: "string", required: true },
      box: { type: "number", default: 1 },
      nextReviewAt: { type: "timestamp" },
      lastReviewedAt: { type: "timestamp" },
      correctCount: { type: "number", default: 0 },
      incorrectCount: { type: "number", default: 0 },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["deckId"],
      ["owner"],
    ],
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
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
      write: "auth != null && (auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner || auth.uid in get(/databases/$(database)/documents/apps/$(appId)).data.get('collaborators', []))",
      create: "auth != null && (auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner || auth.uid in get(/databases/$(database)/documents/apps/$(appId)).data.get('collaborators', []))",
      delete: "auth != null && auth.uid == get(/databases/$(database)/documents/apps/$(appId)).data.owner",
    },
  },
};

/**
 * @param {typeof schema} schemaObj
 * @returns {string}
 */
export function generateRules(schemaObj) {
  let rules =
    'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';

  Object.entries(schemaObj).forEach(([collectionPath, config]) => {
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

