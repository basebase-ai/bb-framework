/**
 * Shared authentication utilities for scripts
 */

import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import readline from 'readline';
import chalk from 'chalk';

const AUTH_CACHE_FILE = join(homedir(), '.basebase-auth.json');

/**
 * Prompt for input
 */
export function prompt(question) {
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

/**
 * Prompt for password (hidden input)
 */
export function promptPassword(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let password = "";
    
    // Ensure stdin is in the right state
    stdin.removeAllListeners("data");
    
    if (!stdin.isTTY) {
      reject(new Error('Not running in a TTY environment'));
      return;
    }

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.removeListener("data", onData);
    };

    const onData = (char) => {
      char = char.toString("utf8");

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004": // Ctrl-D
          cleanup();
          process.stdout.write("\n");
          resolve(password);
          break;
        case "\u0003": // Ctrl-C
          cleanup();
          process.stdout.write("\n");
          process.exit(130); // Standard exit code for Ctrl+C
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

/**
 * Load cached auth credentials
 */
async function loadCachedAuth() {
  try {
    const data = await readFile(AUTH_CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save auth credentials to cache
 */
async function saveCachedAuth(email, refreshToken) {
  try {
    const data = JSON.stringify({ email, refreshToken, timestamp: Date.now() }, null, 2);
    await writeFile(AUTH_CACHE_FILE, data, { mode: 0o600 }); // Read/write for owner only
  } catch (error) {
    // Silently fail if we can't cache
    console.warn(chalk.yellow('⚠️  Could not cache auth credentials'));
  }
}

/**
 * Authenticate with Firebase
 * @param {Object} auth - Firebase Auth instance
 * @param {Object} options - Optional configuration
 * @param {boolean} options.silent - If true, don't show auth prompts/messages
 * @returns {Promise<UserCredential>}
 */
export async function authenticateUser(auth, options = {}) {
  const { silent = false } = options;

  // Try to use cached credentials first
  const cached = await loadCachedAuth();
  if (cached && cached.email && cached.refreshToken) {
    try {
      // Firebase Admin SDK uses refresh tokens, but client SDK doesn't expose them directly
      // For now, we'll just cache email and prompt for password
      // A better solution would be to use a custom token system
      if (!silent) {
        console.log(chalk.cyan(`\n🔐 Found cached credentials for ${cached.email}\n`));
      }
    } catch {
      // Cache invalid, continue to manual auth
    }
  }

  if (!silent) {
    console.log(chalk.cyan('\n🔐 Authentication required\n'));
  }

  const email = cached?.email || await prompt('Email: ');
  const password = await promptPassword('Password: ');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Save credentials for next time
    await saveCachedAuth(email, userCredential.user.refreshToken);
    
    if (!silent) {
      console.log(chalk.green(`✅ Signed in as ${email}\n`));
    }
    
    return userCredential;
  } catch (error) {
    console.error(chalk.red('❌ Authentication failed:', error.message));
    process.exit(1);
  }
}

