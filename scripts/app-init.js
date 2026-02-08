#!/usr/bin/env node
/**
 * Initialize a new app by creating it in Firestore
 *
 * Usage:
 *   npm run app:init -- <appId> [options]
 *
 * Options:
 *   --name=<name>          App display name (defaults to titlecased appId)
 *   --description=<desc>   App description (optional)
 *   --email=<email>        Firebase email  (or BASEBASE_EMAIL env var)
 *   --password=<password>  Firebase password (or BASEBASE_PASSWORD env var)
 *   --yes / -y             Auto-confirm all prompts
 *   --json                 Output machine-readable JSON
 *
 * NOTE: The -- separator is required to prevent npm from consuming --flags.
 *
 * Examples:
 *   npm run app:init my-app
 *   npm run app:init -- my-app --name="My App" --email=me@x.com --password=secret --json
 *   BASEBASE_EMAIL=me@x.com BASEBASE_PASSWORD=secret npm run app:init -- my-app --yes
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
import {
  prompt,
  authenticateUser,
  hasNonInteractiveCredentials,
  parseGlobalFlags,
  parseNamedArg,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

/**
 * Detect whether the terminal is interactive OR non-interactive credentials are available.
 * @returns {boolean}
 */
function canProceed() {
  if (hasNonInteractiveCredentials()) return true;
  return !!(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Validate app ID format.
 * @param {string | undefined} appId
 * @returns {string | null} Error message or null if valid.
 */
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

/**
 * Copy starter-app template to create new app directory.
 * @param {string} appId
 */
async function copyStarterTemplate(appId) {
  const starterPath = resolve(rootDir, "apps/starter-app");
  const appPath = resolve(rootDir, `apps/${appId}`);

  log(chalk.blue(`📁 Creating app directory structure...`));

  // Check if app directory already exists
  try {
    await access(appPath, constants.F_OK);
    log(chalk.yellow(`⚠️  Directory apps/${appId} already exists, skipping copy.\n`));
    return;
  } catch {
    // Directory doesn't exist, proceed with copy
  }

  // Copy the entire starter-app directory
  await cp(starterPath, appPath, { recursive: true });

  log(chalk.green(`✓ Created app directory from starter template\n`));
}

/**
 * Update APP_ID in schema.js.
 * @param {string} appId
 */
async function updateSchemaFile(appId) {
  log(chalk.blue("📝 Updating schema.js..."));

  const schemaPath = resolve(rootDir, `apps/${appId}/schema.js`);
  let schemaContent = await readFile(schemaPath, "utf-8");

  // Replace the APP_ID value
  schemaContent = schemaContent.replace(
    /export const APP_ID = ['"].*?['"];/,
    `export const APP_ID = '${appId}';`
  );

  await writeFile(schemaPath, schemaContent, "utf-8");

  log(chalk.green(`✓ Updated APP_ID to '${appId}' in apps/${appId}/schema.js\n`));
}

// Main function
async function main() {
  const flags = parseGlobalFlags();

  if (!flags.json) {
    console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
    console.log(chalk.bold.blue("║   Basebase Framework - App Init     ║"));
    console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));
  }

  // Check if we can proceed (interactive OR non-interactive credentials provided)
  if (!canProceed()) {
    console.error(
      chalk.red("❌ ERROR: This command requires an interactive terminal or --email/--password flags.\n")
    );
    console.log(
      chalk.yellow("Provide credentials via CLI flags or environment variables:\n")
    );
    console.log(
      chalk.cyan(`  npm run app:init -- ${process.argv[2] || "<appId>"} --email=you@example.com --password=yourpass`)
    );
    console.log(
      chalk.cyan(`  BASEBASE_EMAIL=you@example.com BASEBASE_PASSWORD=yourpass npm run app:init ${process.argv[2] || "<appId>"}\n`)
    );
    process.exit(1);
  }

  // Get app ID from first positional arg (skip flags)
  /** @type {string | undefined} */
  let appId = process.argv[2];
  if (appId && appId.startsWith("--")) {
    appId = undefined;
  }

  if (!appId && canProceed() && !hasNonInteractiveCredentials()) {
    appId = await prompt("Enter app ID (kebab-case, e.g., my-app): ");
  }

  // Validate app ID
  const validationError = validateAppId(appId);
  if (validationError) {
    if (flags.json) {
      jsonOutput({ success: false, error: "invalid_app_id", message: validationError });
    } else {
      console.error(chalk.red(`❌ Invalid App ID: ${validationError}`));
    }
    process.exit(1);
  }

  log(chalk.green(`✓ App ID: ${appId}\n`));

  // Get app name from --name flag, or prompt interactively, or default to titlecased appId
  const defaultName = appId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  /** @type {string} */
  let appName = parseNamedArg("name") || "";
  if (!appName && !hasNonInteractiveCredentials()) {
    appName = await prompt(`Enter app name (display name) [${defaultName}]: `);
  }
  appName = appName || defaultName;

  log(chalk.green(`✓ App Name: ${appName}\n`));

  // Get description from --description flag, or prompt interactively, or use default
  /** @type {string} */
  let description = parseNamedArg("description") || "";
  if (!description && !hasNonInteractiveCredentials()) {
    description = await prompt(`Enter app description (optional): `);
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // Sign in with centralized auth (handles interactive + non-interactive)
    const userCredential = await authenticateUser(auth);
    const user = userCredential.user;

    // Check if app already exists
    log(chalk.blue(`📡 Checking if app '${appId}' exists...`));
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    /** @type {boolean} */
    let alreadyExisted = false;

    if (appSnap.exists()) {
      const existingApp = appSnap.data();
      if (existingApp.owner !== user.uid) {
        if (flags.json) {
          jsonOutput({ success: false, error: "app_owned_by_other", appId });
        } else {
          console.error(
            chalk.red(`\n❌ Error: App '${appId}' already exists and is owned by another user.`)
          );
          console.log(chalk.yellow(`   Choose a different app ID.`));
        }
        process.exit(1);
      } else {
        alreadyExisted = true;
        log(chalk.yellow(`⚠️  App '${appId}' already exists (you are the owner).`));
        log(chalk.yellow(`   Updating local schema only...\n`));
      }
    } else {
      // Create app document
      log(chalk.blue(`📝 Creating app '${appId}' in Firestore...`));

      await setDoc(appRef, {
        name: appName,
        description: description || `${appName} - built with Basebase`,
        owner: user.uid,
        accessMode: "open", // Default to open for easy development
        currentVersion: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      log(chalk.green(`✓ Created app in Firestore\n`));
    }

    // Copy starter template and update schema file
    await copyStarterTemplate(appId);
    await updateSchemaFile(appId);

    if (flags.json) {
      jsonOutput({
        success: true,
        appId,
        name: appName,
        description: description || `${appName} - built with Basebase`,
        alreadyExisted,
        owner: user.uid,
      });
    } else {
      console.log(chalk.bold.green("✨ App initialization complete!\n"));
      console.log(chalk.cyan("Next steps:"));
      console.log(
        chalk.gray("  1. npm run dev                          - Start development server")
      );
      console.log(
        chalk.gray(`  2. Edit code in apps/${appId}/           - Build your app`)
      );
      console.log(
        chalk.gray(`  3. npm run app:commit ${appId} "message" - Deploy to Firestore\n`)
      );
    }

    process.exit(0);
  } catch (error) {
    if (flags.json) {
      jsonOutput({ success: false, error: error.code || "unknown", message: error.message });
    } else {
      console.error(chalk.red("\n✗ Error:"), error.message);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        console.log(
          chalk.yellow("\n💡 Tip: Make sure you're using the correct email and password.")
        );
      } else if (error.code === "auth/user-not-found") {
        console.log(
          chalk.yellow("\n💡 Tip: Sign up first with: npm run signup -- --email=you@example.com --password=yourpass")
        );
      }
    }
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  const flags = parseGlobalFlags();
  if (flags.json) {
    jsonOutput({ success: false, error: "unexpected", message: error.message });
  } else {
    console.error(chalk.red("\n✗ Error:"), error.message);
    console.error(error.stack);
  }
  process.exit(1);
});
