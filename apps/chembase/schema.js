/**
 * ChemBase - Learning Chemistry
 */

export const APP_ID = 'chembase';

export const collections = {
  progress: `${APP_ID}_progress`,
};

export const schema = {
  [`${APP_ID}_progress`]: {
    fields: {
      userId: { type: "string", required: true },
      masteredElements: { type: "array", items: { type: "number" } }, // atomic numbers
      lastActive: { type: "timestamp", auto: true },
    },
    rules: {
      read: "auth != null && auth.uid == resource.data.userId",
      write: "auth != null && auth.uid == resource.data.userId",
      create: "auth != null && request.resource.data.userId == auth.uid",
      delete: "false",
    },
  },
};

