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
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { readFile, readdir, writeFile } from "fs/promises";
import { join, relative } from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { transform } from "sucrase";
import chalk from "chalk";
import { createHash } from "crypto";
import { firebaseConfig } from "../config/firebase.config.js";
import { authenticateUser } from "./lib/auth-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appsDir = join(root, "apps");

// Initialize Firebase with public config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Check if running in an interactive terminal
function checkInteractive() {
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red("\n❌ ERROR: This command requires an interactive terminal\n")
    );
    console.log(
      chalk.yellow("This script needs to prompt for your email and password.")
    );
    console.log(
      chalk.yellow(
        "AI coding assistants cannot handle interactive password prompts.\n"
      )
    );
    console.log(
      chalk.cyan("Please run this command yourself in your terminal:")
    );
    console.log(
      chalk.white(
        `  npm run app:commit "${process.argv[2] || "Your commit message"}"\n`
      )
    );
    console.log(
      chalk.gray(
        "Then you'll be prompted for your Firebase email and password."
      )
    );
    process.exit(1);
  }
}

// Read checkout metadata file
async function readCheckoutMetadata(appId) {
  const metadataPath = join(appsDir, appId, ".basebase-checkout.json");
  try {
    const content = await readFile(metadataPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or is invalid JSON
    return null;
  }
}

// Generate file hash for content
function hashContent(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

// Generate file hashes for source modules
function generateFileHashes(source) {
  const hashes = {};
  for (const [filePath, code] of Object.entries(source)) {
    hashes[filePath] = hashContent(code);
  }
  return hashes;
}

// Write updated checkout metadata after commit
async function writeCheckoutMetadata(appId, versionHash, source) {
  const metadataPath = join(appsDir, appId, ".basebase-checkout.json");
  const metadata = {
    checkedOutVersion: versionHash,
    checkedOutAt: new Date().toISOString(),
    appId: appId,
    fileHashes: generateFileHashes(source)
  };
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
}

// Prompt user for confirmation
function promptConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Check for version conflicts
async function checkVersionConflict(appId, serverCurrentVersion, serverAppData) {
  const checkoutMetadata = await readCheckoutMetadata(appId);
  
  if (!checkoutMetadata) {
    // No checkout metadata - this might be a new app or manual file creation
    console.log(chalk.yellow("\n⚠️  No checkout metadata found."));
    console.log(chalk.gray("   Cannot verify if your local files are based on the latest version."));
    console.log(chalk.gray("   This is normal for newly created apps or manually created files.\n"));
    
    const shouldContinue = await promptConfirmation(
      chalk.white("   Continue with commit? (Y/n): ")
    );
    
    // Default to yes for this soft warning
    if (shouldContinue || shouldContinue === "") {
      return true;
    }
    return shouldContinue;
  }
  
  const { checkedOutVersion, checkedOutAt } = checkoutMetadata;
  
  if (checkedOutVersion === serverCurrentVersion) {
    // Versions match - safe to commit
    console.log(chalk.green("✓ Your local files are based on the latest server version."));
    return true;
  }
  
  // Version conflict detected!
  const checkoutDate = new Date(checkedOutAt);
  const formattedDate = checkoutDate.toLocaleString();
  
  console.log(chalk.red("\n⚠️  WARNING: A newer version exists on the server!\n"));
  console.log(chalk.white("   Your checkout:   ") + chalk.cyan(checkedOutVersion) + chalk.gray(` (${formattedDate})`));
  console.log(chalk.white("   Server version:  ") + chalk.cyan(serverCurrentVersion));
  
  if (serverAppData.updatedBy) {
    const updatedByEmail = serverAppData.updatedByEmail || serverAppData.updatedBy;
    console.log(chalk.gray(`   Last updated by: ${updatedByEmail}`));
  }
  
  console.log(chalk.yellow("\n   If you continue, you may overwrite changes made since your checkout."));
  console.log(chalk.white("   Consider running: ") + chalk.cyan(`npm run app:checkout ${appId}\n`));
  
  const shouldContinue = await promptConfirmation(
    chalk.white("   Continue anyway? (y/N): ")
  );
  
  return shouldContinue;
}

// Transform JSX/TS to JS for production
function transformCode(code, filePath) {
  // Transform all JS/JSX/TS/TSX files, skip other file types (CSS, JSON, etc.)
  if (!/\.(js|jsx|ts|tsx)$/.test(filePath)) {
    return code; // No transformation needed for non-JS files
  }

  try {
    // Remove hot reload code BEFORE transformation
    let cleanedCode = code;

    // Remove entire if (import.meta.hot) blocks (with proper brace matching)
    cleanedCode = cleanedCode.replace(
      /if\s*\(\s*import\.meta\.hot\s*\)\s*\{[\s\S]*?\n\}/g,
      ""
    );

    // NOTE: We no longer replace import.meta with undefined here
    // Instead, it's handled at runtime by the ModuleLoader injecting __importMeta

    // Normalize framework import paths for production
    // Convert relative paths like "../../framework/" or "../../../framework/" to "framework/"
    // Also convert .jsx extensions to .js for production compatibility
    cleanedCode = cleanedCode.replace(
      /from\s+["'](\.\.\/)+(framework\/[^"']+)\.jsx["']/g,
      'from "$2.js"'
    );
    cleanedCode = cleanedCode.replace(
      /from\s+["'](\.\.\/)+(framework\/[^"']+)\.js["']/g,
      'from "$2.js"'
    );
    cleanedCode = cleanedCode.replace(
      /import\s*\(\s*["'](\.\.\/)+(framework\/[^"']+)\.jsx["']\s*\)/g,
      'import("$2.js")'
    );
    cleanedCode = cleanedCode.replace(
      /import\s*\(\s*["'](\.\.\/)+(framework\/[^"']+)\.js["']\s*\)/g,
      'import("$2.js")'
    );

    const result = transform(cleanedCode, {
      transforms: ["jsx", "typescript", "imports"],
      jsxRuntime: "classic", // Use classic for compatibility with eval context
      production: true,
    });

    // Final cleanup AFTER transformation (in case Sucrase left anything)
    let finalCode = result.code;
    // NOTE: We no longer replace import.meta with undefined here
    // Instead, it's handled at runtime by the ModuleLoader injecting __importMeta

    return finalCode;
  } catch (error) {
    console.warn(
      chalk.yellow(`⚠️  Transform failed for ${filePath}: ${error.message}`)
    );
    return code; // Return original on error
  }
}

// Build modules from /apps/{appId} directory
// Returns both source (for checkout) and compiled (for production)
async function buildModules(appId) {
  const appDir = join(appsDir, appId);
  const source = {};
  const compiled = {};
  let totalSize = 0;

  async function scanDir(dir, base = "") {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(dir, entry.name);
      // Normalize to forward slashes for cross-platform compatibility
      // Windows uses backslashes, but we store with forward slashes universally
      const modulePath = join(base, entry.name).replace(/\\/g, '/');

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
    // Check if interactive, then sign in user
    checkInteractive();
    const userCredential = await authenticateUser(auth);
    const user = userCredential.user;

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

    // Debug: Show user ID and collaborators
    console.log(chalk.gray(`   Your UID: ${user.uid}`));
    console.log(chalk.gray(`   Owner: ${appData.owner}`));
    console.log(chalk.gray(`   Collaborators: ${JSON.stringify(appData.collaborators || [])}`));

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

    // Check for version conflicts before proceeding
    console.log(chalk.cyan("\n🔄 Checking for version conflicts..."));
    const serverCurrentVersion = appData.currentVersion;
    
    if (serverCurrentVersion) {
      const shouldContinue = await checkVersionConflict(appId, serverCurrentVersion, appData);
      if (!shouldContinue) {
        console.log(chalk.yellow("\n⏹️  Commit cancelled."));
        process.exit(0);
      }
    } else {
      console.log(chalk.gray("   No existing version on server (first commit)."));
    }

    // Build modules from /apps/{appId} directory
    console.log(chalk.cyan(`\n📦 Building app modules from /apps/${appId}...\n`));
    const { source, compiled, totalSize } = await buildModules(appId);

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
          "⚠️  Version exists. Re-uploading with updated transformation..."
        )
      );
    } else {
      console.log(chalk.cyan("📤 Uploading to Firestore..."));
    }

    // Always upload/update version with both source and compiled code
    // (Important: compiled code may change even if source hasn't)
    await setDoc(versionRef, {
      source, // Original .jsx files for development
      compiled, // Transformed .js files for production
      metadata: {
        version: versionHash,
        entry: "app.js", // Production entry point
        sourceEntry: "app.jsx", // Development entry point
        publishedAt: serverTimestamp(),
        publishedBy: user.uid,
        publishedByEmail: user.email,
        message,
        moduleCount: Object.keys(source).length,
        totalSize,
      },
    });

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

    // Update checkout metadata with new version
    await writeCheckoutMetadata(appId, versionHash, source);

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
