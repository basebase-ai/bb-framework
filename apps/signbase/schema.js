/**
 * SignBase - Document Signing Application Schema
 *
 * Collections:
 * - documents: PDF documents uploaded by users
 * - signatures: Signature records for documents
 */

// Your app's unique identifier
export const APP_ID = "signbase";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections
  documents: `${APP_ID}_documents`,
  signatures: `${APP_ID}_signatures`,
};

/**
 * Helper function to create a namespaced collection name
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
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

  [`${APP_ID}_documents`]: {
    fields: {
      // Document metadata
      name: { type: "string", required: true }, // Original filename
      title: { type: "string" }, // User-defined title
      description: { type: "string" },

      // File storage info
      fileUrl: { type: "string", required: true }, // Firebase Storage URL
      filePath: { type: "string", required: true }, // Storage path for deletion
      fileSize: { type: "number" }, // File size in bytes
      mimeType: { type: "string" }, // application/pdf
      pageCount: { type: "number" }, // Number of pages (if known)

      // LLM-generated summary
      summary: { type: "string" }, // AI-generated document summary
      summaryGeneratedAt: { type: "timestamp" }, // When summary was generated

      // Ownership & access
      owner: { type: "string", required: true }, // Firebase Auth UID of uploader

      // Signers - array of {email, userId (if known), status}
      signers: { type: "array", items: { type: "map" }, default: [] },

      // Status tracking
      status: {
        type: "enum",
        values: ["draft", "pending", "completed", "cancelled"],
        default: "draft",
      },

      // Timestamps
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
      completedAt: { type: "timestamp" }, // When all signatures collected
    },

    indexes: [
      ["owner", "createdAt"],
      ["status", "createdAt"],
    ],

    rules: {
      // Users can read documents they own or are invited to sign
      read: "auth != null",
      // Only owner can update document metadata
      write: "auth != null && auth.uid == resource.data.owner",
      // Authenticated users can create documents
      create: "auth != null && request.resource.data.owner == auth.uid",
      // Only owner can delete
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  [`${APP_ID}_signatures`]: {
    fields: {
      // References
      documentId: { type: "string", required: true }, // Reference to document

      // Signer info
      signerId: { type: "string", required: true }, // Firebase Auth UID
      signerEmail: { type: "string", required: true }, // Email at time of signing
      signerName: { type: "string", required: true }, // Typed signature name

      // Signature data
      signatureText: { type: "string", required: true }, // The actual typed signature
      signedAt: { type: "timestamp", required: true },

      // Location data (captured at signing time)
      location: {
        type: "map",
        fields: {
          latitude: { type: "number" },
          longitude: { type: "number" },
          accuracy: { type: "number" }, // meters
          city: { type: "string" },
          region: { type: "string" },
          country: { type: "string" },
        },
      },

      // Additional metadata
      ipAddress: { type: "string" }, // For audit trail
      userAgent: { type: "string" }, // Browser info for audit

      // Timestamps
      createdAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["documentId", "signerId"],
      ["signerId", "createdAt"],
      ["documentId", "createdAt"],
    ],

    rules: {
      // Users can read signatures on documents they have access to
      read: "auth != null",
      // Only the signer can create their signature
      write: "auth != null && auth.uid == resource.data.signerId",
      create: "auth != null && request.resource.data.signerId == auth.uid",
      // Signatures cannot be deleted (legal requirement)
      delete: "false",
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
