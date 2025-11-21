#!/usr/bin/env node

/**
 * Initialize a new app
 * - Sets the APP_ID in schema.js
 * - Optionally creates the app document in Firestore
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const schemaPath = resolve(rootDir, 'app/schema.js');

// Firebase Admin SDK
import { firebaseConfig } from '../config/firebase.config.js';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: firebaseConfig.projectId,
    // Note: In production, use a service account key file
    // For now, we'll use the public config (limited permissions)
  }),
});

const db = getFirestore(app);
const auth = getAuth(app);

// Helper to prompt for user input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
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

    process.stdin.on('data', (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.pause();
          break;
        default:
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(rl.line.length));
          break;
      }
    });

    rl.question(question, (password) => {
      rl.close();
      console.log(''); // New line after hidden input
      resolve(password.trim());
    });
  });
}

// Authenticate user with Firebase
async function authenticateUser() {
  console.log(chalk.blue('\n🔐 Firebase Authentication Required\n'));
  
  const email = await prompt('Email: ');
  const password = await promptPassword('Password: ');
  
  try {
    // Note: firebase-admin doesn't have signInWithEmailAndPassword
    // We need to use the client SDK for authentication
    const { initializeApp: initClientApp } = await import('firebase/app');
    const { getAuth: getClientAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    
    const clientApp = initClientApp(firebaseConfig);
    const clientAuth = getClientAuth(clientApp);
    
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    console.log(chalk.green('✓ Authenticated successfully\n'));
    
    return userCredential.user;
  } catch (error) {
    console.error(chalk.red('✗ Authentication failed:'), error.message);
    process.exit(1);
  }
}

// Validate app ID format
function validateAppId(appId) {
  if (!appId) {
    return 'App ID is required';
  }
  
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(appId)) {
    return 'App ID must be lowercase, alphanumeric, and use hyphens (kebab-case)';
  }
  
  if (appId.length < 3 || appId.length > 50) {
    return 'App ID must be between 3 and 50 characters';
  }
  
  return null;
}

// Update APP_ID in schema.js
async function updateSchemaFile(appId) {
  console.log(chalk.blue('📝 Updating schema.js...'));
  
  let schemaContent = await readFile(schemaPath, 'utf-8');
  
  // Replace the APP_ID value
  schemaContent = schemaContent.replace(
    /export const APP_ID = ['"].*?['"];/,
    `export const APP_ID = '${appId}';`
  );
  
  await writeFile(schemaPath, schemaContent, 'utf-8');
  
  console.log(chalk.green(`✓ Updated APP_ID to '${appId}' in app/schema.js\n`));
}

// Create app document in Firestore
async function createAppDocument(appId, appName, user) {
  console.log(chalk.blue('🔥 Creating app document in Firestore...'));
  
  const appRef = db.collection('apps').doc(appId);
  const appDoc = await appRef.get();
  
  if (appDoc.exists) {
    const existingApp = appDoc.data();
    
    if (existingApp.owner === user.uid) {
      console.log(chalk.yellow(`⚠️  App '${appId}' already exists and you own it`));
      return;
    } else {
      console.log(chalk.red(`✗ App '${appId}' already exists and is owned by another user`));
      process.exit(1);
    }
  }
  
  await appRef.set({
    name: appName,
    description: '',
    owner: user.uid,
    collaborators: [],
    status: 'draft',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: user.uid,
    updatedBy: user.uid,
  });
  
  console.log(chalk.green(`✓ Created app document at /apps/${appId}\n`));
}

// Main function
async function main() {
  console.log(chalk.bold.blue('\n╔══════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║   Basebase Framework - App Init     ║'));
  console.log(chalk.bold.blue('╚══════════════════════════════════════╝\n'));
  
  // Get app ID from command line or prompt
  let appId = process.argv[2];
  
  if (!appId) {
    appId = await prompt('Enter app ID (kebab-case, e.g., my-app): ');
  }
  
  // Validate app ID
  const validationError = validateAppId(appId);
  if (validationError) {
    console.error(chalk.red(`✗ Invalid app ID: ${validationError}`));
    process.exit(1);
  }
  
  console.log(chalk.green(`✓ App ID: ${appId}\n`));
  
  // Get app name
  const appName = await prompt(`Enter app name (display name): `) || 
                  appId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  console.log(chalk.green(`✓ App Name: ${appName}\n`));
  
  // Ask if user wants to create Firestore document
  const createDoc = await prompt('Create app document in Firestore? (y/N): ');
  
  // Update schema file
  await updateSchemaFile(appId);
  
  // Create Firestore document if requested
  if (createDoc.toLowerCase() === 'y' || createDoc.toLowerCase() === 'yes') {
    const user = await authenticateUser();
    await createAppDocument(appId, appName, user);
  }
  
  console.log(chalk.bold.green('✨ App initialization complete!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.gray('  1. npm run dev             - Start development server'));
  console.log(chalk.gray('  2. Edit app code in /app   - Build your app'));
  console.log(chalk.gray('  3. npm run app:commit      - Deploy to Firestore\n'));
  
  process.exit(0);
}

// Run
main().catch((error) => {
  console.error(chalk.red('\n✗ Error:'), error.message);
  console.error(error.stack);
  process.exit(1);
});

