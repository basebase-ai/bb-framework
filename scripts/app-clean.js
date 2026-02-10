#!/usr/bin/env node
/**
 * Remove a committed app's local files from the workspace.
 *
 * Usage:
 *   npm run app:clean -- <appId> [options]
 *
 * Options:
 *   --yes / -y   Auto-confirm if there are uncommitted changes
 *   --json       Output machine-readable JSON
 *
 * NOTE: The -- separator is required to prevent npm from consuming --flags.
 *
 * Examples:
 *   npm run app:clean my-app
 *   npm run app:clean -- my-app --yes --json
 */

import { readFile, readdir, rm, stat } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createHash } from "crypto";
import readline from "readline";
import chalk from "chalk";
import {
  parseGlobalFlags,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appsDir = join(root, "apps");

/**
 * Hash file contents using SHA-256 (same algorithm as app-commit.js).
 * @param {string} content
 * @returns {string}
 */
function hashContent(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

/**
 * Scan all files in a directory recursively and return a map of relative path -> hash.
 * @param {string} dir
 * @param {string} base
 * @returns {Promise<Record<string, string>>}
 */
async function scanFileHashes(dir, base = "") {
  /** @type {Record<string, string>} */
  const hashes = {};
  /** @type {import("fs").Dirent[]} */
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = join(base, entry.name).replace(/\\/g, "/");

    if (entry.name === ".basebase-checkout.json") {
      continue; // Skip the metadata file itself
    }

    if (entry.isDirectory()) {
      const subHashes = await scanFileHashes(fullPath, relativePath);
      Object.assign(hashes, subHashes);
    } else if (entry.isFile()) {
      const content = await readFile(fullPath, "utf-8");
      hashes[relativePath] = hashContent(content);
    }
  }

  return hashes;
}

/**
 * Detect uncommitted changes by comparing current files against checkout metadata.
 * @param {string} appId
 * @returns {Promise<{ hasChanges: boolean, details: string[], neverCommitted: boolean }>}
 */
async function detectUncommittedChanges(appId) {
  const appDir = join(appsDir, appId);
  const metadataPath = join(appDir, ".basebase-checkout.json");

  /** @type {{ checkedOutVersion?: string, fileHashes?: Record<string, string> } | null} */
  let metadata = null;
  try {
    const raw = await readFile(metadataPath, "utf-8");
    metadata = JSON.parse(raw);
  } catch {
    // No metadata file — app was never committed/checked out
    return { hasChanges: false, details: [], neverCommitted: true };
  }

  const savedHashes = metadata?.fileHashes ?? {};
  const currentHashes = await scanFileHashes(appDir);

  /** @type {string[]} */
  const details = [];

  // Check for new or modified files
  for (const [filePath, hash] of Object.entries(currentHashes)) {
    if (!(filePath in savedHashes)) {
      details.push(`  + ${filePath} (new)`);
    } else if (savedHashes[filePath] !== hash) {
      details.push(`  ~ ${filePath} (modified)`);
    }
  }

  // Check for deleted files
  for (const filePath of Object.keys(savedHashes)) {
    if (!(filePath in currentHashes)) {
      details.push(`  - ${filePath} (deleted)`);
    }
  }

  return { hasChanges: details.length > 0, details, neverCommitted: false };
}

/**
 * Prompt user for confirmation (skipped when --yes flag is set).
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function promptConfirmation(question) {
  const flags = parseGlobalFlags();
  if (flags.yes) return Promise.resolve(true);

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      /** @type {string} */
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

/**
 * Parse positional arguments (skip --flags).
 * @returns {string[]}
 */
function getPositionalArgs() {
  return process.argv.slice(2).filter((arg) => !arg.startsWith("--") && arg !== "-y");
}

async function main() {
  const flags = parseGlobalFlags();

  if (!flags.json) {
    console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
    console.log(chalk.bold.blue("║   Basebase - Clean App              ║"));
    console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));
  }

  const positionalArgs = getPositionalArgs();
  /** @type {string | undefined} */
  const appId = positionalArgs[0];

  if (!appId) {
    if (flags.json) {
      jsonOutput({ success: false, error: "missing_app_id", message: "Usage: npm run app:clean -- <appId>" });
    } else {
      console.error(chalk.red("❌ Missing appId argument."));
      console.error(chalk.gray("\nUsage: npm run app:clean -- <appId> [--yes] [--json]\n"));
    }
    process.exit(1);
  }

  const appDir = join(appsDir, appId);

  // Check if the app directory exists locally
  try {
    const dirStat = await stat(appDir);
    if (!dirStat.isDirectory()) {
      throw new Error("Not a directory");
    }
  } catch {
    if (flags.json) {
      jsonOutput({ success: false, error: "not_found", message: `App directory apps/${appId} does not exist locally.` });
    } else {
      console.error(chalk.red(`❌ App directory apps/${appId} does not exist locally.`));
    }
    process.exit(1);
  }

  // Detect uncommitted changes
  log(chalk.cyan("🔍 Checking for uncommitted changes...\n"));
  const { hasChanges, details, neverCommitted } = await detectUncommittedChanges(appId);

  if (neverCommitted) {
    log(chalk.yellow("⚠️  No checkout metadata found — this app may have uncommitted local changes.\n"));
    const confirmed = await promptConfirmation(
      chalk.yellow("Proceed with deletion? (y/N): ")
    );
    if (!confirmed) {
      if (flags.json) {
        jsonOutput({ success: false, error: "cancelled", message: "User cancelled deletion." });
      } else {
        console.log(chalk.gray("Cancelled."));
      }
      process.exit(0);
    }
  } else if (hasChanges) {
    log(chalk.yellow("⚠️  Uncommitted changes detected:\n"));
    for (const detail of details) {
      log(chalk.yellow(detail));
    }
    log("");
    const confirmed = await promptConfirmation(
      chalk.yellow("These changes will be lost. Proceed? (y/N): ")
    );
    if (!confirmed) {
      if (flags.json) {
        jsonOutput({ success: false, error: "cancelled", message: "User cancelled due to uncommitted changes." });
      } else {
        console.log(chalk.gray("Cancelled."));
      }
      process.exit(0);
    }
  } else {
    log(chalk.green("✓ No uncommitted changes detected.\n"));
  }

  // Delete the directory
  log(chalk.cyan(`🗑️  Removing apps/${appId}...`));
  await rm(appDir, { recursive: true, force: true });

  if (flags.json) {
    jsonOutput({ success: true, appId, message: `App directory apps/${appId} removed.` });
  } else {
    console.log(chalk.green(`\n✅ Cleaned apps/${appId} from workspace.\n`));
  }

  process.exit(0);
}

main();
