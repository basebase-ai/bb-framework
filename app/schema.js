/**
 * Define your Firestore collections and their structure
 */

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
      // Users can only read apps they own or are collaborators on
      read: "auth != null && (auth.uid == resource.data.owner || auth.uid in resource.data.get('collaborators', []))",
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
};

// Generate Firestore rules from schema
export function generateRules(schema) {
  let rules =
    'rules_version = "2";\nservice cloud.firestore {\n  match /databases/{database}/documents {\n';

  Object.entries(schema).forEach(([collectionName, config]) => {
    rules += `\n    match /${collectionName}/{doc} {\n`;
    rules += `      allow read: if ${config.rules.read};\n`;
    rules += `      allow write: if ${config.rules.write};\n`;
    rules += `      allow create: if ${config.rules.create};\n`;
    rules += `      allow delete: if ${config.rules.delete};\n`;
    rules += "    }\n";
  });

  rules += "  }\n}";
  return rules;
}
