#!/usr/bin/env node
/**
 * Initialize a new Basebase app in Firebase
 */

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "chalk";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  
  if (!serviceAccount.project_id) {
    console.error(chalk.red("\n❌ Error: FIREBASE_SERVICE_ACCOUNT not configured"));
    console.log(chalk.yellow("\nPlease set FIREBASE_SERVICE_ACCOUNT in your .env file"));
    console.log(chalk.gray("\nExample:"));
    console.log(chalk.gray('FIREBASE_SERVICE_ACCOUNT=\'{"type":"service_account",...}\''));
    process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
} catch (error) {
  console.error(chalk.red("\n❌ Failed to initialize Firebase Admin:"), error.message);
  process.exit(1);
}

const db = getFirestore();

async function init() {
  const appId = process.argv[2] || process.env.APP_ID || "default-app";

  console.log(chalk.cyan("\n🚀 Initializing Basebase app..."));
  console.log(chalk.gray(`   App ID: ${appId}\n`));

  try {
    // Create app document
    const appRef = db.doc(`apps/${appId}`);
    await appRef.set({
      name: appId,
      description: "A new Basebase application",
      status: "draft",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(chalk.green("✅ App document created"));

    // Create initial version
    const versionRef = db.doc(`apps/${appId}/versions/initial`);
    await versionRef.set({
      metadata: {
        version: "initial",
        entry: "./app.js",
        createdAt: FieldValue.serverTimestamp(),
      },
      modules: {},
    });

    console.log(chalk.green("✅ Initial version created"));

    console.log(chalk.cyan("\n🎉 App initialized successfully!"));
    console.log(chalk.gray("\nNext steps:"));
    console.log(chalk.white("  1. Run"), chalk.cyan("npm run dev"), chalk.white("to start development"));
    console.log(chalk.white("  2. Edit files in the"), chalk.cyan("app/"), chalk.white("directory"));
    console.log(chalk.white("  3. Run"), chalk.cyan("npm run publish"), chalk.white("when ready to deploy\n"));
  } catch (error) {
    console.error(chalk.red("\n❌ Initialization failed:"), error.message);
    process.exit(1);
  }
}

init();

