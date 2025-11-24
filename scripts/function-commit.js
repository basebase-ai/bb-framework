#!/usr/bin/env node
/**
 * Commit local function code to Firestore
 * Usage: npm run function:commit <functionId> [options]
 * Options:
 *   --app=<appId>   - Mark as app-specific function
 *   --type=<type>   - Function type (app, framework)
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFile } from "fs/promises";
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
  const paramMatches = jsdoc.matchAll(/@param\s+\{([^}]+)\}\s+(\[?)([^\s\]]+)(\])?\s*-?\s*(.+)?/g);
  
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
  console.log(chalk.cyan(`\n📤 Committing function: ${functionId}\n`));

  try {
    // Sign in user
    const user = await signIn();

    // Read function file
    const filePath = join(functionsDir, `${functionId}.js`);
    console.log(chalk.cyan("📖 Reading function file..."));
    
    let code;
    try {
      code = await readFile(filePath, "utf-8");
    } catch (error) {
      console.error(chalk.red(`❌ File not found: functions/${functionId}.js`));
      console.log(chalk.gray("\nMake sure the function file exists locally."));
      process.exit(1);
    }

    // Parse JSDoc metadata
    const metadata = parseJSDoc(code);
    
    console.log(chalk.gray(`   Size: ${(code.length / 1024).toFixed(1)}kb`));
    if (metadata.description) {
      console.log(chalk.gray(`   Description: ${metadata.description}`));
    }
    console.log(chalk.gray(`   Parameters: ${Object.keys(metadata.parameters).length}`));

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
    console.log(chalk.cyan("\n📤 Uploading to Firestore..."));
    const functionRef = doc(db, "functions", functionId);
    await setDoc(functionRef, functionDoc);

    console.log(chalk.green("\n✅ Commit successful!"));
    console.log(chalk.gray(`   Function: ${functionId}`));
    console.log(chalk.gray(`   Type: ${functionDoc.type}`));
    if (functionDoc.appId) {
      console.log(chalk.gray(`   App: ${functionDoc.appId}`));
    }
    console.log(chalk.white("\n🌍 Your function is now live and callable!\n"));
  } catch (error) {
    console.error(chalk.red("\n❌ Commit failed:"), error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const functionId = process.argv[2];
const options = {};

if (!functionId || functionId.startsWith("--")) {
  console.error(chalk.red("\n❌ Function ID is required"));
  console.log(chalk.gray("\nUsage: npm run function:commit <functionId> [options]"));
  console.log(chalk.gray("Options:"));
  console.log(chalk.gray("  --app=<appId>   Mark as app-specific function"));
  console.log(chalk.gray("  --type=<type>   Function type (app, framework)"));
  console.log(chalk.gray("\nExample: npm run function:commit myFunction --app=crm\n"));
  process.exit(1);
}

// Parse options
for (let i = 3; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--app=")) {
    options.appId = arg.split("=")[1];
  } else if (arg.startsWith("--type=")) {
    options.type = arg.split("=")[1];
  }
}

commit(functionId, options);

