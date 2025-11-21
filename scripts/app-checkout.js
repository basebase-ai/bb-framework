#!/usr/bin/env node
/**
 * Checkout app code from Firestore to local /app directory
 * Usage: npm run app:checkout <appId> [version]
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { writeFile, mkdir, rm } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import readline from "readline";
import { firebaseConfig } from "../config/firebase.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "app");

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
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(question);
    
    // Hide input
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    
    stdin.on('data', (char) => {
      char = char.toString('utf8');
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          rl.close();
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

// Sign in user
async function signIn() {
  console.log(chalk.cyan("\n🔐 Authentication required\n"));
  
  const email = await prompt("Email: ");
  const password = await promptPassword("Password: ");
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(chalk.green(`✅ Signed in as ${userCredential.user.email}\n`));
    return userCredential.user;
  } catch (error) {
    console.error(chalk.red("❌ Authentication failed:"), error.message);
    process.exit(1);
  }
}

// Write modules to disk
async function writeModulesToDisk(modules) {
  // Clear existing app directory (except node_modules)
  console.log(chalk.yellow("🗑️  Clearing /app directory..."));
  
  // We'll selectively delete, not the entire directory
  // Just overwrite files as we go
  
  let fileCount = 0;
  
  for (const [filePath, code] of Object.entries(modules)) {
    const fullPath = join(appDir, filePath);
    const dir = dirname(fullPath);
    
    // Create directory if needed
    await mkdir(dir, { recursive: true });
    
    // Write file
    await writeFile(fullPath, code, "utf-8");
    console.log(chalk.gray(`  ✓ ${filePath}`));
    fileCount++;
  }
  
  return fileCount;
}

// Main checkout function
async function checkout(appId, versionId = "latest") {
  console.log(chalk.cyan(`\n📥 Checking out app: ${appId}\n`));
  
  try {
    // Sign in user
    const user = await signIn();
    
    // Get app document
    console.log(chalk.cyan("📡 Fetching app from Firestore..."));
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);
    
    if (!appSnap.exists()) {
      console.error(chalk.red(`❌ App "${appId}" not found`));
      process.exit(1);
    }
    
    const appData = appSnap.data();
    
    // Check if user has access (owner or collaborator)
    const hasAccess = 
      appData.owner === user.uid || 
      (appData.collaborators && appData.collaborators.includes(user.uid));
    
    if (!hasAccess) {
      console.error(chalk.red(`❌ Access denied. You don't have permission to access "${appId}"`));
      process.exit(1);
    }
    
    // Get version to checkout
    const targetVersion = versionId === "latest" ? appData.currentVersion : versionId;
    
    if (!targetVersion) {
      console.error(chalk.red(`❌ No version found. App may not have been published yet.`));
      process.exit(1);
    }
    
    console.log(chalk.gray(`   Version: ${targetVersion}`));
    
    // Get version document
    const versionRef = doc(db, "apps", appId, "versions", targetVersion);
    const versionSnap = await getDoc(versionRef);
    
    if (!versionSnap.exists()) {
      console.error(chalk.red(`❌ Version "${targetVersion}" not found`));
      process.exit(1);
    }
    
    const versionData = versionSnap.data();
    // Use source for development (original .jsx files)
    const modules = versionData.source || versionData.modules || {};
    
    console.log(chalk.cyan(`\n📦 Writing ${Object.keys(modules).length} files to /app...\n`));
    
    // Write modules to disk
    const fileCount = await writeModulesToDisk(modules);
    
    console.log(chalk.green(`\n✅ Checkout complete!`));
    console.log(chalk.gray(`   App: ${appId}`));
    console.log(chalk.gray(`   Version: ${targetVersion}`));
    console.log(chalk.gray(`   Files: ${fileCount}`));
    console.log(chalk.white(`\n🚀 Run`), chalk.cyan("npm run dev"), chalk.white("to start development\n"));
    
  } catch (error) {
    console.error(chalk.red("\n❌ Checkout failed:"), error.message);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Parse arguments
const appId = process.argv[2];
const versionId = process.argv[3] || "latest";

if (!appId) {
  console.error(chalk.red("\n❌ App ID required"));
  console.log(chalk.white("\nUsage:"), chalk.cyan("npm run app:checkout <appId> [version]"));
  console.log(chalk.white("Example:"), chalk.cyan("npm run app:checkout news-base latest\n"));
  process.exit(1);
}

checkout(appId, versionId);

