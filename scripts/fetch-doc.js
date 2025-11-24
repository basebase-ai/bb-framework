#!/usr/bin/env node
/**
 * Fetch a single Firestore document as JSON
 * Usage: npm run doc:fetch <path>
 * Example: npm run doc:fetch /apps/starter-app
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import chalk from "chalk";
import readline from "readline";
import { firebaseConfig } from "../config/firebase.config.js";

// Initialize Firebase with public config
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

    // Remove any existing listeners to prevent duplicates
    stdin.removeAllListeners("data");

    // Hide input
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char) => {
      char = char.toString("utf8");

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004": // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          break;
        case "\u0003": // Ctrl-C
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.exit();
          break;
        case "\u007f": // Backspace
        case "\b":
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + "*".repeat(password.length));
          }
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
  // Check if running in an interactive terminal
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red("\n❌ ERROR: This command requires an interactive terminal\n")
    );
    console.log(
      chalk.yellow("This script needs to prompt for your email and password.")
    );
    console.log(
      chalk.yellow(
        "AI coding assistants cannot handle interactive password prompts.\n"
      )
    );
    console.log(
      chalk.cyan("Please run this command yourself in your terminal:")
    );
    console.log(
      chalk.white(`  npm run doc:fetch "${process.argv[2] || "/path/to/doc"}"\n`)
    );
    console.log(
      chalk.gray(
        "Then you'll be prompted for your Firebase email and password."
      )
    );
    process.exit(1);
  }

  console.log(chalk.cyan("\n🔐 Authentication required\n"));

  const email = await prompt("Email: ");
  const password = await promptPassword("Password: ");

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log(chalk.green(`✅ Signed in as ${userCredential.user.email}\n`));
    return userCredential.user;
  } catch (error) {
    console.error(chalk.red("❌ Authentication failed:"), error.message);
    process.exit(1);
  }
}

// Parse document path into collection segments
function parseDocPath(path) {
  // Remove leading/trailing slashes and split
  const segments = path.replace(/^\/+|\/+$/g, "").split("/");

  // Firestore paths must have even number of segments (collection/doc/collection/doc...)
  if (segments.length % 2 !== 0) {
    throw new Error(
      `Invalid document path: "${path}". Path must point to a document (even number of segments).`
    );
  }

  return segments;
}

// Fetch document
async function fetchDocument(docPath) {
  console.log(chalk.cyan(`\n📄 Fetching document: ${docPath}\n`));

  try {
    // Sign in user
    await signIn();

    // Parse and validate path
    const segments = parseDocPath(docPath);

    // Get document reference
    const docRef = doc(db, ...segments);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error(chalk.red(`❌ Document not found: ${docPath}`));
      process.exit(1);
    }

    // Get document data
    const data = docSnap.data();

    // Convert Timestamps to ISO strings for JSON serialization
    const jsonData = JSON.parse(
      JSON.stringify(data, (key, value) => {
        // Handle Firestore Timestamps
        if (value && typeof value === "object" && value.toDate) {
          return value.toDate().toISOString();
        }
        return value;
      })
    );

    console.log(chalk.green("✅ Document found!\n"));
    console.log(JSON.stringify(jsonData, null, 2));
  } catch (error) {
    console.error(chalk.red("\n❌ Fetch failed:"), error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse arguments
const docPath = process.argv[2];

if (!docPath) {
  console.error(chalk.red("\n❌ Document path required"));
  console.log(
    chalk.white("\nUsage:"),
    chalk.cyan("npm run doc:fetch <path>")
  );
  console.log(
    chalk.white("Examples:"),
    chalk.cyan("\n  npm run doc:fetch /apps/starter-app")
  );
  console.log(chalk.cyan("  npm run doc:fetch /users/2lk3j2k3j4kj\n"));
  process.exit(1);
}

fetchDocument(docPath);

