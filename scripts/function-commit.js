#!/usr/bin/env node
/**
 * Commit local function code to Firestore
 *
 * Usage:
 *   npm run function:commit -- <filename.js> [options]
 *
 * Options:
 *   --app=<appId>          Mark as app-specific function
 *   --type=<type>          Function type (app, framework)
 *   --email=<email>        Firebase email  (or BASEBASE_EMAIL env var)
 *   --password=<password>  Firebase password (or BASEBASE_PASSWORD env var)
 *   --json                 Output machine-readable JSON
 *
 * NOTE: The -- separator is required to prevent npm from consuming --flags.
 *
 * Examples:
 *   npm run function:commit myFunc.js --app=crm
 *   npm run function:commit -- myFunc.js --email=me@x.com --password=secret --json
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  authenticateUser,
  hasNonInteractiveCredentials,
  parseGlobalFlags,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const functionsDir = join(root, "functions");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Extract JSDoc metadata from function code
function parseJSDoc(code) {
  const jsdocMatch = code.match(/\/\*\*([\s\S]*?)\*\//);
  if (!jsdocMatch) {
    return {
      description: null,
      parameters: {},
    };
  }

  const jsdoc = jsdocMatch[1];

  // Extract description (first line(s) before @param)
  const descMatch = jsdoc.match(/\*\s+([^@]+)/);
  const description = descMatch ? descMatch[1].trim() : null;

  // Extract parameters
  const parameters = {};
  const paramMatches = jsdoc.matchAll(
    /@param\s+\{([^}]+)\}\s+(\[?)([^\s\]]+)(\])?\s*-?\s*(.+)?/g
  );

  for (const match of paramMatches) {
    const [, type, optionalStart, name, optionalEnd, desc] = match;
    const isOptional = !!(optionalStart && optionalEnd);
    const cleanName = name.replace(/\[|\]/g, "");

    parameters[cleanName] = {
      type: type.trim(),
      description: desc ? desc.trim() : "",
      optional: isOptional,
    };
  }

  return {
    description,
    parameters,
  };
}

// Main commit function
async function commit(functionId, options = {}) {
  const flags = parseGlobalFlags();
  log(chalk.cyan(`\n📤 Committing function: ${functionId}\n`));

  try {
    // Sign in user
    const userCredential = await authenticateUser(auth);
    const user = userCredential.user;

    // Read function file
    const filePath = join(functionsDir, `${functionId}.js`);
    log(chalk.cyan("📖 Reading function file..."));

    /** @type {string} */
    let code;
    try {
      code = await readFile(filePath, "utf-8");
    } catch (error) {
      if (flags.json) {
        jsonOutput({ success: false, error: "file_not_found", file: `functions/${functionId}.js` });
      } else {
        console.error(chalk.red(`❌ File not found: functions/${functionId}.js`));
        console.log(chalk.gray("\nMake sure the function file exists locally."));
      }
      process.exit(1);
    }

    // Parse JSDoc metadata
    const metadata = parseJSDoc(code);

    log(chalk.gray(`   Size: ${(code.length / 1024).toFixed(1)}kb`));
    if (metadata.description) {
      log(chalk.gray(`   Description: ${metadata.description}`));
    }
    log(chalk.gray(`   Parameters: ${Object.keys(metadata.parameters).length}`));

    // Build function document
    const functionDoc = {
      code,
      description: metadata.description,
      parameters: metadata.parameters,
      type: options.type || "app",
      appId: options.appId || null,
      version: "1.0.0",
      source: "uploaded",
      dependencies: [], // Could be extracted from require/import statements
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    // Upload to Firestore
    log(chalk.cyan("\n📤 Uploading to Firestore..."));
    const functionRef = doc(db, "functions", functionId);
    await setDoc(functionRef, functionDoc);

    if (flags.json) {
      jsonOutput({
        success: true,
        functionId,
        type: functionDoc.type,
        appId: functionDoc.appId,
        description: metadata.description,
      });
    } else {
      console.log(chalk.green("\n✅ Commit successful!"));
      console.log(chalk.gray(`   Function: ${functionId}`));
      console.log(chalk.gray(`   Type: ${functionDoc.type}`));
      if (functionDoc.appId) {
        console.log(chalk.gray(`   App: ${functionDoc.appId}`));
      }
      console.log(chalk.white("\n🌍 Your function is now live and callable!\n"));
    }
    process.exit(0);
  } catch (error) {
    if (flags.json) {
      jsonOutput({ success: false, error: error.code || "commit_failed", message: error.message });
    } else {
      console.error(chalk.red("\n❌ Commit failed:"), error.message);
    }
    process.exit(1);
  }
}

// Parse command line arguments — skip --flags for positional arg extraction
/** @type {string | undefined} */
let functionId;

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--") || arg === "-y") continue;
  if (!functionId) {
    functionId = arg;
    break;
  }
}

const flags = parseGlobalFlags();

if (!functionId) {
  if (flags.json) {
    jsonOutput({ success: false, error: "missing_function_id", message: "Function filename is required" });
  } else {
    console.error(chalk.red("\n❌ Function filename is required"));
    console.log(
      chalk.gray("\nUsage: npm run function:commit <filename.js> [options]")
    );
    console.log(chalk.gray("Options:"));
    console.log(chalk.gray("  --app=<appId>          Mark as app-specific function"));
    console.log(chalk.gray("  --type=<type>          Function type (app, framework)"));
    console.log(chalk.gray("  --email=<email>        Firebase email"));
    console.log(chalk.gray("  --password=<password>  Firebase password"));
    console.log(chalk.gray("  --json                 Output machine-readable JSON"));
    console.log(
      chalk.gray("\nExample: npm run function:commit myFunction.js --app=crm\n")
    );
  }
  process.exit(1);
}

// Strip .js extension if provided
if (functionId.endsWith(".js")) {
  functionId = functionId.slice(0, -3);
}

// Parse options
/** @type {{ appId?: string, type?: string }} */
const options = {};
for (let i = 3; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--app=")) {
    options.appId = arg.split("=")[1];
  } else if (arg.startsWith("--type=")) {
    options.type = arg.split("=")[1];
  }
}

commit(functionId, options);
