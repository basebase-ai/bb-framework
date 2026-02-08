#!/usr/bin/env node
/**
 * Create a new Basebase account (sign up) via the CLI.
 *
 * Usage:
 *   npm run signup -- --email=<email> --password=<password> [options]
 *
 * Options:
 *   --email=<email>        Account email (required)
 *   --password=<password>  Account password (required, min 6 chars)
 *   --name=<displayName>   Display name (optional, defaults to email prefix)
 *   --json                 Output machine-readable JSON
 *
 * Environment variables (alternative to flags):
 *   BASEBASE_EMAIL         Account email
 *   BASEBASE_PASSWORD      Account password
 *
 * NOTE: The -- separator is required to prevent npm from consuming --flags.
 *
 * Examples:
 *   npm run signup -- --email=agent@example.com --password=supersecret
 *   npm run signup -- --email=agent@example.com --password=supersecret --name="My Agent" --json
 *   BASEBASE_EMAIL=agent@x.com BASEBASE_PASSWORD=secret npm run signup
 *
 * Notes:
 *   - A verification email will be sent. The account works for CLI operations
 *     immediately, but the web UI may require email verification.
 *   - If the account already exists, use the existing credentials instead.
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  parseGlobalFlags,
  parseNamedArg,
  prompt,
  promptPassword,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";
import { writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const AUTH_CACHE_FILE = join(homedir(), ".basebase-auth.json");

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

/**
 * Ensure a user profile document exists in Firestore.
 * Mirrors the logic in framework/components/AuthProvider.jsx.
 * @param {import('firebase/auth').User} user
 * @param {string | null} displayName
 */
async function ensureUserProfile(user, displayName) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    /** @type {Record<string, unknown>} */
    const profile = {
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      displayName:
        displayName ||
        user.displayName ||
        user.email?.split("@")[0] ||
        "User",
      photoURL: user.photoURL || null,
      bio: null,
      role: "user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);
    return true;
  }
  return false;
}

/**
 * Cache auth credentials for subsequent CLI commands.
 * @param {string} email
 * @param {string} refreshToken
 */
async function cacheCredentials(email, refreshToken) {
  try {
    const data = JSON.stringify(
      { email, refreshToken, timestamp: Date.now() },
      null,
      2
    );
    await writeFile(AUTH_CACHE_FILE, data, { mode: 0o600 });
  } catch {
    // Silently fail
  }
}

async function main() {
  const flags = parseGlobalFlags();

  if (!flags.json) {
    console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
    console.log(chalk.bold.blue("║   Basebase Framework - Sign Up      ║"));
    console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));
  }

  // Resolve email and password from flags, env vars, or interactive prompts
  /** @type {string} */
  let email = flags.email || "";
  /** @type {string} */
  let password = flags.password || "";
  /** @type {string | null} */
  const displayName = parseNamedArg("name");

  // If not provided via flags/env, prompt interactively (if TTY available)
  if (!email) {
    if (!process.stdin.isTTY) {
      if (flags.json) {
        jsonOutput({
          success: false,
          error: "missing_email",
          message: "Email is required. Use --email=<email> or BASEBASE_EMAIL env var.",
        });
      } else {
        console.error(chalk.red("❌ Email is required."));
        console.log(chalk.cyan("  Use --email=<email> or set BASEBASE_EMAIL env var.\n"));
      }
      process.exit(1);
    }
    email = await prompt("Email: ");
  }

  if (!password) {
    if (!process.stdin.isTTY) {
      if (flags.json) {
        jsonOutput({
          success: false,
          error: "missing_password",
          message: "Password is required. Use --password=<pw> or BASEBASE_PASSWORD env var.",
        });
      } else {
        console.error(chalk.red("❌ Password is required."));
        console.log(chalk.cyan("  Use --password=<pw> or set BASEBASE_PASSWORD env var.\n"));
      }
      process.exit(1);
    }
    password = await promptPassword("Password (min 6 chars): ");
  }

  if (!email || !password) {
    if (flags.json) {
      jsonOutput({ success: false, error: "missing_credentials", message: "Email and password are required." });
    } else {
      console.error(chalk.red("❌ Email and password are required."));
    }
    process.exit(1);
  }

  if (password.length < 6) {
    if (flags.json) {
      jsonOutput({ success: false, error: "weak_password", message: "Password must be at least 6 characters." });
    } else {
      console.error(chalk.red("❌ Password must be at least 6 characters."));
    }
    process.exit(1);
  }

  try {
    log(chalk.cyan("📝 Creating account..."));

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set display name if provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Send verification email (non-blocking — don't fail if it errors)
    try {
      await sendEmailVerification(user);
      log(chalk.gray(`📧 Verification email sent to ${email}`));
    } catch (verifyError) {
      log(chalk.yellow(`⚠️  Could not send verification email: ${verifyError.message}`));
    }

    // Create user profile in Firestore
    const profileCreated = await ensureUserProfile(user, displayName);
    if (profileCreated) {
      log(chalk.gray("✓ User profile created in Firestore"));
    }

    // Cache credentials for subsequent CLI commands
    await cacheCredentials(email, user.refreshToken);

    if (flags.json) {
      jsonOutput({
        success: true,
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.email?.split("@")[0] || "User",
        emailVerified: user.emailVerified,
        message: "Account created successfully. A verification email has been sent.",
      });
    } else {
      console.log(chalk.bold.green("\n✅ Account created successfully!\n"));
      console.log(chalk.gray(`   UID:   ${user.uid}`));
      console.log(chalk.gray(`   Email: ${user.email}`));
      console.log(chalk.gray(`   Name:  ${displayName || user.email?.split("@")[0] || "User"}`));
      console.log(chalk.yellow("\n📧 A verification email has been sent. Check your inbox."));
      console.log(chalk.gray("   (CLI operations work immediately; web UI may require verification.)\n"));
      console.log(chalk.cyan("Next steps:"));
      console.log(chalk.gray("  1. npm run app:init <appId> --email=" + email + " --password=<pw>"));
      console.log(chalk.gray("  2. npm run dev"));
      console.log(chalk.gray('  3. npm run app:commit <appId> "message" --email=' + email + " --password=<pw>\n"));
    }

    process.exit(0);
  } catch (error) {
    /** @type {string} */
    let errorCode = "signup_failed";
    /** @type {string} */
    let userMessage = error.message;

    if (error.code === "auth/email-already-in-use") {
      errorCode = "email_already_in_use";
      userMessage = "An account with this email already exists. Use your existing credentials.";
    } else if (error.code === "auth/invalid-email") {
      errorCode = "invalid_email";
      userMessage = "The email address is not valid.";
    } else if (error.code === "auth/weak-password") {
      errorCode = "weak_password";
      userMessage = "Password is too weak. Use at least 6 characters.";
    }

    if (flags.json) {
      jsonOutput({ success: false, error: errorCode, message: userMessage });
    } else {
      console.error(chalk.red(`\n❌ Sign up failed: ${userMessage}`));
      if (error.code === "auth/email-already-in-use") {
        console.log(chalk.yellow("\n💡 Tip: Use your existing email and password with --email and --password flags."));
      }
    }
    process.exit(1);
  }
}

main().catch((error) => {
  const flags = parseGlobalFlags();
  if (flags.json) {
    jsonOutput({ success: false, error: "unexpected", message: error.message });
  } else {
    console.error(chalk.red("\n✗ Error:"), error.message);
  }
  process.exit(1);
});
