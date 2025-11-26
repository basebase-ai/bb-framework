#!/usr/bin/env node
/**
 * Initialize a new app by creating it in Firestore
 * Usage: npm run app:init <appId>
 *
 * This script:
 * 1. Prompts for Firebase email/password
 * 2. Creates the app document in Firestore
 * 3. Updates APP_ID in apps/{appId}/schema.js
 */

import { readFile, writeFile, mkdir, cp, access, constants } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseConfig } from "../config/firebase.config.js";
import { prompt, promptPassword, authenticateUser } from "./lib/auth-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Detect non-interactive terminal
function isInteractive() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

// Validate app ID format
function validateAppId(appId) {
  if (!appId) {
    return "App ID is required";
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(appId)) {
    return "App ID must be lowercase, alphanumeric, and use hyphens (kebab-case)";
  }

  if (appId.length < 3 || appId.length > 50) {
    return "App ID must be between 3 and 50 characters";
  }

  return null;
}

// Copy starter-app template to create new app directory
async function copyStarterTemplate(appId) {
  const starterPath = resolve(rootDir, "apps/starter-app");
  const appPath = resolve(rootDir, `apps/${appId}`);

  console.log(chalk.blue(`📁 Creating app directory structure...`));

  // Check if app directory already exists
  try {
    await access(appPath, constants.F_OK);
    console.log(chalk.yellow(`⚠️  Directory apps/${appId} already exists, skipping copy.\n`));
    return;
  } catch {
    // Directory doesn't exist, proceed with copy
  }

  // Copy the entire starter-app directory
  await cp(starterPath, appPath, { recursive: true });

  console.log(chalk.green(`✓ Created app directory from starter template\n`));
}

// Update APP_ID in schema.js
async function updateSchemaFile(appId) {
  console.log(chalk.blue("📝 Updating schema.js..."));

  const schemaPath = resolve(rootDir, `apps/${appId}/schema.js`);
  let schemaContent = await readFile(schemaPath, "utf-8");

  // Replace the APP_ID value
  schemaContent = schemaContent.replace(
    /export const APP_ID = ['"].*?['"];/,
    `export const APP_ID = '${appId}';`
  );

  await writeFile(schemaPath, schemaContent, "utf-8");

  console.log(chalk.green(`✓ Updated APP_ID to '${appId}' in apps/${appId}/schema.js\n`));
}

// Main function
async function main() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   Basebase Framework - App Init     ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));

  // Check if terminal is interactive
  if (!isInteractive()) {
    console.error(
      chalk.red("❌ ERROR: This command requires an interactive terminal\n")
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
      chalk.gray(`  npm run app:init ${process.argv[2] || "<appId>"}\n`)
    );
    console.log(
      chalk.cyan(
        "Then you'll be prompted for your Firebase email and password.\n"
      )
    );
    process.exit(1);
  }

  // Get app ID from command line or prompt
  let appId = process.argv[2];

  if (!appId) {
    appId = await prompt("Enter app ID (kebab-case, e.g., my-app): ");
  }

  // Validate app ID
  const validationError = validateAppId(appId);
  if (validationError) {
    console.error(chalk.red(`❌ Invalid App ID: ${validationError}`));
    process.exit(1);
  }

  console.log(chalk.green(`✓ App ID: ${appId}\n`));

  // Get app name
  const appName =
    (await prompt(`Enter app name (display name): `)) ||
    appId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  console.log(chalk.green(`✓ App Name: ${appName}\n`));

  // Get description
  const description = await prompt(`Enter app description (optional): `);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // Sign in with centralized auth
    const userCredential = await authenticateUser(auth);
    const user = userCredential.user;

    // Check if app already exists
    console.log(chalk.blue(`📡 Checking if app '${appId}' exists...`));
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    if (appSnap.exists()) {
      const existingApp = appSnap.data();
      if (existingApp.owner !== user.uid) {
        console.error(
          chalk.red(
            `\n❌ Error: App '${appId}' already exists and is owned by another user.`
          )
        );
        console.log(chalk.yellow(`   Choose a different app ID.`));
        process.exit(1);
      } else {
        console.log(
          chalk.yellow(`⚠️  App '${appId}' already exists (you are the owner).`)
        );
        console.log(chalk.yellow(`   Updating local schema only...\n`));
      }
    } else {
      // Create app document
      console.log(chalk.blue(`📝 Creating app '${appId}' in Firestore...`));

      await setDoc(appRef, {
        name: appName,
        description: description || `${appName} - built with Basebase`,
        owner: user.uid,
        accessMode: "open", // Default to open for easy development
        currentVersion: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(chalk.green(`✓ Created app in Firestore\n`));
    }

    // Copy starter template and update schema file
    await copyStarterTemplate(appId);
    await updateSchemaFile(appId);

    console.log(chalk.bold.green("✨ App initialization complete!\n"));
    console.log(chalk.cyan("Next steps:"));
    console.log(
      chalk.gray(
        "  1. npm run dev                          - Start development server"
      )
    );
    console.log(
      chalk.gray("  2. Edit code in /app                    - Build your app")
    );
    console.log(
      chalk.gray(
        '  3. npm run app:commit "message"         - Deploy to Firestore\n'
      )
    );

    process.exit(0);
  } catch (error) {
    console.error(chalk.red("\n✗ Error:"), error.message);
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      console.log(
        chalk.yellow(
          "\n💡 Tip: Make sure you're using the correct email and password."
        )
      );
    } else if (error.code === "auth/user-not-found") {
      console.log(
        chalk.yellow("\n💡 Tip: Sign up first at http://localhost:3000")
      );
    }
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(chalk.red("\n✗ Error:"), error.message);
  console.error(error.stack);
  process.exit(1);
});
