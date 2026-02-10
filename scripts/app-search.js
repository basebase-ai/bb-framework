#!/usr/bin/env node
/**
 * Search accessible apps by name/description (or list all with no query).
 *
 * Returns apps where you are the owner, an explicit collaborator, or publicEdit is true.
 * With no search query, lists all accessible apps.
 *
 * Usage:
 *   npm run app:search                              # list all accessible apps
 *   npm run app:search -- <query> [options]          # search by keyword
 *
 * Options:
 *   --email=<email>        Firebase email  (or BASEBASE_EMAIL env var)
 *   --password=<password>  Firebase password (or BASEBASE_PASSWORD env var)
 *   --json                 Output machine-readable JSON
 *
 * NOTE: The -- separator is required to prevent npm from consuming --flags.
 *
 * Examples:
 *   npm run app:search
 *   npm run app:search recipe
 *   npm run app:search -- "recipe" --json
 *   npm run app:search -- --email=me@x.com --password=secret --json
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  authenticateUser,
  parseGlobalFlags,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";
import { fetchAccessibleApps } from "./lib/app-query-utils.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/**
 * Parse positional arguments (skip --flags and known flag values).
 * @returns {string[]}
 */
function getPositionalArgs() {
  const args = process.argv.slice(2);
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--yes" || arg === "-y" || arg === "--json") {
      continue;
    }
    if (arg.startsWith("--") && arg.includes("=")) {
      continue; // e.g. --email=foo
    }
    if (arg.startsWith("--") && i + 1 < args.length) {
      i++; // skip both --flag and its value
      continue;
    }
    positional.push(arg);
  }
  return positional;
}

/**
 * Format a role label for human-readable display.
 * @param {"owner" | "collaborator" | "public"} role
 * @returns {string}
 */
function formatRole(role) {
  switch (role) {
    case "owner":
      return chalk.green("owner");
    case "collaborator":
      return chalk.cyan("collaborator");
    case "public":
      return chalk.gray("public");
    default:
      return chalk.gray(role);
  }
}

async function main() {
  const flags = parseGlobalFlags();

  if (!flags.json) {
    console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
    console.log(chalk.bold.blue("║   Basebase - Search Apps            ║"));
    console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));
  }

  try {
    // Authenticate
    const userCredential = await authenticateUser(auth);
    /** @type {string} */
    const uid = userCredential.user.uid;

    // Parse optional search query (all positional args joined)
    const positionalArgs = getPositionalArgs();
    /** @type {string} */
    const searchQuery = positionalArgs.join(" ").trim().toLowerCase();
    /** @type {boolean} */
    const isSearch = searchQuery.length > 0;

    if (isSearch) {
      log(chalk.cyan(`🔍 Searching apps for "${positionalArgs.join(" ")}"...\n`));
    } else {
      log(chalk.cyan("📋 Fetching all accessible apps...\n"));
    }

    // Fetch all accessible apps
    const allApps = await fetchAccessibleApps(db, uid);

    // Filter by search query if provided
    const apps = isSearch
      ? allApps.filter((app) => {
          /** @type {string} */
          const name = (app.name || "").toLowerCase();
          /** @type {string} */
          const description = (app.description || "").toLowerCase();
          /** @type {string} */
          const id = app.id.toLowerCase();
          return (
            name.includes(searchQuery) ||
            description.includes(searchQuery) ||
            id.includes(searchQuery)
          );
        })
      : allApps;

    if (apps.length === 0) {
      if (flags.json) {
        jsonOutput({
          success: true,
          apps: [],
          total: 0,
          query: isSearch ? positionalArgs.join(" ") : null,
        });
      } else if (isSearch) {
        console.log(chalk.yellow(`No apps matching "${positionalArgs.join(" ")}" found.`));
      } else {
        console.log(chalk.yellow("No accessible apps found."));
      }
      process.exit(0);
    }

    if (flags.json) {
      jsonOutput({
        success: true,
        apps: apps.map((app) => ({
          id: app.id,
          name: app.name,
          description: app.description,
          role: app.role,
          owner: app.owner,
          currentVersion: app.currentVersion,
          updatedAt: app.updatedAt,
          accessMode: app.accessMode,
        })),
        total: apps.length,
        query: isSearch ? positionalArgs.join(" ") : null,
      });
    } else {
      // Human-readable table
      for (const app of apps) {
        console.log(chalk.white.bold(`  ${app.id}`));
        if (app.name) {
          console.log(chalk.white(`    Name: ${app.name}`));
        }
        if (app.description) {
          console.log(chalk.gray(`    ${app.description}`));
        }
        console.log(`    Role: ${formatRole(app.role)}`);
        if (app.updatedAt) {
          console.log(chalk.gray(`    Updated: ${new Date(app.updatedAt).toLocaleString()}`));
        }
        console.log();
      }

      /** @type {string} */
      const label = isSearch ? `matches for "${positionalArgs.join(" ")}"` : "accessible apps";
      console.log(chalk.green(`✅ ${apps.length} ${label}\n`));
    }
  } catch (error) {
    if (flags.json) {
      jsonOutput({
        success: false,
        error: /** @type {any} */ (error).code || "search_failed",
        message: /** @type {Error} */ (error).message,
      });
    } else {
      console.error(chalk.red("\n❌ Error:"), /** @type {Error} */ (error).message);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
