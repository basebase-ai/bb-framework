#!/usr/bin/env node
/**
 * Publish app code to Firestore
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { transform } from "sucrase";
import chalk from "chalk";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "app");

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  
  if (!serviceAccount.project_id) {
    console.error(chalk.red("\n❌ Error: FIREBASE_SERVICE_ACCOUNT not configured"));
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

// Transform code
async function processFile(filePath) {
  const code = await readFile(filePath, "utf-8");

  // Transform JSX/TypeScript
  const transformed = transform(code, {
    transforms: ["jsx", "typescript", "imports"],
    jsxRuntime: "classic",
    production: true,
  });

  return transformed.code;
}

// Build complete module map
async function buildProductionModules() {
  const modules = {};
  let totalSize = 0;

  async function scanDir(dir, base = "") {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(dir, entry.name);
      const modulePath = join(base, entry.name);

      if (entry.isDirectory()) {
        await scanDir(path, modulePath);
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const code = await processFile(path);
        const normalizedPath = modulePath.replace(/\.(jsx|tsx|ts)$/, ".js");

        modules[normalizedPath] = code;
        totalSize += code.length;

        console.log(
          chalk.gray(
            `  • ${normalizedPath} (${(code.length / 1024).toFixed(1)}kb)`
          )
        );
      }
    }
  }

  await scanDir(appDir);

  return { modules, totalSize };
}

// Generate version hash
function generateVersionHash(modules) {
  const hash = createHash("sha256");

  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([path, code]) => {
      hash.update(path);
      hash.update(code);
    });

  return hash.digest("hex").substring(0, 12);
}

// Publish to Firestore
async function publish(appId = process.env.APP_ID || "default-app") {
  console.log(chalk.cyan("\n📦 Building app modules...\n"));

  const { modules, totalSize } = await buildProductionModules();
  const versionHash = generateVersionHash(modules);

  console.log(
    chalk.cyan(`\n📊 Total size: ${(totalSize / 1024).toFixed(1)}kb`)
  );
  console.log(chalk.cyan(`📝 Version hash: ${versionHash}\n`));

  // Check if version already exists
  const versionRef = db.doc(`apps/${appId}/versions/${versionHash}`);
  const versionSnap = await versionRef.get();

  if (versionSnap.exists) {
    console.log(
      chalk.yellow(
        "⚠️  This version already exists. Updating current pointer..."
      )
    );
  } else {
    console.log(chalk.cyan("📤 Publishing to Firestore..."));

    // Create new version
    await versionRef.set({
      modules,
      metadata: {
        version: versionHash,
        entry: "./app.js",
        publishedAt: FieldValue.serverTimestamp(),
        publishedBy: process.env.USER || "unknown",
        moduleCount: Object.keys(modules).length,
        totalSize,
      },
    });
  }

  // Update current pointer
  const appRef = db.doc(`apps/${appId}`);
  await appRef.set(
    {
      currentVersion: versionHash,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(chalk.green("\n✅ App published successfully!"));
  console.log(chalk.gray(`\n🌍 Your app is now live!`));
}

// Parse arguments
const appId = process.argv[2] || process.env.APP_ID;

// Run publisher
publish(appId).catch((error) => {
  console.error(chalk.red("\n❌ Publish failed:"), error.message);
  process.exit(1);
});

