#!/usr/bin/env node
/**
 * Cleanup script to delete unpublished draft apps older than 30 minutes
 *
 * Deletes apps where:
 * - currentVersion is null (never published)
 * - updatedAt is older than 30 minutes
 *
 * Usage: node scripts/cleanup-drafts.js [--dry-run]
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(
  __dirname,
  "..",
  "vibe-together-d2159-firebase-adminsdk-fbsvc-920807cb5c.json"
);

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const DRY_RUN = process.argv.includes("--dry-run");
const MINUTES_OLD = 30;

async function main() {
  console.log(
    `\n🧹 Cleanup: Finding unpublished apps older than ${MINUTES_OLD} minutes\n`
  );

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN - No apps will be deleted\n");
  }

  const cutoffTime = new Date(Date.now() - MINUTES_OLD * 60 * 1000);
  console.log(`Cutoff time: ${cutoffTime.toISOString()}\n`);

  // Query apps with no published version
  const appsRef = db.collection("apps");
  const snapshot = await appsRef.where("currentVersion", "==", null).get();

  if (snapshot.empty) {
    console.log("✅ No unpublished apps found");
    return;
  }

  console.log(`Found ${snapshot.size} unpublished app(s)\n`);

  /** @type {Array<{id: string, name: string, owner: string, updatedAt: Date}>} */
  const toDelete = [];
  /** @type {Array<{id: string, name: string, owner: string, updatedAt: Date}>} */
  const toKeep = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updatedAt =
      data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(0);

    const appInfo = {
      id: doc.id,
      name: data.name || doc.id,
      owner: data.owner || "unknown",
      updatedAt,
    };

    if (updatedAt < cutoffTime) {
      toDelete.push(appInfo);
    } else {
      toKeep.push(appInfo);
    }
  }

  // Show apps to keep (recent)
  if (toKeep.length > 0) {
    console.log(`📝 Keeping ${toKeep.length} recent app(s):`);
    for (const app of toKeep) {
      const age = Math.round((Date.now() - app.updatedAt.getTime()) / 60000);
      console.log(`   - ${app.id} (${age} min ago)`);
    }
    console.log();
  }

  // Show and delete old apps
  if (toDelete.length === 0) {
    console.log("✅ No apps old enough to delete");
    return;
  }

  console.log(
    `🗑️  ${DRY_RUN ? "Would delete" : "Deleting"} ${toDelete.length} app(s):\n`
  );

  for (const app of toDelete) {
    const age = Math.round((Date.now() - app.updatedAt.getTime()) / 60000);
    console.log(`   ${app.id}`);
    console.log(`      Name: ${app.name}`);
    console.log(`      Age: ${age} minutes`);
    console.log(`      Owner: ${app.owner}`);

    if (!DRY_RUN) {
      try {
        // Delete drafts subcollection
        const draftsRef = db
          .collection("apps")
          .doc(app.id)
          .collection("drafts");
        const draftsSnap = await draftsRef.get();
        for (const draft of draftsSnap.docs) {
          await draft.ref.delete();
        }

        // Delete the app document
        await db.collection("apps").doc(app.id).delete();
        console.log(`      ✅ Deleted\n`);
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}\n`);
      }
    } else {
      console.log(`      (dry run - not deleted)\n`);
    }
  }

  console.log(
    `\n✨ Done! ${DRY_RUN ? "Would have deleted" : "Deleted"} ${
      toDelete.length
    } app(s)`
  );
}

main().catch(console.error);
