/**
 * Migration script: todo-app → projectbase
 *
 * Usage:
 *   1. Download service account key from Firebase Console:
 *      Project Settings → Service Accounts → Generate New Private Key
 *   2. Save it as `service-account.json` in this directory
 *   3. Run: node migrate-collections.js
 *   4. (Optional) Run with --dry-run first to preview
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";

// Configuration
const OLD_PREFIX = "todo-app";
const NEW_PREFIX = "projectbase";
const COLLECTIONS_TO_MIGRATE = ["todo-items", "projects", "comments"];
const BATCH_SIZE = 400; // Keep under 500 limit for safety

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

async function main() {
  // Check for service account
  const serviceAccountPath =
    "./vibe-together-d2159-firebase-adminsdk-fbsvc-920807cb5c.json";
  if (!existsSync(serviceAccountPath)) {
    console.error("❌ Missing service-account.json");
    console.error("   Download from Firebase Console:");
    console.error(
      "   Project Settings → Service Accounts → Generate New Private Key"
    );
    process.exit(1);
  }

  /** @type {import('firebase-admin').ServiceAccount} */
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  // Initialize Firebase Admin
  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();

  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log(
    `  Firestore Collection Migration: ${OLD_PREFIX} → ${NEW_PREFIX}`
  );
  console.log("═══════════════════════════════════════════════════════");
  if (DRY_RUN) {
    console.log("  🔍 DRY RUN MODE - No changes will be made");
  }
  console.log("");

  /** @type {{ collection: string; copied: number; errors: number }[]} */
  const results = [];

  for (const collectionSuffix of COLLECTIONS_TO_MIGRATE) {
    const oldCollectionName = `${OLD_PREFIX}_${collectionSuffix}`;
    const newCollectionName = `${NEW_PREFIX}_${collectionSuffix}`;

    console.log(`📦 Migrating: ${oldCollectionName} → ${newCollectionName}`);

    const result = await migrateCollection(
      db,
      oldCollectionName,
      newCollectionName
    );
    results.push({ collection: collectionSuffix, ...result });

    console.log("");
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("═══════════════════════════════════════════════════════");

  let totalCopied = 0;
  let totalErrors = 0;

  for (const r of results) {
    const status = r.errors > 0 ? "⚠️" : "✅";
    console.log(
      `  ${status} ${r.collection}: ${r.copied} documents${
        r.errors > 0 ? ` (${r.errors} errors)` : ""
      }`
    );
    totalCopied += r.copied;
    totalErrors += r.errors;
  }

  console.log("───────────────────────────────────────────────────────");
  console.log(`  Total: ${totalCopied} documents migrated`);

  if (DRY_RUN) {
    console.log("");
    console.log("  Run without --dry-run to perform actual migration.");
  }

  if (totalErrors > 0) {
    console.log(`  ⚠️  ${totalErrors} errors occurred - check logs above`);
    process.exit(1);
  }

  console.log("");
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} oldCollectionName
 * @param {string} newCollectionName
 * @returns {Promise<{ copied: number; errors: number }>}
 */
async function migrateCollection(db, oldCollectionName, newCollectionName) {
  const oldCollection = db.collection(oldCollectionName);
  const newCollection = db.collection(newCollectionName);

  // Get all documents from old collection
  const snapshot = await oldCollection.get();

  if (snapshot.empty) {
    console.log(`   └─ No documents found in ${oldCollectionName}`);
    return { copied: 0, errors: 0 };
  }

  console.log(`   └─ Found ${snapshot.size} documents`);

  if (DRY_RUN) {
    // Just list first few doc IDs in dry run
    const previewDocs = snapshot.docs.slice(0, 5);
    for (const doc of previewDocs) {
      console.log(`      • ${doc.id}`);
    }
    if (snapshot.size > 5) {
      console.log(`      ... and ${snapshot.size - 5} more`);
    }
    return { copied: snapshot.size, errors: 0 };
  }

  let copied = 0;
  let errors = 0;

  // Process in batches
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchDocs = docs.slice(i, i + BATCH_SIZE);

    for (const doc of batchDocs) {
      const newDocRef = newCollection.doc(doc.id);
      batch.set(newDocRef, doc.data());
    }

    try {
      await batch.commit();
      copied += batchDocs.length;
      console.log(
        `   └─ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${
          batchDocs.length
        } documents processed`
      );
    } catch (err) {
      errors += batchDocs.length;
      console.error(
        `   └─ ❌ Batch failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { copied, errors };
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
