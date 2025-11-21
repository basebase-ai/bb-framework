#!/usr/bin/env node

/**
 * Initialize a new app
 * - Sets the APP_ID in schema.js (local only, no Firebase required)
 */

import { readFile, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import * as readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const schemaPath = resolve(rootDir, "app/schema.js");

// Helper to prompt for user input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
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

// Update APP_ID in schema.js
async function updateSchemaFile(appId) {
  console.log(chalk.blue("📝 Updating schema.js..."));

  let schemaContent = await readFile(schemaPath, "utf-8");

  // Replace the APP_ID value
  schemaContent = schemaContent.replace(
    /export const APP_ID = ['"].*?['"];/,
    `export const APP_ID = '${appId}';`
  );

  await writeFile(schemaPath, schemaContent, "utf-8");

  console.log(chalk.green(`✓ Updated APP_ID to '${appId}' in app/schema.js\n`));
}

// Main function
async function main() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   Basebase Framework - App Init     ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));

  // Get app ID from command line or prompt
  let appId = process.argv[2];

  if (!appId) {
    appId = await prompt("Enter app ID (kebab-case, e.g., my-app): ");
  }

  // Validate app ID
  const validationError = validateAppId(appId);
  if (validationError) {
    console.error(chalk.red(`✗ Invalid app ID: ${validationError}`));
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

  // Update schema file
  await updateSchemaFile(appId);

  console.log(chalk.bold.green("✨ App initialization complete!\n"));
  console.log(chalk.cyan("Next steps:"));
  console.log(
    chalk.gray(
      "  1. npm run dev                          - Start development server"
    )
  );
  console.log(
    chalk.gray(
      "  2. Sign up at http://localhost:3000     - Create Firebase account"
    )
  );
  console.log(
    chalk.gray(
      '  3. Click "Add Sample App"               - Create app document'
    )
  );
  console.log(
    chalk.gray("  4. Edit code in /app                    - Build your app")
  );
  console.log(
    chalk.gray(
      '  5. npm run app:commit "message"         - Deploy to Firestore\n'
    )
  );
  console.log(
    chalk.yellow("⚠️  Note: You'll need a Firebase account for step 5 (commit)")
  );

  process.exit(0);
}

// Run
main().catch((error) => {
  console.error(chalk.red("\n✗ Error:"), error.message);
  console.error(error.stack);
  process.exit(1);
});
