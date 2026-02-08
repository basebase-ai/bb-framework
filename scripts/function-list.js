#!/usr/bin/env node
/**
 * List all available functions in Firestore
 *
 * Usage:
 *   npm run function:list -- [options]
 *
 * Options:
 *   --email=<email>        Firebase email  (or BASEBASE_EMAIL env var)
 *   --password=<password>  Firebase password (or BASEBASE_PASSWORD env var)
 *   --json                 Output machine-readable JSON
 *
 * NOTE: The -- separator is required to prevent npm from consuming --flags.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  authenticateUser,
  parseGlobalFlags,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);


// Main function
async function listFunctions() {
  const flags = parseGlobalFlags();

  if (!flags.json) {
    console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
    console.log(chalk.bold.blue("║   Basebase - List Functions         ║"));
    console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));
  }

  try {
    // Sign in user
    await authenticateUser(auth);

    // Fetch all functions
    log(chalk.cyan("📡 Fetching functions from Firestore...\n"));
    const functionsCol = collection(db, "functions");
    const snapshot = await getDocs(functionsCol);

    if (snapshot.empty) {
      if (flags.json) {
        jsonOutput({ success: true, functions: [], total: 0 });
      } else {
        console.log(chalk.yellow("No functions found."));
      }
      process.exit(0);
    }

    // Group by type
    /** @type {Array<Record<string, any>>} */
    const framework = [];
    /** @type {Array<Record<string, any>>} */
    const appFunctions = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const func = {
        id: doc.id,
        ...data,
      };

      if (data.type === "framework") {
        framework.push(func);
      } else if (data.type === "app") {
        appFunctions.push(func);
      }
    });

    if (flags.json) {
      /** @type {Array<{ id: string, type: string, appId?: string, description?: string }>} */
      const allFunctions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        allFunctions.push({
          id: doc.id,
          type: data.type || "unknown",
          appId: data.appId || undefined,
          description: data.description || undefined,
        });
      });
      jsonOutput({
        success: true,
        functions: allFunctions,
        total: snapshot.size,
        frameworkCount: framework.length,
        appCount: appFunctions.length,
      });
    } else {
      // Display framework functions
      if (framework.length > 0) {
        console.log(chalk.bold.cyan("🔧 Framework Functions:\n"));
        framework.forEach((func) => {
          console.log(chalk.white(`  ${func.id}`));
          if (func.description) {
            console.log(chalk.gray(`  ${func.description}`));
          }
          console.log(chalk.gray(`  Updated: ${func.updatedAt?.toDate?.()?.toLocaleString() || "N/A"}`));
          console.log();
        });
      }

      // Display app functions
      if (appFunctions.length > 0) {
        console.log(chalk.bold.cyan("📱 App Functions:\n"));
        appFunctions.forEach((func) => {
          console.log(chalk.white(`  ${func.id}`));
          if (func.appId) {
            console.log(chalk.gray(`  App: ${func.appId}`));
          }
          if (func.description) {
            console.log(chalk.gray(`  ${func.description}`));
          }
          console.log(chalk.gray(`  Updated: ${func.updatedAt?.toDate?.()?.toLocaleString() || "N/A"}`));
          console.log();
        });
      }

      console.log(chalk.green(`\n✅ Total functions: ${snapshot.size}`));
      console.log(
        chalk.gray(
          `   Framework: ${framework.length}, App: ${appFunctions.length}\n`
        )
      );
    }
  } catch (error) {
    const flags = parseGlobalFlags();
    if (flags.json) {
      jsonOutput({ success: false, error: error.code || "list_failed", message: error.message });
    } else {
      console.error(chalk.red("\n❌ Error:"), error.message);
    }
    process.exit(1);
  }
}

listFunctions();

