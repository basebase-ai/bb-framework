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
export const APP_ID = 'crm';

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

  // CRM-specific collections (automatically namespaced)
  organizations: `${APP_ID}_organizations`,
  members: `${APP_ID}_members`,  // Document ID format: {orgId}_{email}
  leads: `${APP_ID}_leads`,
  contacts: `${APP_ID}_contacts`,
  accounts: `${APP_ID}_accounts`,
  opportunities: `${APP_ID}_opportunities`,
  activities: `${APP_ID}_activities`,
  notes: `${APP_ID}_notes`,
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

  // CRM Organizations
  organizations: {
    fields: {
      name: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", required: true }, // userId of creator/owner
    },
    indexes: [
      ["createdBy", "createdAt"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // CRM Members - Document ID format: {orgId}_{email}
  members: {
    fields: {
      orgId: { type: "string", required: true },
      email: { type: "string", required: true },
      userId: { type: "string" },  // null until user signs in
      role: { type: "enum", values: ["owner", "member"], default: "member" },
      status: { type: "enum", values: ["invited", "active"], default: "invited" },
      invitedAt: { type: "timestamp", auto: true },
      invitedBy: { type: "string", required: true },
      joinedAt: { type: "timestamp" },  // set when status becomes active
    },
    indexes: [
      ["orgId"],
      ["userId"],
      ["email"],
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

  // CRM Collections
  leads: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
      email: { type: "string" },
      phone: { type: "string" },
      company: { type: "string" },
      title: { type: "string" },
      status: {
        type: "enum",
        values: ["new", "contacted", "qualified", "unqualified", "converted"],
        default: "new"
      },
      source: { type: "string" }, // e.g., "website", "referral", "cold-call"
      value: { type: "number" }, // Estimated deal value
      owner: { type: "string", required: true }, // User ID
      assignedTo: { type: "string" }, // User ID
      notes: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["orgId", "createdAt"],
      ["orgId", "status"],
      ["owner", "createdAt"],
      ["status", "updatedAt"],
      ["assignedTo", "status"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  contacts: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
      email: { type: "string" },
      phone: { type: "string" },
      mobile: { type: "string" },
      title: { type: "string" },
      accountId: { type: "string" }, // Reference to account
      owner: { type: "string", required: true },
      assignedTo: { type: "string" },
      notes: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["orgId", "createdAt"],
      ["owner", "createdAt"],
      ["accountId", "updatedAt"],
      ["assignedTo", "createdAt"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  accounts: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      name: { type: "string", required: true },
      website: { type: "string" },
      industry: { type: "string" },
      phone: { type: "string" },
      address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      country: { type: "string" },
      zipCode: { type: "string" },
      owner: { type: "string", required: true },
      assignedTo: { type: "string" },
      notes: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["orgId", "createdAt"],
      ["owner", "createdAt"],
      ["assignedTo", "updatedAt"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  opportunities: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      name: { type: "string", required: true },
      accountId: { type: "string" },
      contactId: { type: "string" },
      stage: {
        type: "enum",
        values: ["prospecting", "qualification", "proposal", "negotiation", "closed-won", "closed-lost"],
        default: "prospecting"
      },
      amount: { type: "number", required: true },
      probability: { type: "number" }, // 0-100
      closeDate: { type: "timestamp" },
      owner: { type: "string", required: true },
      assignedTo: { type: "string" },
      notes: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["orgId", "createdAt"],
      ["orgId", "stage"],
      ["owner", "createdAt"],
      ["stage", "closeDate"],
      ["assignedTo", "stage"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  activities: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      type: {
        type: "enum",
        values: ["call", "email", "meeting", "task", "note"],
        required: true
      },
      subject: { type: "string", required: true },
      description: { type: "string" },
      relatedTo: { type: "string" }, // ID of related record
      relatedType: { type: "string" }, // "lead", "contact", "account", "opportunity"
      status: {
        type: "enum",
        values: ["planned", "completed", "cancelled"],
        default: "planned"
      },
      dueDate: { type: "timestamp" },
      completedAt: { type: "timestamp" },
      owner: { type: "string", required: true },
      assignedTo: { type: "string" },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["orgId", "createdAt"],
      ["owner", "dueDate"],
      ["assignedTo", "status"],
      ["relatedTo", "createdAt"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
    },
  },

  notes: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      content: { type: "string", required: true },
      relatedTo: { type: "string" }, // ID of related record
      relatedType: { type: "string" }, // "lead", "contact", "account", "opportunity"
      owner: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },
    indexes: [
      ["orgId", "createdAt"],
      ["owner", "createdAt"],
      ["relatedTo", "createdAt"],
    ],
    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null && request.resource.data.owner == auth.uid",
      delete: "auth != null && auth.uid == resource.data.owner",
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
