/**
 * Flashcards App - Schema Definition
 *
 * Collections:
 * - decks: Flashcard decks with metadata
 * - cards: Individual flashcards with Leitner system tracking
 * - documents: Imported reading documents
 * - vocabulary: Words looked up during reading
 */

// Your app's unique identifier
export const APP_ID = "langbase";

/**
 * Namespaced collection names
 * @type {{ apps: string, users: string, decks: string, cards: string, documents: string, vocabulary: string, scenarios: string, conversations: string, messages: string, userPreferences: string }}
 */
export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections (automatically namespaced)
  decks: `${APP_ID}_decks`,
  cards: `${APP_ID}_cards`,
  documents: `${APP_ID}_documents`,
  vocabulary: `${APP_ID}_vocabulary`,
  scenarios: `${APP_ID}_scenarios`, // Reusable conversation templates
  conversations: `${APP_ID}_conversations`, // Individual chat instances
  messages: `${APP_ID}_messages`,
  userPreferences: `${APP_ID}_user_preferences`, // User settings (primary language, etc.)
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

/**
 * Supported source languages for reading
 * @type {Record<string, { code: string, name: string, speechCode: string, flag: string }>}
 */
export const SUPPORTED_LANGUAGES = {
  norwegian: { code: "no", name: "Norwegian", speechCode: "nb-NO", flag: "🇳🇴" },
  swedish: { code: "sv", name: "Swedish", speechCode: "sv-SE", flag: "🇸🇪" },
  danish: { code: "da", name: "Danish", speechCode: "da-DK", flag: "🇩🇰" },
  german: { code: "de", name: "German", speechCode: "de-DE", flag: "🇩🇪" },
  french: { code: "fr", name: "French", speechCode: "fr-FR", flag: "🇫🇷" },
  spanish: { code: "es", name: "Spanish", speechCode: "es-ES", flag: "🇪🇸" },
  italian: { code: "it", name: "Italian", speechCode: "it-IT", flag: "🇮🇹" },
  dutch: { code: "nl", name: "Dutch", speechCode: "nl-NL", flag: "🇳🇱" },
  portuguese: { code: "pt", name: "Portuguese", speechCode: "pt-PT", flag: "🇵🇹" },
  english: { code: "en", name: "English", speechCode: "en-US", flag: "🇺🇸" },
  latin: { code: "la", name: "Latin", speechCode: "la-VA", flag: "🏛️" }, // For testing - no voice available
};

/**
 * Default language settings
 */
export const DEFAULT_SOURCE_LANGUAGE = "norwegian";
export const TARGET_LANGUAGE = "en";

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

  [`${APP_ID}_decks`]: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      owner: { type: "string", required: true },
      isPublic: { type: "boolean", default: false },
      language: { type: "string", default: "norwegian" }, // Key from SUPPORTED_LANGUAGES
      cardCount: { type: "number", default: 0 },
      masteredCount: { type: "number", default: 0 },
      tags: { type: "array", items: { type: "string" } },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"], ["isPublic"]],
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
    indexes: [["deckId"], ["owner"]],
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  [`${APP_ID}_documents`]: {
    fields: {
      title: { type: "string", required: true },
      content: { type: "string", required: true },
      sourceLanguage: { type: "string", required: true },
      sourceType: {
        type: "enum",
        values: ["text", "pdf"],
        default: "text",
      },
      wordCount: { type: "number", default: 0 },
      owner: { type: "string", required: true },
      isPublic: { type: "boolean", default: false },
      lastReadPosition: { type: "number", default: 0 },
      linkedDeckId: { type: "string" }, // Deck to add vocabulary cards to
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"], ["owner", "createdAt"], ["isPublic"]],
    rules: {
      read: "auth != null && (auth.uid == resource.data.owner || resource.data.isPublic == true)",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  [`${APP_ID}_vocabulary`]: {
    fields: {
      word: { type: "string", required: true },
      translation: { type: "string", required: true },
      sourceLanguage: { type: "string", required: true },
      owner: { type: "string", required: true },
      lookupCount: { type: "number", default: 1 },
      masteryLevel: { type: "number", default: 0 },
      correctCount: { type: "number", default: 0 },
      incorrectCount: { type: "number", default: 0 },
      lastReviewedAt: { type: "timestamp" },
      nextReviewAt: { type: "timestamp" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"], ["owner", "nextReviewAt"]],
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  // Scenarios - Reusable conversation templates (can be shared, language-independent)
  [`${APP_ID}_scenarios`]: {
    fields: {
      title: { type: "string", required: true }, // e.g., "Purchasing Clothing"
      description: { type: "string" }, // Optional context/instructions
      questions: { type: "array", items: { type: "string" } }, // Questions for AI to explore
      systemPrompt: { type: "string" }, // Custom LLM system prompt
      owner: { type: "string", required: true },
      isPublic: { type: "boolean", default: false },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"], ["isPublic"]],
    rules: {
      read: "auth != null && (auth.uid == resource.data.owner || resource.data.isPublic == true)",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  // Conversations - Individual chat instances (always private)
  [`${APP_ID}_conversations`]: {
    fields: {
      scenarioId: { type: "string", required: true }, // Reference to scenario
      language: { type: "string", required: true }, // Language for this conversation
      owner: { type: "string", required: true },
      messageCount: { type: "number", default: 0 },
      lastMessageAt: { type: "timestamp" },
      linkedDeckId: { type: "string" }, // Optional linked vocabulary deck
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"], ["scenarioId", "owner"]],
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  // Messages - Chat messages within a conversation instance
  [`${APP_ID}_messages`]: {
    fields: {
      conversationId: { type: "string", required: true },
      role: { type: "enum", values: ["user", "assistant"], required: true },
      content: { type: "string", required: true },
      owner: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
    },
    indexes: [["conversationId"], ["conversationId", "createdAt"]],
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
      write: "auth != null && auth.uid == resource.data.owner",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  // User preferences - stores primary language and other user settings
  [`${APP_ID}_user_preferences`]: {
    fields: {
      primaryLanguage: { type: "string", required: true }, // Key from SUPPORTED_LANGUAGES
      owner: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"]],
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
