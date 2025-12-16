#!/usr/bin/env node

/**
 * Simple script to check task status and results
 * Usage: node scripts/checkTask.js <taskId>
 */

const { firebaseClient } = require("../lib/firebaseClient");

async function checkTask(taskId) {
  if (!taskId) {
    console.log(`
📋 Check Task Script

USAGE:
  node scripts/checkTask.js <taskId>

EXAMPLES:
  node scripts/checkTask.js fieommvC8LnboCF2DAnL
  node scripts/checkTask.js xwbc8wbovzco0eaeb4rk
`);
    process.exit(0);
  }

  console.log(`🔍 Checking task: ${taskId}`);
  console.log("─".repeat(50));

  try {
    const taskStatus = await firebaseClient.getTaskStatus(taskId);

    console.log(`📋 Task ID: ${taskStatus.taskId}`);
    console.log(`📊 Status: ${taskStatus.status}`);
    console.log(
      `⏰ Created: ${taskStatus.createdAt?.toDate?.() || taskStatus.createdAt}`
    );

    if (taskStatus.startedAt) {
      console.log(
        `🚀 Started: ${
          taskStatus.startedAt?.toDate?.() || taskStatus.startedAt
        }`
      );
    }

    if (taskStatus.completedAt) {
      console.log(
        `✅ Completed: ${
          taskStatus.completedAt?.toDate?.() || taskStatus.completedAt
        }`
      );
    }

    if (taskStatus.metadata?.duration) {
      console.log(`⏱️  Duration: ${taskStatus.metadata.duration}ms`);
    }

    if (taskStatus.metadata?.retryCount) {
      console.log(`🔄 Retry Count: ${taskStatus.metadata.retryCount}`);
    }

    console.log("\n" + "─".repeat(50));

    if (taskStatus.status === "completed" && taskStatus.result) {
      console.log("🎉 RESULT:");
      console.log(JSON.stringify(taskStatus.result, null, 2));
    } else if (taskStatus.status === "failed" && taskStatus.error) {
      console.log("❌ ERROR:");
      console.log(`Message: ${taskStatus.error.message}`);
      if (taskStatus.error.stack) {
        console.log(`Stack: ${taskStatus.error.stack}`);
      }
    } else if (taskStatus.status === "running") {
      console.log("⏳ Task is currently running...");
    } else if (taskStatus.status === "pending") {
      console.log("⏸️  Task is pending...");
    } else {
      console.log("📝 No result or error data available");
    }
  } catch (error) {
    console.error(`❌ Failed to check task: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
const taskId = process.argv[2];
checkTask(taskId);
