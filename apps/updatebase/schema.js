/**
 * UpdateBase Schema - Progress Updates for Startups (Multi-tenant)
 *
 * Collections:
 * - organizations: Startup/company accounts
 * - members: Team members who can manage an organization
 * - followers: App users who follow organizations
 * - updates: Main update posts with text, images, videos
 * - subscribers: Email list of external stakeholders/investors
 * - comments: Comments on updates
 * - emailLogs: Track sent emails for each update
 */

export const APP_ID = "updatebase";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (platform-managed)
  apps: "apps",
  users: "users",

  // App-specific collections
  organizations: `${APP_ID}_organizations`,
  members: `${APP_ID}_members`, // Document ID format: {orgId}_{email}
  followers: `${APP_ID}_followers`, // Document ID format: {orgId}_{userId}
  updates: `${APP_ID}_updates`,
  subscribers: `${APP_ID}_subscribers`,
  comments: `${APP_ID}_comments`,
  emailLogs: `${APP_ID}_email-logs`,
};

/**
 * Helper function to create a namespaced collection name
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

/**
 * Update visibility options
 */
export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public - Anyone can view" },
  { value: "subscribers", label: "Subscribers Only" },
  { value: "draft", label: "Draft - Only team" },
];

/**
 * Subscriber status options
 */
export const SUBSCRIBER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "bounced", label: "Bounced" },
];

/**
 * Team member role options
 */
export const MEMBER_ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

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

  // Organizations - Startup/company accounts
  [`${APP_ID}_organizations`]: {
    fields: {
      name: { type: "string", required: true },
      slug: { type: "string" }, // URL-friendly identifier
      description: { type: "string" },
      logoURL: { type: "string" },
      websiteURL: { type: "string" },
      // Stats
      followerCount: { type: "number", default: 0 },
      updateCount: { type: "number", default: 0 },
      subscriberCount: { type: "number", default: 0 },
      // Timestamps
      createdAt: { type: "timestamp", auto: true },
      createdBy: { type: "string", required: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [["createdBy", "createdAt"], ["slug"]],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Members - Team members who can manage an organization
  // Document ID format: {orgId}_{email}
  [`${APP_ID}_members`]: {
    fields: {
      orgId: { type: "string", required: true },
      email: { type: "string", required: true },
      userId: { type: "string" }, // null until user signs in
      displayName: { type: "string" },
      photoURL: { type: "string" },
      role: {
        type: "enum",
        values: ["owner", "admin", "member"],
        default: "member",
      },
      status: {
        type: "enum",
        values: ["invited", "active"],
        default: "invited",
      },
      invitedAt: { type: "timestamp", auto: true },
      invitedBy: { type: "string", required: true },
      joinedAt: { type: "timestamp" },
    },

    indexes: [["orgId", "status"], ["email"], ["userId"]],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Followers - App users who follow organizations
  // Document ID format: {orgId}_{userId}
  [`${APP_ID}_followers`]: {
    fields: {
      orgId: { type: "string", required: true },
      userId: { type: "string", required: true },
      followedAt: { type: "timestamp", auto: true },
    },

    indexes: [["orgId"], ["userId"]],

    rules: {
      read: "auth != null",
      write: "auth != null && auth.uid == resource.data.userId",
      create: "auth != null && request.resource.data.userId == auth.uid",
      delete: "auth != null && auth.uid == resource.data.userId",
    },
  },

  // Main updates collection - scoped to organization
  [`${APP_ID}_updates`]: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      title: { type: "string", required: true },
      content: { type: "string", required: true },
      excerpt: { type: "string" },
      authorId: { type: "string", required: true }, // Who posted it
      visibility: {
        type: "enum",
        values: ["public", "subscribers", "draft"],
        default: "draft",
      },
      // Media attachments
      media: {
        type: "array",
        items: {
          type: "map",
          fields: {
            type: { type: "string" },
            url: { type: "string" },
            thumbnailUrl: { type: "string" },
            name: { type: "string" },
            path: { type: "string" },
            size: { type: "number" },
            mimeType: { type: "string" },
          },
        },
        default: [],
      },
      // Stats
      commentCount: { type: "number", default: 0 },
      viewCount: { type: "number", default: 0 },
      // Email tracking
      emailSent: { type: "boolean", default: false },
      emailSentAt: { type: "timestamp", nullable: true },
      emailRecipientCount: { type: "number", default: 0 },
      // Timestamps
      publishedAt: { type: "timestamp", nullable: true },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["orgId", "createdAt"],
      ["orgId", "visibility", "publishedAt"],
      ["authorId", "createdAt"],
    ],

    rules: {
      read: "auth != null || resource.data.visibility == 'public'",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Subscribers collection - email list scoped to organization
  [`${APP_ID}_subscribers`]: {
    fields: {
      orgId: { type: "string", required: true }, // Organization scope
      email: { type: "string", required: true },
      name: { type: "string" },
      company: { type: "string" },
      role: { type: "string" },
      notes: { type: "string" },
      status: {
        type: "enum",
        values: ["active", "unsubscribed", "bounced"],
        default: "active",
      },
      // Tracking
      lastEmailedAt: { type: "timestamp", nullable: true },
      emailsSent: { type: "number", default: 0 },
      // Subscription management
      subscribedAt: { type: "timestamp", auto: true },
      unsubscribedAt: { type: "timestamp", nullable: true },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["orgId", "status"],
      ["orgId", "email"],
    ],

    rules: {
      read: "auth != null",
      write: "auth != null",
      create: "auth != null",
      delete: "auth != null",
    },
  },

  // Comments collection - scoped to updates
  [`${APP_ID}_comments`]: {
    fields: {
      orgId: { type: "string", required: true }, // For querying
      updateId: { type: "string", required: true },
      authorId: { type: "string", required: true },
      authorName: { type: "string" },
      authorEmail: { type: "string" },
      authorPhotoURL: { type: "string" },
      content: { type: "string", required: true },
      parentId: { type: "string", nullable: true },
      replyCount: { type: "number", default: 0 },
      isApproved: { type: "boolean", default: true },
      isHidden: { type: "boolean", default: false },
      createdAt: { type: "timestamp", auto: true },
      updatedAt: { type: "timestamp", auto: true },
    },

    indexes: [
      ["updateId", "createdAt"],
      ["orgId", "createdAt"],
      ["authorId", "createdAt"],
    ],

    rules: {
      read: "auth != null",
      write: "auth != null && auth.uid == resource.data.authorId",
      create: "auth != null && request.resource.data.authorId == auth.uid",
      delete: "auth != null && auth.uid == resource.data.authorId",
    },
  },

  // Email logs collection
  [`${APP_ID}_email-logs`]: {
    fields: {
      orgId: { type: "string", required: true },
      updateId: { type: "string", required: true },
      recipientCount: { type: "number", required: true },
      recipients: { type: "array", items: { type: "string" } },
      subject: { type: "string", required: true },
      status: {
        type: "enum",
        values: ["pending", "sending", "sent", "failed"],
        default: "pending",
      },
      error: { type: "string", nullable: true },
      sentAt: { type: "timestamp", nullable: true },
      sentBy: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
    },

    indexes: [["orgId", "createdAt"], ["updateId"]],

    rules: {
      read: "auth != null",
      write: "auth != null",
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
