#!/usr/bin/env node
/**
 * Checkout function code from Firestore to local /functions directory
 *
 * Usage:
 *   npm run function:checkout <filename.js> [options]
 *
 * Options:
 *   --email=<email>        Firebase email  (or BASEBASE_EMAIL env var)
 *   --password=<password>  Firebase password (or BASEBASE_PASSWORD env var)
 *   --json                 Output machine-readable JSON
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  authenticateUser,
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

// Main checkout function
async function checkout(functionId) {
  const flags = parseGlobalFlags();
  log(chalk.cyan(`\n📥 Checking out function: ${functionId}\n`));

  try {
    // Sign in user
    await authenticateUser(auth);

    // Get function document
    log(chalk.cyan("📡 Fetching function from Firestore..."));
    const functionRef = doc(db, "functions", functionId);
    const functionSnap = await getDoc(functionRef);

    if (!functionSnap.exists()) {
      if (flags.json) {
        jsonOutput({ success: false, error: "function_not_found", functionId });
      } else {
        console.error(chalk.red(`❌ Function "${functionId}" not found`));
      }
      process.exit(1);
    }

    const functionData = functionSnap.data();

    log(chalk.gray(`   Type: ${functionData.type || "unknown"}`));
    if (functionData.appId) {
      log(chalk.gray(`   App: ${functionData.appId}`));
    }
    if (functionData.description) {
      log(chalk.gray(`   ${functionData.description}`));
    }

    // Ensure functions directory exists
    await mkdir(functionsDir, { recursive: true });

    // Write function code to file
    const filePath = join(functionsDir, `${functionId}.js`);
    await writeFile(filePath, functionData.code, "utf-8");

    if (flags.json) {
      jsonOutput({
        success: true,
        functionId,
        file: `functions/${functionId}.js`,
        type: functionData.type || "unknown",
        appId: functionData.appId || null,
      });
    } else {
      console.log(chalk.green(`\n✅ Checkout complete!`));
      console.log(chalk.gray(`   Function: ${functionId}`));
      console.log(chalk.gray(`   File: functions/${functionId}.js`));
      console.log(chalk.white(`\n📝 You can now edit the function locally.\n`));
    }

    process.exit(0);
  } catch (error) {
    if (flags.json) {
      jsonOutput({ success: false, error: error.code || "checkout_failed", message: error.message });
    } else {
      console.error(chalk.red("\n❌ Checkout failed:"), error.message);
    }
    process.exit(1);
  }
}

// Get function ID from command line — skip --flags
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
    console.log(chalk.gray("\nUsage: npm run function:checkout <filename.js> [--email=X --password=X --json]"));
    console.log(chalk.gray("Example: npm run function:checkout askLLM.js\n"));
  }
  process.exit(1);
}

// Strip .js extension if provided
if (functionId.endsWith(".js")) {
  functionId = functionId.slice(0, -3);
}

checkout(functionId);
