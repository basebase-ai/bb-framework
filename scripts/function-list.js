#!/usr/bin/env node
/**
 * List all available functions in Firestore
 * Usage: npm run function:list
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import { authenticateUser } from "./lib/auth-utils.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// Main function
async function listFunctions() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   Basebase - List Functions         ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));

  try {
    // Sign in user
    await authenticateUser(auth);

    // Fetch all functions
    console.log(chalk.cyan("📡 Fetching functions from Firestore...\n"));
    const functionsCol = collection(db, "functions");
    const snapshot = await getDocs(functionsCol);

    if (snapshot.empty) {
      console.log(chalk.yellow("No functions found."));
      process.exit(0);
    }

    // Group by type
    const framework = [];
    const app = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const func = {
        id: doc.id,
        ...data,
      };

      if (data.type === "framework") {
        framework.push(func);
      } else if (data.type === "app") {
        app.push(func);
      }
    });

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
    if (app.length > 0) {
      console.log(chalk.bold.cyan("📱 App Functions:\n"));
      app.forEach((func) => {
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
        `   Framework: ${framework.length}, App: ${app.length}\n`
      )
    );
  } catch (error) {
    console.error(chalk.red("\n❌ Error:"), error.message);
    process.exit(1);
  }
}

listFunctions();

