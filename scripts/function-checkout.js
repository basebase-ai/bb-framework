#!/usr/bin/env node
/**
 * Checkout function code from Firestore to local /functions directory
 * Usage: npm run function:checkout <functionId>
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import { authenticateUser } from "./lib/auth-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const functionsDir = join(root, "functions");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// Main checkout function
async function checkout(functionId) {
  console.log(chalk.cyan(`\n📥 Checking out function: ${functionId}\n`));

  try {
    // Sign in user
    await authenticateUser(auth);

    // Get function document
    console.log(chalk.cyan("📡 Fetching function from Firestore..."));
    const functionRef = doc(db, "functions", functionId);
    const functionSnap = await getDoc(functionRef);

    if (!functionSnap.exists()) {
      console.error(chalk.red(`❌ Function "${functionId}" not found`));
      process.exit(1);
    }

    const functionData = functionSnap.data();

    console.log(chalk.gray(`   Type: ${functionData.type || "unknown"}`));
    if (functionData.appId) {
      console.log(chalk.gray(`   App: ${functionData.appId}`));
    }
    if (functionData.description) {
      console.log(chalk.gray(`   ${functionData.description}`));
    }

    // Ensure functions directory exists
    await mkdir(functionsDir, { recursive: true });

    // Write function code to file
    const filePath = join(functionsDir, `${functionId}.js`);
    await writeFile(filePath, functionData.code, "utf-8");

    console.log(chalk.green(`\n✅ Checkout complete!`));
    console.log(chalk.gray(`   Function: ${functionId}`));
    console.log(chalk.gray(`   File: functions/${functionId}.js`));
    console.log(chalk.white(`\n📝 You can now edit the function locally.\n`));
    
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("\n❌ Checkout failed:"), error.message);
    process.exit(1);
  }
}

// Get function ID from command line
const functionId = process.argv[2];

if (!functionId) {
  console.error(chalk.red("\n❌ Function ID is required"));
  console.log(chalk.gray("\nUsage: npm run function:checkout <functionId>"));
  console.log(chalk.gray("Example: npm run function:checkout askLLM\n"));
  process.exit(1);
}

checkout(functionId);

