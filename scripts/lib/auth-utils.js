/**
 * Shared authentication utilities for scripts
 */

import { signInWithEmailAndPassword } from 'firebase/auth';
import readline from 'readline';
import chalk from 'chalk';

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
 * Authenticate with Firebase
 * @param {Object} auth - Firebase Auth instance
 * @param {Object} options - Optional configuration
 * @param {boolean} options.silent - If true, don't show auth prompts/messages
 * @returns {Promise<UserCredential>}
 */
export async function authenticateUser(auth, options = {}) {
  const { silent = false } = options;

  if (!silent) {
    console.log(chalk.cyan('\n🔐 Authentication required\n'));
  }

  const email = await prompt('Email: ');
  const password = await promptPassword('Password: ');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!silent) {
      console.log(chalk.green(`✅ Signed in as ${email}\n`));
    }
    
    return userCredential;
  } catch (error) {
    console.error(chalk.red('❌ Authentication failed:', error.message));
    process.exit(1);
  }
}

