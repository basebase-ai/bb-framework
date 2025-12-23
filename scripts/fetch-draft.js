#!/usr/bin/env node
/**
 * Debug script to check draft document in Firestore
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
  console.log(`\n🔍 Checking draft for app: ${appId}\n`);

  const draftRef = db
    .collection("apps")
    .doc(appId)
    .collection("drafts")
    .doc("latest");
  const draftSnap = await draftRef.get();

  if (!draftSnap.exists) {
    console.log("❌ No draft found at /apps/" + appId + "/drafts/latest");
    process.exit(1);
  }

  const data = draftSnap.data();

  console.log("✅ Draft exists!\n");
  console.log("--- Metadata ---");
  console.log(JSON.stringify(data.metadata, null, 2));

  console.log("\n--- Source Files ---");
  for (const [name, content] of Object.entries(data.source || {})) {
    console.log(
      `\n📄 ${name} (${content.length} chars, ${
        content.split("\n").length
      } lines)`
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
  for (const [name, content] of Object.entries(data.compiled || {})) {
    console.log(`📦 ${name} (${content.length} chars)`);
  }

  if (data.metadata?.compileErrors) {
    console.log("\n⚠️  Compile Errors:");
    console.log(JSON.stringify(data.metadata.compileErrors, null, 2));
  }
}

main().catch(console.error);
