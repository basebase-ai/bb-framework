/**
 * Schema for Basebase waitlist landing page
 */

export const APP_ID = 'www';

export const collections = {
  // Global collections (no namespace needed - platform-managed)
  apps: "apps",
  users: "users",

  // Waitlist collection
  waitlist: `${APP_ID}_waitlist`,
};

/**
 * Helper function to create a namespaced collection name
 */
export function getCollection(name) {
  return `${APP_ID}_${name}`;
}

export const schema = {
  [`${APP_ID}_waitlist`]: {
    fields: {
      email: { type: "string", required: true },
      createdAt: { type: "timestamp", auto: true },
    },

    indexes: [["email"], ["createdAt"]],

    rules: {
      read: "false",
      write: "true",
      create: "true",
      delete: "false",
    },
  },
};
