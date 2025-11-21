#!/usr/bin/env node
/**
 * Commit local app code to Firestore
 * Usage: npm run app:commit <appId> [message]
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFile, readdir } from "fs/promises";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { transform } from "sucrase";
import chalk from "chalk";
import dotenv from "dotenv";
import { createHash } from "crypto";
import readline from "readline";
import {
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
} from "firebase/firestore";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "app");

// Initialize Firebase (client SDK)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper to prompt for input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Sign in user
async function signIn() {
  console.log(chalk.cyan("\n🔐 Authentication required\n"));

  const email = await prompt("Email: ");
  const password = await prompt("Password: ");

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log(chalk.green(`✅ Signed in as ${userCredential.user.email}\n`));
    return userCredential.user;
  } catch (error) {
    console.error(chalk.red("❌ Authentication failed:"), error.message);
    process.exit(1);
  }
}

// Transform code (JSX -> JS)
async function processFile(filePath) {
  const code = await readFile(filePath, "utf-8");

  // Transform JSX/TypeScript
  try {
    const transformed = transform(code, {
      transforms: ["jsx", "typescript", "imports"],
      jsxRuntime: "classic",
      production: true,
    });
    return transformed.code;
  } catch (error) {
    console.warn(
      chalk.yellow(`⚠️  Could not transform ${filePath}, using original`)
    );
    return code;
  }
}

// Build modules from /app directory
async function buildModules() {
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

// Clean up old versions (keep only last N)
async function cleanupOldVersions(appId, currentVersionHash, keepCount = 10) {
  try {
    console.log(
      chalk.gray(`\n🧹 Cleaning up old versions (keeping last ${keepCount})...`)
    );

    // Get all versions sorted by publishedAt
    const versionsRef = collection(db, "apps", appId, "versions");
    const versionsSnap = await getDocs(versionsRef);

    // Sort by metadata.publishedAt
    const versions = [];
    versionsSnap.forEach((doc) => {
      const data = doc.data();
      versions.push({
        id: doc.id,
        publishedAt: data.metadata?.publishedAt?.toDate() || new Date(0),
      });
    });

    versions.sort((a, b) => b.publishedAt - a.publishedAt);

    // Keep current + last N-1, delete the rest
    const versionsToDelete = versions
      .slice(keepCount)
      .filter((v) => v.id !== currentVersionHash); // Never delete current

    if (versionsToDelete.length > 0) {
      console.log(
        chalk.yellow(`   Deleting ${versionsToDelete.length} old versions...`)
      );

      for (const version of versionsToDelete) {
        await deleteDoc(doc(db, "apps", appId, "versions", version.id));
        console.log(chalk.gray(`   ✓ Deleted ${version.id}`));
      }

      console.log(chalk.green(`   ✅ Cleanup complete!`));
    } else {
      console.log(chalk.gray(`   No old versions to delete`));
    }
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️  Cleanup failed: ${error.message}`));
    // Don't fail the commit if cleanup fails
  }
}

// Main commit function
async function commit(appId, message = "Updated via app:commit") {
  console.log(chalk.cyan(`\n📤 Committing app: ${appId}\n`));

  try {
    // Sign in user
    const user = await signIn();

    // Get app document to check permissions
    console.log(chalk.cyan("🔍 Checking permissions..."));
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      console.error(chalk.red(`❌ App "${appId}" not found`));
      console.log(
        chalk.yellow(
          `\n💡 Create the app first in the UI, then commit code to it.`
        )
      );
      process.exit(1);
    }

    const appData = appSnap.data();

    // Check if user has write access
    const hasAccess =
      appData.owner === user.uid ||
      (appData.collaborators && appData.collaborators.includes(user.uid));

    if (!hasAccess) {
      console.error(
        chalk.red(
          `❌ Access denied. You don't have permission to modify "${appId}"`
        )
      );
      process.exit(1);
    }

    // Build modules from /app directory
    console.log(chalk.cyan("\n📦 Building app modules...\n"));
    const { modules, totalSize } = await buildModules();

    const versionHash = generateVersionHash(modules);

    console.log(
      chalk.cyan(`\n📊 Total size: ${(totalSize / 1024).toFixed(1)}kb`)
    );
    console.log(chalk.cyan(`📝 Version hash: ${versionHash}\n`));

    // Check if version already exists
    const versionRef = doc(db, "apps", appId, "versions", versionHash);
    const versionSnap = await getDoc(versionRef);

    if (versionSnap.exists()) {
      console.log(
        chalk.yellow(
          "⚠️  This version already exists. Updating current pointer..."
        )
      );
    } else {
      console.log(chalk.cyan("📤 Uploading to Firestore..."));

      // Create new version
      await setDoc(versionRef, {
        modules,
        metadata: {
          version: versionHash,
          entry: "./app.jsx",
          publishedAt: serverTimestamp(),
          publishedBy: user.uid,
          publishedByEmail: user.email,
          message,
          moduleCount: Object.keys(modules).length,
          totalSize,
        },
      });
    }

    // Update current pointer
    await setDoc(
      appRef,
      {
        currentVersion: versionHash,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      },
      { merge: true }
    );

    // Optional: Clean up old versions (keep last 10)
    // Uncomment to enable auto-cleanup
    // await cleanupOldVersions(appId, versionHash, 10);

    console.log(chalk.green("\n✅ Commit successful!"));
    console.log(chalk.gray(`   App: ${appId}`));
    console.log(chalk.gray(`   Version: ${versionHash}`));
    console.log(chalk.gray(`   Message: ${message}`));
    console.log(chalk.white(`\n🌍 Your changes are now live!\n`));
  } catch (error) {
    console.error(chalk.red("\n❌ Commit failed:"), error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse arguments
const appId = process.argv[2];
const message = process.argv.slice(3).join(" ") || "Updated via app:commit";

if (!appId) {
  console.error(chalk.red("\n❌ App ID required"));
  console.log(
    chalk.white("\nUsage:"),
    chalk.cyan("npm run app:commit <appId> [message]")
  );
  console.log(
    chalk.white("Example:"),
    chalk.cyan('npm run app:commit news-base "Added new feature"\n')
  );
  process.exit(1);
}

commit(appId, message);
