#!/usr/bin/env node
/**
 * Checkout app code from Firestore to local /apps/{appId} directory
 * Usage: npm run app:checkout <appId> [version]
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { writeFile, mkdir, rm } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import chalk from "chalk";
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
        `  npm run app:checkout ${process.argv[2] || "app-id"} ${
          process.argv[3] || "latest"
        }\n`
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

// Generate SHA-256 hash for a string
function hashContent(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

// Generate file hashes for all modules
function generateFileHashes(modules) {
  const hashes = {};
  for (const [filePath, code] of Object.entries(modules)) {
    hashes[filePath] = hashContent(code);
  }
  return hashes;
}

// Write checkout metadata file for version tracking
async function writeCheckoutMetadata(appId, versionHash, modules) {
  const appDir = join(appsDir, appId);
  const metadataPath = join(appDir, ".basebase-checkout.json");

  const metadata = {
    checkedOutVersion: versionHash,
    checkedOutAt: new Date().toISOString(),
    appId: appId,
    fileHashes: generateFileHashes(modules),
  };

  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  console.log(chalk.gray(`  ✓ .basebase-checkout.json (version tracking)`));
}

// Write modules to disk
async function writeModulesToDisk(appId, modules) {
  const appDir = join(appsDir, appId);

  // Create app directory if it doesn't exist
  console.log(chalk.yellow(`🗑️  Preparing /apps/${appId} directory...`));
  await mkdir(appDir, { recursive: true });

  // Just overwrite files as we go
  let fileCount = 0;

  for (const [filePath, code] of Object.entries(modules)) {
    // Normalize backslashes to forward slashes (fix for Windows-committed apps)
    const normalizedPath = filePath.replace(/\\/g, "/");
    const fullPath = join(appDir, normalizedPath);
    const dir = dirname(fullPath);

    // Create directory if needed
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(fullPath, code, "utf-8");
    console.log(chalk.gray(`  ✓ ${filePath}`));
    fileCount++;
  }

  return fileCount;
}

// Main checkout function
async function checkout(appId, versionId = "latest") {
  console.log(chalk.cyan(`\n📥 Checking out app: ${appId}\n`));

  try {
    // Check if interactive, then sign in user
    checkInteractive();
    const userCredential = await authenticateUser(auth);
    const user = userCredential.user;

    // Get app document
    console.log(chalk.cyan("📡 Fetching app from Firestore..."));
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      console.error(chalk.red(`❌ App "${appId}" not found`));
      process.exit(1);
    }

    const appData = appSnap.data();

    // Check if app is editable by public or if user has access (owner or collaborator)
    const hasAccess =
      appData.owner === user.uid ||
      (appData.collaborators && appData.collaborators.includes(user.uid)) ||
      appData.publicEdit === true;

    if (!hasAccess) {
      console.error(
        chalk.red(
          `❌ Access denied. You don't have permission to access "${appId}"`
        )
      );
      process.exit(1);
    }

    // Get version to checkout
    const targetVersion =
      versionId === "latest" ? appData.currentVersion : versionId;

    if (!targetVersion) {
      console.error(
        chalk.red(`❌ No version found. App may not have been published yet.`)
      );
      process.exit(1);
    }

    console.log(chalk.gray(`   Version: ${targetVersion}`));

    // Get version document
    const versionRef = doc(db, "apps", appId, "versions", targetVersion);
    const versionSnap = await getDoc(versionRef);

    if (!versionSnap.exists()) {
      console.error(chalk.red(`❌ Version "${targetVersion}" not found`));
      process.exit(1);
    }

    const versionData = versionSnap.data();
    // Use source for development (original .jsx files)
    const modules = versionData.source || versionData.modules || {};

    console.log(
      chalk.cyan(
        `\n📦 Writing ${
          Object.keys(modules).length
        } files to /apps/${appId}...\n`
      )
    );

    // Write modules to disk
    const fileCount = await writeModulesToDisk(appId, modules);

    // Write checkout metadata for version tracking
    await writeCheckoutMetadata(appId, targetVersion, modules);

    console.log(chalk.green(`\n✅ Checkout complete!`));
    console.log(chalk.gray(`   App: ${appId}`));
    console.log(chalk.gray(`   Version: ${targetVersion}`));
    console.log(chalk.gray(`   Files: ${fileCount}`));
    console.log(
      chalk.white(`\n🚀 Run`),
      chalk.cyan("npm run dev"),
      chalk.white("to start development\n")
    );
  } catch (error) {
    console.error(chalk.red("\n❌ Checkout failed:"), error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse arguments
const appId = process.argv[2];
const versionId = process.argv[3] || "latest";

if (!appId) {
  console.error(chalk.red("\n❌ App ID required"));
  console.log(
    chalk.white("\nUsage:"),
    chalk.cyan("npm run app:checkout <appId> [version]")
  );
  console.log(
    chalk.white("Example:"),
    chalk.cyan("npm run app:checkout news-base latest\n")
  );
  process.exit(1);
}

checkout(appId, versionId);
