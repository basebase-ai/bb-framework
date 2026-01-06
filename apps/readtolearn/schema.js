/**
 * ReadToLearn App - Schema Definition
 *
 * Collections:
 * - documents: Imported documents with extracted text
 * - translations: Cached word translations for performance
 */

// Your app's unique identifier
export const APP_ID = 'readtolearn';

/**
 * Namespaced collection names
 * @type {{ apps: string, users: string, documents: string, vocabulary: string }}
 */
export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections (automatically namespaced)
  documents: `${APP_ID}_documents`,
  vocabulary: `${APP_ID}_vocabulary`,
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
 * Supported source languages
 * @type {Record<string, { code: string, name: string, speechCode: string }>}
 */
export const SUPPORTED_LANGUAGES = {
  norwegian: { code: "no", name: "Norwegian", speechCode: "nb-NO" },
  swedish: { code: "sv", name: "Swedish", speechCode: "sv-SE" },
  danish: { code: "da", name: "Danish", speechCode: "da-DK" },
  german: { code: "de", name: "German", speechCode: "de-DE" },
  french: { code: "fr", name: "French", speechCode: "fr-FR" },
  spanish: { code: "es", name: "Spanish", speechCode: "es-ES" },
  italian: { code: "it", name: "Italian", speechCode: "it-IT" },
  dutch: { code: "nl", name: "Dutch", speechCode: "nl-NL" },
  portuguese: { code: "pt", name: "Portuguese", speechCode: "pt-PT" },
  english: { code: "en", name: "English", speechCode: "en-US" },
};

/**
 * Default language settings
 */
export const DEFAULT_SOURCE_LANGUAGE = "norwegian";
export const TARGET_LANGUAGE = "en"; // Always translate to English

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
      lastReadPosition: { type: "number", default: 0 },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [["owner"], ["owner", "createdAt"]],
    rules: {
      read: "auth != null && auth.uid == resource.data.owner",
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
      // Spaced repetition fields
      masteryLevel: { type: "number", default: 0 }, // 0-5 (like Leitner boxes)
      correctCount: { type: "number", default: 0 },
      incorrectCount: { type: "number", default: 0 },
      lastReviewedAt: { type: "timestamp" },
      nextReviewAt: { type: "timestamp" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["owner"],
      ["owner", "nextReviewAt"],
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


