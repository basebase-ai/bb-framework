/**
 * Shared authentication utilities for scripts
 *
 * Supports non-interactive (agent-friendly) usage via CLI flags or env vars:
 *   --email=<email>  or  BASEBASE_EMAIL env var
 *   --password=<pw>  or  BASEBASE_PASSWORD env var
 *   --yes / -y       Auto-confirm all prompts
 *   --json           Output machine-readable JSON instead of human text
 */

import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import readline from 'readline';
import chalk from 'chalk';

const AUTH_CACHE_FILE = join(homedir(), '.basebase-auth.json');

/**
 * Parse global flags from CLI args and environment variables.
 * Extracts auth credentials, --yes, and --json from process.argv / process.env.
 * @returns {{ email: string | null, password: string | null, yes: boolean, json: boolean }}
 */
export function parseGlobalFlags() {
  const args = process.argv.slice(2);
  /** @type {string | null} */
  let email = process.env.BASEBASE_EMAIL || null;
  /** @type {string | null} */
  let password = process.env.BASEBASE_PASSWORD || null;
  /** @type {boolean} */
  let yes = false;
  /** @type {boolean} */
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && i + 1 < args.length) {
      email = args[++i];
    } else if (arg.startsWith('--email=')) {
      email = arg.slice('--email='.length);
    } else if (arg === '--password' && i + 1 < args.length) {
      password = args[++i];
    } else if (arg.startsWith('--password=')) {
      password = arg.slice('--password='.length);
    } else if (arg === '--yes' || arg === '-y') {
      yes = true;
    } else if (arg === '--json') {
      json = true;
    }
  }

  return { email, password, yes, json };
}

/**
 * Check if non-interactive credentials are available via CLI args or env vars.
 * @returns {boolean}
 */
export function hasNonInteractiveCredentials() {
  const { email, password } = parseGlobalFlags();
  return !!(email && password);
}

/**
 * Parse a named CLI arg value (e.g., --name="My App" or --name "My App").
 * @param {string} flagName - The flag name without dashes (e.g., "name")
 * @returns {string | null}
 */
export function parseNamedArg(flagName) {
  const args = process.argv.slice(2);
  const prefix = `--${flagName}=`;
  const flag = `--${flagName}`;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(prefix)) {
      return args[i].slice(prefix.length);
    }
    if (args[i] === flag && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      return args[i + 1];
    }
  }

  return null;
}

/**
 * Logger that respects --json mode. In JSON mode, human-readable logs are suppressed.
 * @param  {...any} args - Arguments to pass to console.log
 */
export function log(...args) {
  const { json } = parseGlobalFlags();
  if (!json) {
    console.log(...args);
  }
}

/**
 * Output structured JSON result (only when --json flag is set).
 * @param {Record<string, unknown>} data - The data to output as JSON
 */
export function jsonOutput(data) {
  const { json } = parseGlobalFlags();
  if (json) {
    console.log(JSON.stringify(data));
  }
}

/**
 * Prompt for input (interactive mode only)
 * @param {string} question
 * @returns {Promise<string>}
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
 * Prompt for password (hidden input, interactive mode only)
 * @param {string} question
 * @returns {Promise<string>}
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

    /** @param {string} char */
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
 * @returns {Promise<{ email?: string, refreshToken?: string, timestamp?: number } | null>}
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
 * @param {string} email
 * @param {string} refreshToken
 */
async function saveCachedAuth(email, refreshToken) {
  try {
    const data = JSON.stringify({ email, refreshToken, timestamp: Date.now() }, null, 2);
    await writeFile(AUTH_CACHE_FILE, data, { mode: 0o600 }); // Read/write for owner only
  } catch (error) {
    // Silently fail if we can't cache
    const { json } = parseGlobalFlags();
    if (!json) {
      console.warn(chalk.yellow('⚠️  Could not cache auth credentials'));
    }
  }
}

/**
 * Authenticate with Firebase.
 *
 * Credentials are resolved in this order:
 *   1. CLI args: --email / --password
 *   2. Env vars: BASEBASE_EMAIL / BASEBASE_PASSWORD
 *   3. Cached email from ~/.basebase-auth.json (password still prompted)
 *   4. Interactive prompt (requires TTY)
 *
 * @param {Object} auth - Firebase Auth instance
 * @param {Object} options - Optional configuration
 * @param {boolean} [options.silent] - If true, don't show auth prompts/messages
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function authenticateUser(auth, options = {}) {
  const { silent = false } = options;
  const flags = parseGlobalFlags();

  // --- Non-interactive path: credentials from args or env vars ---
  if (flags.email && flags.password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, flags.email, flags.password);
      await saveCachedAuth(flags.email, userCredential.user.refreshToken);
      if (!silent && !flags.json) {
        console.log(chalk.green(`✅ Signed in as ${flags.email}\n`));
      }
      return userCredential;
    } catch (error) {
      if (flags.json) {
        console.log(JSON.stringify({ success: false, error: 'auth_failed', message: error.message }));
      } else {
        console.error(chalk.red('❌ Authentication failed:', error.message));
      }
      process.exit(1);
    }
  }

  // --- Interactive path (original behavior) ---
  const cached = await loadCachedAuth();
  if (cached && cached.email && cached.refreshToken) {
    try {
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

