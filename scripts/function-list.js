#!/usr/bin/env node
/**
 * List all available functions in Firestore
 * Usage: npm run function:list
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import chalk from "chalk";
import readline from "readline";
import { firebaseConfig } from "../config/firebase.config.js";

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
        case "\u007f": // Backspace
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

// Main function
async function listFunctions() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   Basebase - List Functions         ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));

  try {
    // Sign in user
    await signIn();

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

