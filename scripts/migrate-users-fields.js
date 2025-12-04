#!/usr/bin/env node

/**
 * Migration Script: Normalize user document fields
 *
 * This script migrates existing user documents by:
 * 1. Renaming old field names to new ones (display-name -> displayName, etc.)
 * 2. Ensuring timestamps are Firestore Timestamp objects
 * 3. Normalizing phone numbers to standard format (+1234567890)
 * 4. Removing any fields not in the allowed list
 *
 * Allowed fields:
 *   - id, displayName, photoURL, bio, globalAdmin, email, phone, createdAt, updatedAt
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/migrate-users-fields.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without actually updating documents
 *
 * Note: Requires Firebase Admin SDK with a service account that has Firestore write access.
 */

import admin from "firebase-admin";
import chalk from "chalk";

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

// Initialize Firebase Admin
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    chalk.red(
      "❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set"
    )
  );
  console.log("\nUsage:");
  console.log(
    "  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/migrate-users-fields.js [--dry-run]"
  );
  console.log("\nTo get a service account key:");
  console.log(
    "  1. Go to Firebase Console -> Project Settings -> Service Accounts"
  );
  console.log('  2. Click "Generate new private key"');
  console.log("  3. Save the JSON file and set the env variable to its path");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

/** @type {readonly string[]} */
const ALLOWED_FIELDS = Object.freeze([
  "id",
  "displayName",
  "photoURL",
  "bio",
  "globalAdmin",
  "email",
  "phone",
  "createdAt",
  "updatedAt",
]);

/** @type {Readonly<Record<string, string>>} */
const FIELD_RENAMES = Object.freeze({
  "display-name": "displayName",
  "profile-photo-url": "photoURL",
  "global-admin": "globalAdmin",
  "created-at": "createdAt",
  "updated-at": "updatedAt",
});

/**
 * Normalize phone number to standard format: +<digits>
 * @param {string | null | undefined} phone
 * @returns {string | null}
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  // Remove all non-digit characters except leading +
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 0) {
    return null;
  }

  // If no + prefix and 10 digits, assume US number
  if (!hasPlus && digits.length === 10) {
    return `+1${digits}`;
  }

  // If no + prefix and 11 digits starting with 1, assume US number with country code
  if (!hasPlus && digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Convert a value to Firestore Timestamp if it's a date-like value
 * @param {unknown} value
 * @returns {admin.firestore.Timestamp | null}
 */
function toTimestamp(value) {
  if (!value) {
    return null;
  }

  // Already a Firestore Timestamp
  if (value instanceof admin.firestore.Timestamp) {
    return value;
  }

  // Firestore Timestamp-like object (from snapshot data)
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    "_nanoseconds" in value
  ) {
    const obj = /** @type {{ _seconds: number; _nanoseconds: number }} */ (
      value
    );
    return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds);
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    "nanoseconds" in value
  ) {
    const obj = /** @type {{ seconds: number; nanoseconds: number }} */ (value);
    return new admin.firestore.Timestamp(obj.seconds, obj.nanoseconds);
  }

  // Date object
  if (value instanceof Date) {
    return admin.firestore.Timestamp.fromDate(value);
  }

  // ISO string or timestamp number
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return admin.firestore.Timestamp.fromDate(date);
    }
  }

  return null;
}

/**
 * @typedef {Object} UserMigration
 * @property {string} id
 * @property {Record<string, unknown>} originalData
 * @property {Record<string, unknown>} updates
 * @property {string[]} fieldsToDelete
 * @property {string[]} changes
 */

/**
 * Analyze a user document and determine what changes are needed
 * @param {string} docId
 * @param {Record<string, unknown>} data
 * @returns {UserMigration | null}
 */
function analyzeUser(docId, data) {
  /** @type {Record<string, unknown>} */
  const updates = {};
  /** @type {string[]} */
  const fieldsToDelete = [];
  /** @type {string[]} */
  const changes = [];

  // Step 1: Handle field renames
  for (const [oldName, newName] of Object.entries(FIELD_RENAMES)) {
    if (oldName in data && !(newName in data)) {
      updates[newName] = data[oldName];
      fieldsToDelete.push(oldName);
      changes.push(`Rename: ${oldName} -> ${newName}`);
    } else if (oldName in data && newName in data) {
      // Old field exists but new field also exists - just delete old
      fieldsToDelete.push(oldName);
      changes.push(`Delete duplicate old field: ${oldName}`);
    }
  }

  // Step 2: Normalize timestamps
  const createdAtSource = updates["createdAt"] ?? data["createdAt"];
  const updatedAtSource = updates["updatedAt"] ?? data["updatedAt"];

  if (createdAtSource) {
    const ts = toTimestamp(createdAtSource);
    if (ts) {
      const current = data["createdAt"];
      const isAlreadyTimestamp =
        current instanceof admin.firestore.Timestamp ||
        (typeof current === "object" &&
          current !== null &&
          ("seconds" in current || "_seconds" in current));

      if (!isAlreadyTimestamp) {
        updates["createdAt"] = ts;
        changes.push(`Convert createdAt to Timestamp`);
      } else if (updates["createdAt"]) {
        // Was renamed, ensure it's a timestamp
        updates["createdAt"] = ts;
      }
    }
  }

  if (updatedAtSource) {
    const ts = toTimestamp(updatedAtSource);
    if (ts) {
      const current = data["updatedAt"];
      const isAlreadyTimestamp =
        current instanceof admin.firestore.Timestamp ||
        (typeof current === "object" &&
          current !== null &&
          ("seconds" in current || "_seconds" in current));

      if (!isAlreadyTimestamp) {
        updates["updatedAt"] = ts;
        changes.push(`Convert updatedAt to Timestamp`);
      } else if (updates["updatedAt"]) {
        // Was renamed, ensure it's a timestamp
        updates["updatedAt"] = ts;
      }
    }
  }

  // Step 3: Normalize phone
  const phoneValue = data["phone"];
  if (phoneValue && typeof phoneValue === "string") {
    const normalized = normalizePhone(phoneValue);
    if (normalized && normalized !== phoneValue) {
      updates["phone"] = normalized;
      changes.push(`Normalize phone: "${phoneValue}" -> "${normalized}"`);
    } else if (!normalized) {
      fieldsToDelete.push("phone");
      changes.push(`Remove invalid phone: "${phoneValue}"`);
    }
  }

  // Step 4: Find fields to remove (not in allowed list)
  const allCurrentFields = new Set([
    ...Object.keys(data),
    ...Object.keys(updates),
  ]);
  for (const field of allCurrentFields) {
    if (!ALLOWED_FIELDS.includes(field) && !fieldsToDelete.includes(field)) {
      fieldsToDelete.push(field);
      changes.push(`Remove disallowed field: ${field}`);
    }
  }

  // Remove fields that are being updated from delete list
  const finalFieldsToDelete = fieldsToDelete.filter((f) => !(f in updates));

  if (Object.keys(updates).length === 0 && finalFieldsToDelete.length === 0) {
    return null; // No changes needed
  }

  return {
    id: docId,
    originalData: data,
    updates,
    fieldsToDelete: finalFieldsToDelete,
    changes,
  };
}

async function migrateUsers() {
  console.log(chalk.bold("\n🔄 User Fields Migration Script (Admin SDK)\n"));

  if (dryRun) {
    console.log(chalk.yellow("⚠️  DRY RUN MODE - No changes will be made\n"));
  }

  console.log("Field renames:");
  for (const [oldName, newName] of Object.entries(FIELD_RENAMES)) {
    console.log(`  ${chalk.red(oldName)} -> ${chalk.green(newName)}`);
  }
  console.log(`\nAllowed fields: ${chalk.cyan(ALLOWED_FIELDS.join(", "))}\n`);

  try {
    // Query all users
    console.log("📊 Querying users...");
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("✅ No users found in collection");
      return;
    }

    console.log(`📦 Found ${usersSnapshot.size} total users\n`);

    // Analyze all users
    /** @type {UserMigration[]} */
    const usersToMigrate = [];

    for (const docSnap of usersSnapshot.docs) {
      const data = /** @type {Record<string, unknown>} */ (docSnap.data());
      const migration = analyzeUser(docSnap.id, data);
      if (migration) {
        usersToMigrate.push(migration);
      }
    }

    console.log(
      `🎯 Found ${usersToMigrate.length} users that need migration\n`
    );

    if (usersToMigrate.length === 0) {
      console.log("✅ All users are already normalized. Migration complete!");
      return;
    }

    // Show details of changes
    console.log(chalk.bold("📋 Changes to be made:\n"));
    for (const user of usersToMigrate) {
      console.log(`  ${chalk.cyan(user.id)}:`);
      for (const change of user.changes) {
        console.log(`    • ${change}`);
      }
      console.log();
    }

    if (dryRun) {
      console.log(chalk.yellow("\n⚠️  DRY RUN - No changes were made"));
      console.log("Run without --dry-run to apply changes");
      return;
    }

    console.log(`\n⚠️  Updating ${usersToMigrate.length} user documents...\n`);
    console.log("🚀 Starting migration...\n");

    // Migrate in batches of 500 (Firestore batch limit)
    const BATCH_SIZE = 500;
    let successCount = 0;
    let errorCount = 0;
    /** @type {{ userId: string; error: string }[]} */
    const errors = [];

    for (let i = 0; i < usersToMigrate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchUsers = usersToMigrate.slice(i, i + BATCH_SIZE);

      console.log(
        `📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${
          batchUsers.length
        } users)...`
      );

      for (const user of batchUsers) {
        try {
          const docRef = db.collection("users").doc(user.id);

          // Build the update object
          /** @type {Record<string, unknown>} */
          const updateData = { ...user.updates };

          // Add field deletions
          for (const field of user.fieldsToDelete) {
            updateData[field] = admin.firestore.FieldValue.delete();
          }

          batch.update(docRef, updateData);
          successCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorCount++;
          errors.push({
            userId: user.id,
            error: errorMessage,
          });
          console.error(
            `  ❌ Error processing user ${user.id}: ${errorMessage}`
          );
        }
      }

      // Commit batch
      try {
        await batch.commit();
        console.log(`  ✅ Batch committed successfully`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error committing batch: ${errorMessage}`);
        errorCount += batchUsers.length;
        successCount -= batchUsers.length;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed: ${errorCount} users`);

    if (errors.length > 0) {
      console.log("\n❌ Errors:");
      errors.forEach((err, index) => {
        console.log(`  ${index + 1}. User ${err.userId}: ${err.error}`);
      });
    }

    console.log("\n✨ Migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
migrateUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
