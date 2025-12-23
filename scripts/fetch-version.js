#!/usr/bin/env node
/**
 * Debug script to check the latest published version of an app in Firestore
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

const appId = process.argv[2] || "starter-app";

async function main() {
  console.log(`\n🔍 Checking latest version for app: ${appId}\n`);

  // First get the app document to find currentVersion
  const appRef = db.collection("apps").doc(appId);
  const appSnap = await appRef.get();

  if (!appSnap.exists) {
    console.log("❌ App not found at /apps/" + appId);
    process.exit(1);
  }

  const appData = appSnap.data();
  console.log("--- App Document ---");
  console.log({
    name: appData.name,
    owner: appData.owner,
    accessMode: appData.accessMode,
    currentVersion: appData.currentVersion,
    createdAt: appData.createdAt,
    updatedAt: appData.updatedAt,
  });

  const versionHash = appData.currentVersion;
  if (!versionHash) {
    console.log("\n❌ No currentVersion set - app has not been published");
    process.exit(1);
  }

  // Fetch the version document
  const versionRef = appRef.collection("versions").doc(versionHash);
  const versionSnap = await versionRef.get();

  if (!versionSnap.exists) {
    console.log(`\n❌ Version document not found at /apps/${appId}/versions/${versionHash}`);
    process.exit(1);
  }

  const versionData = versionSnap.data();

  console.log("\n--- Version Metadata ---");
  console.log({
    versionHash,
    committedAt: versionData.committedAt,
    committedBy: versionData.committedBy,
    message: versionData.message,
  });

  console.log("\n--- Source Files ---");
  for (const [name, content] of Object.entries(versionData.source || {})) {
    console.log(
      `\n📄 ${name} (${content.length} chars, ${content.split("\n").length} lines)`
    );
    // Show full content for app.jsx, first 500 for others
    if (name === "app.jsx") {
      console.log(content);
    } else {
      console.log(
        content.substring(0, 500) + (content.length > 500 ? "\n..." : "")
      );
    }
  }

  console.log("\n--- Compiled Files ---");
  for (const [name, content] of Object.entries(versionData.compiled || {})) {
    console.log(`📦 ${name} (${content.length} chars)`);
  }
}

main().catch(console.error);
