#!/usr/bin/env node
/**
 * Generate Firestore composite indexes (firestore.indexes.json) from all app schemas.
 *
 * Scans every apps/<appId>/schema.js, collects the `indexes` arrays from each
 * collection definition, deduplicates, and writes a standard
 * firestore.indexes.json that can be deployed with:
 *
 *   firebase deploy --only firestore:indexes
 *
 * Usage:
 *   npm run generate:indexes            # scan all apps
 *   npm run generate:indexes blog crm   # scan specific apps only
 */

import { readdir, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appsDir = join(root, "apps");
const outputPath = join(root, "firestore.indexes.json");

/**
 * Convert an index field-list from a schema into a Firestore composite index
 * entry.  The last field defaults to ASCENDING unless specified; if the array
 * entry is itself an array of [field, order] it is honoured as-is.
 *
 * Schema format examples:
 *   ["owner", "createdAt"]                -> both ASCENDING
 *   ["owner", ["createdAt", "desc"]]      -> owner ASC, createdAt DESC
 *
 * @param {string} collectionId
 * @param {Array<string | [string, string]>} fields
 * @returns {{ collectionGroup: string, queryScope: string, fields: Array<{ fieldPath: string, order: string }> }}
 */
function buildIndexEntry(collectionId, fields) {
  return {
    collectionGroup: collectionId,
    queryScope: "COLLECTION",
    fields: fields.map((f) => {
      if (Array.isArray(f)) {
        const [fieldPath, dir = "ASCENDING"] = f;
        return {
          fieldPath,
          order: dir.toUpperCase() === "DESC" ? "DESCENDING" : "ASCENDING",
        };
      }
      return { fieldPath: f, order: "ASCENDING" };
    }),
  };
}

/**
 * Stable JSON key for deduplication.
 * @param {{ collectionGroup: string, fields: Array<{ fieldPath: string, order: string }> }} entry
 * @returns {string}
 */
function indexKey(entry) {
  const fieldsPart = entry.fields
    .map((f) => `${f.fieldPath}:${f.order}`)
    .join(",");
  return `${entry.collectionGroup}|${fieldsPart}`;
}

async function generateIndexes() {
  console.log(
    chalk.cyan("\n📇 Generating Firestore composite indexes from app schemas...\n")
  );

  // Determine which apps to scan
  /** @type {string[]} */
  const requestedApps = process.argv.slice(2).filter((a) => !a.startsWith("--"));

  /** @type {string[]} */
  let appIds;
  if (requestedApps.length > 0) {
    appIds = requestedApps;
  } else {
    const entries = await readdir(appsDir, { withFileTypes: true });
    appIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }

  /** @type {Map<string, ReturnType<typeof buildIndexEntry>>} */
  const seen = new Map();
  /** @type {number} */
  let totalCollections = 0;

  for (const appId of appIds) {
    const schemaPath = join(appsDir, appId, "schema.js");

    /** @type {{ schema?: Record<string, { indexes?: Array<Array<string | [string, string]>> }> }} */
    let schemaModule;
    try {
      schemaModule = await import(`file://${schemaPath}`);
    } catch {
      // No schema.js for this app — skip silently
      continue;
    }

    const schema = schemaModule.schema;
    if (!schema) continue;

    for (const [collectionId, config] of Object.entries(schema)) {
      if (!config.indexes || config.indexes.length === 0) continue;

      // Only composite indexes (2+ fields) need to be in firestore.indexes.json.
      // Single-field indexes are created automatically by Firestore.
      /** @type {Array<Array<string | [string, string]>>} */
      const compositeIndexes = config.indexes.filter(
        (idx) => Array.isArray(idx) && idx.length >= 2
      );
      if (compositeIndexes.length === 0) continue;

      totalCollections++;

      for (const idx of compositeIndexes) {
        const entry = buildIndexEntry(collectionId, idx);
        const key = indexKey(entry);
        if (!seen.has(key)) {
          seen.set(key, entry);
        }
      }
    }

    if (schemaModule.schema) {
      console.log(chalk.gray(`  ✓ ${appId}`));
    }
  }

  /** @type {Array<ReturnType<typeof buildIndexEntry>>} */
  const indexes = [...seen.values()];

  const output = {
    indexes,
    fieldOverrides: [],
  };

  await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n");

  console.log(chalk.green(`\n✅ Generated ${indexes.length} composite indexes!`));
  console.log(chalk.gray(`   From ${totalCollections} collections across ${appIds.length} apps`));
  console.log(chalk.gray(`   Output: ${outputPath}\n`));
  console.log(chalk.yellow("📋 Next steps:"));
  console.log(
    chalk.white("   1. Review"),
    chalk.cyan("firestore.indexes.json")
  );
  console.log(
    chalk.white("   2. Deploy with:"),
    chalk.cyan("firebase deploy --only firestore:indexes")
  );
  console.log();
}

generateIndexes().catch((err) => {
  console.error(chalk.red("\n❌ Failed to generate indexes:"), err.message);
  process.exit(1);
});
