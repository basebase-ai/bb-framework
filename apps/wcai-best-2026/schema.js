/**
 * Schema for WCAI Best Practices 2026 - Email signup for document delivery
 */

export const APP_ID = 'wcai-best-2026';

export const collections = {
  apps: "apps",
  users: "users",
  signups: `${APP_ID}_signups_writeonly`,
};

export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

export const schema = {
  apps: {
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      logoURL: { type: "string" },
      owner: { type: "string", required: true },
      collaborators: { type: "array", items: { type: "string" } },
      status: { type: "enum", values: ["draft", "active", "archived"], default: "draft" },
      version: { type: "string" },
      position: { type: "map" },
      order: { type: "number" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", auto: true },
      updatedBy: { type: "string", auto: true },
    },
    indexes: [["owner", "createdAt"], ["status", "updatedAt"]],
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

  [`${APP_ID}_signups_writeonly`]: {
    fields: {
      email: { type: "string", required: true },
      optIn: { type: "boolean", default: false },
      source: { type: "string" },         // e.g. "oakland" or "la"
      createdAt: { type: "timestamp", auto: true },
    },
    indexes: [["email"], ["createdAt"]],
    rules: {
      // Write-only: no client reads (use Firebase Console or Admin SDK)
      read: "false",
      // No updates after submission
      write: "false",
      // Anyone can submit their email, no auth required
      create: "true",
      // No deletions
      delete: "false",
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

export function generateRules(schemaObj) {
  let rules = 'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';
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
