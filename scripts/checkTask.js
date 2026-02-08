#!/usr/bin/env node

/**
 * Simple script to check task status and results
 * Usage: node scripts/checkTask.js <taskId>
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  authenticateUser,
  hasNonInteractiveCredentials,
  parseGlobalFlags,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";

// Initialize Firebase with public config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Check if running in an interactive terminal
function checkInteractive() {
  if (hasNonInteractiveCredentials()) return;
  if (process.stdin.isTTY) return;

  console.error(
    chalk.red("\n❌ ERROR: This command requires an interactive terminal or --email/--password flags.\n")
  );
  console.log(
    chalk.yellow("Provide credentials via CLI flags or environment variables:\n")
  );
  console.log(
    chalk.cyan(
      `  node scripts/checkTask.js "${process.argv[2] || "<taskId>"}" --email=you@example.com --password=yourpass\n`
    )
  );
  process.exit(1);
}

/**
 * @param {string} taskId
 */
async function checkTask(taskId) {
  if (!taskId) {
    console.log(chalk.cyan(`
📋 Check Task Script

USAGE:
  node scripts/checkTask.js <taskId>

EXAMPLES:
  node scripts/checkTask.js fieommvC8LnboCF2DAnL
  node scripts/checkTask.js xwbc8wbovzco0eaeb4rk
`));
    process.exit(0);
  }

  // Ensure we're in an interactive terminal
  checkInteractive();

  console.log(chalk.cyan(`\n🔍 Checking task: ${taskId}\n`));

  try {
    // Sign in user
    await authenticateUser(auth);

    // Get task document from Firestore
    const taskRef = doc(db, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      console.error(chalk.red(`❌ Task not found: ${taskId}`));
      process.exit(1);
    }

    const taskData = taskSnap.data();

    console.log("─".repeat(50));
    console.log(chalk.white(`📋 Task ID: ${taskId}`));
    console.log(chalk.white(`📊 Status: ${taskData.status || "unknown"}`));

    if (taskData.createdAt) {
      const createdAt = taskData.createdAt?.toDate?.() || taskData.createdAt;
      console.log(chalk.white(`⏰ Created: ${createdAt}`));
    }

    if (taskData.startedAt) {
      const startedAt = taskData.startedAt?.toDate?.() || taskData.startedAt;
      console.log(chalk.white(`🚀 Started: ${startedAt}`));
    }

    if (taskData.completedAt) {
      const completedAt =
        taskData.completedAt?.toDate?.() || taskData.completedAt;
      console.log(chalk.white(`✅ Completed: ${completedAt}`));
    }

    if (taskData.metadata?.duration) {
      console.log(chalk.white(`⏱️  Duration: ${taskData.metadata.duration}ms`));
    }

    if (taskData.metadata?.retryCount) {
      console.log(
        chalk.white(`🔄 Retry Count: ${taskData.metadata.retryCount}`)
      );
    }

    console.log("\n" + "─".repeat(50));

    if (taskData.status === "completed" && taskData.result) {
      console.log(chalk.green("🎉 RESULT:"));
      console.log(JSON.stringify(taskData.result, null, 2));
    } else if (taskData.status === "failed" && taskData.error) {
      console.log(chalk.red("❌ ERROR:"));
      console.log(chalk.red(`Message: ${taskData.error.message}`));
      if (taskData.error.stack) {
        console.log(chalk.gray(`Stack: ${taskData.error.stack}`));
      }
    } else if (taskData.status === "running") {
      console.log(chalk.yellow("⏳ Task is currently running..."));
    } else if (taskData.status === "pending") {
      console.log(chalk.yellow("⏸️  Task is pending..."));
    } else {
      console.log(chalk.gray("📝 No result or error data available"));
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`❌ Failed to check task: ${errorMessage}`));
    process.exit(1);
  }

  process.exit(0);
}

// Main execution
const taskId = process.argv[2];
checkTask(taskId);
