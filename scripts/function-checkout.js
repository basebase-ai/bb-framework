#!/usr/bin/env node
/**
 * Checkout function code from Firestore to local /functions directory
 * Usage: npm run function:checkout <functionId>
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import readline from "readline";
import { firebaseConfig } from "../config/firebase.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const functionsDir = join(root, "functions");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper to prompt for input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Helper to prompt for password (hidden input)
function promptPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let password = "";

    process.stdout.write(question);

    stdin.removeAllListeners("data");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char) => {
      char = char.toString("utf8");

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          break;
        case "\u0003":
          process.exit();
          break;
        case "\u007f":
          password = password.slice(0, -1);
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(question + "*".repeat(password.length));
          break;
        default:
          password += char;
          process.stdout.write("*");
          break;
      }
    };

    stdin.on("data", onData);
  });
}

// Sign in user
async function signIn() {
  console.log(chalk.cyan("\n🔐 Authentication required\n"));

  const email = await prompt("Email: ");
  const password = await promptPassword("Password: ");

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  console.log(chalk.green(`✅ Signed in as ${userCredential.user.email}\n`));

  return userCredential.user;
}

// Main checkout function
async function checkout(functionId) {
  console.log(chalk.cyan(`\n📥 Checking out function: ${functionId}\n`));

  try {
    // Sign in user
    await signIn();

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

