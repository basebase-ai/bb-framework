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
import { firebaseConfig } from "../config/firebase.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "app");

// Initialize Firebase with public config
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

// Helper to prompt for password (hidden input)
function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(question);

    // Hide input
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";

    stdin.on("data", (char) => {
      char = char.toString("utf8");

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004": // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          rl.close();
          resolve(password);
          break;
        case "\u0003": // Ctrl-C
          process.exit();
          break;
        case "\u007f": // Backspace
        case "\b":
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + "*".repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write("*");
          break;
      }
    });
  });
}

// Sign in user
async function signIn() {
  console.log(chalk.cyan("\n🔐 Authentication required\n"));

  const email = await prompt("Email: ");
  const password = await promptPassword("Password: ");

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

// Transform JSX/TS to JS for production
function transformCode(code, filePath) {
  if (!/\.(jsx|tsx)$/.test(filePath)) {
    return code; // No transformation needed
  }

  try {
    // Remove hot reload code BEFORE transformation
    let cleanedCode = code;
    
    // Remove entire if (import.meta.hot) blocks (with proper brace matching)
    cleanedCode = cleanedCode.replace(
      /if\s*\(\s*import\.meta\.hot\s*\)\s*\{[\s\S]*?\n\}/g,
      ''
    );
    
    // Remove any remaining import.meta references
    cleanedCode = cleanedCode.replace(/import\.meta\.[a-zA-Z0-9_.]+/g, 'undefined');
    
    const result = transform(cleanedCode, {
      transforms: ["jsx", "typescript", "imports"],
      jsxRuntime: "classic", // Use classic for compatibility with eval context
      production: true,
    });
    
    // Final cleanup AFTER transformation (in case Sucrase left anything)
    let finalCode = result.code;
    finalCode = finalCode.replace(/import\.meta\.[a-zA-Z0-9_.]+/g, 'undefined');
    
    return finalCode;
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Transform failed for ${filePath}: ${error.message}`));
    return code; // Return original on error
  }
}

// Build modules from /app directory
// Returns both source (for checkout) and compiled (for production)
async function buildModules() {
  const source = {};
  const compiled = {};
  let totalSize = 0;

  async function scanDir(dir, base = "") {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(dir, entry.name);
      const modulePath = join(base, entry.name);

      if (entry.isDirectory()) {
        await scanDir(path, modulePath);
      } else if (entry.isFile()) {
        // Read original source
        const code = await readFile(path, "utf-8");
        source[modulePath] = code;
        totalSize += code.length;

        // Transform for production (JSX/TS → JS)
        const compiledPath = modulePath.replace(/\.(jsx|tsx)$/, ".js");
        compiled[compiledPath] = transformCode(code, modulePath);

        console.log(
          chalk.gray(`  • ${modulePath} (${(code.length / 1024).toFixed(1)}kb)`)
        );
      }
    }
  }

  await scanDir(appDir);

  return { source, compiled, totalSize };
}

// Generate version hash (based on source only)
function generateVersionHash(source) {
  const hash = createHash("sha256");

  Object.entries(source)
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
    const { source, compiled, totalSize } = await buildModules();

    const versionHash = generateVersionHash(source);

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

      // Create new version with both source and compiled code
      await setDoc(versionRef, {
        source,     // Original .jsx files for development
        compiled,   // Transformed .js files for production
        metadata: {
          version: versionHash,
          entry: "app.js",  // Production entry point
          sourceEntry: "app.jsx",  // Development entry point
          publishedAt: serverTimestamp(),
          publishedBy: user.uid,
          publishedByEmail: user.email,
          message,
          moduleCount: Object.keys(source).length,
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
