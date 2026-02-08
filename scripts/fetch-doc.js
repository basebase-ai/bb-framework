#!/usr/bin/env node
/**
 * Fetch Firestore document(s) as JSON
 * Usage: npm run doc:fetch <path> [--limit N]
 * Examples:
 *   npm run doc:fetch /apps/starter-app          (single document)
 *   npm run doc:fetch /apps --limit 5            (5 docs from collection)
 *   npm run doc:fetch /apps/my-app/versions --limit 10
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  limit as firestoreLimit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";
import {
  authenticateUser,
  hasNonInteractiveCredentials,
  parseGlobalFlags,
  log,
  jsonOutput,
} from "./lib/auth-utils.js";

// Initialize Firebase with public config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Check if running in an interactive terminal
function checkInteractive() {
  if (hasNonInteractiveCredentials()) return;
  if (process.stdin.isTTY) return;

  console.error(
    chalk.red("\n❌ ERROR: This command requires an interactive terminal or --email/--password flags.\n")
  );
  console.log(
    chalk.yellow("Provide credentials via CLI flags or environment variables:\n")
  );
  console.log(
    chalk.cyan(
      `  npm run doc:fetch "${process.argv[2] || "/path/to/doc"}" --email=you@example.com --password=yourpass\n`
    )
  );
  process.exit(1);
}

// Parse Firestore path into collection segments
function parsePath(path) {
  // Remove leading/trailing slashes and split
  const segments = path.replace(/^\/+|\/+$/g, "").split("/");

  // Determine if this is a document path (even segments) or collection path (odd segments)
  const isDocument = segments.length % 2 === 0;
  const isCollection = segments.length % 2 !== 0;

  return { segments, isDocument, isCollection };
}

// Convert Firestore data to JSON-serializable format
function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      // Handle Firestore Timestamps
      if (value && typeof value === "object" && value.toDate) {
        return value.toDate().toISOString();
      }
      return value;
    })
  );
}

// Fetch single document
async function fetchDocument(docPath) {
  console.log(chalk.cyan(`\n📄 Fetching document: ${docPath}\n`));

  try {
    // Sign in user
    await authenticateUser(auth);

    // Parse and validate path
    const { segments, isDocument } = parsePath(docPath);

    if (!isDocument) {
      throw new Error(
        `Path "${docPath}" points to a collection. Use --limit to fetch multiple documents.`
      );
    }

    // Get document reference
    const docRef = doc(db, ...segments);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error(chalk.red(`❌ Document not found: ${docPath}`));
      process.exit(1);
    }

    // Get document data
    const data = docSnap.data();
    const jsonData = toJSON(data);

    console.log(chalk.green("✅ Document found!\n"));
    console.log(JSON.stringify(jsonData, null, 2));
  } catch (error) {
    console.error(chalk.red("\n❌ Fetch failed:"), error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Fetch multiple documents from collection
async function fetchCollection(collectionPath, limitCount) {
  console.log(
    chalk.cyan(
      `\n📚 Fetching ${limitCount} document(s) from: ${collectionPath}\n`
    )
  );

  try {
    // Sign in user
    await authenticateUser(auth);

    // Parse and validate path
    const { segments, isCollection } = parsePath(collectionPath);

    if (!isCollection) {
      throw new Error(
        `Path "${collectionPath}" points to a document. Remove --limit to fetch a single document.`
      );
    }

    // Get collection reference
    const collectionRef = collection(db, ...segments);
    const q = query(collectionRef, firestoreLimit(limitCount));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(chalk.yellow("⚠️  No documents found in collection"));
      console.log(JSON.stringify([], null, 2));
      process.exit(0);
    }

    // Convert to array of documents with IDs
    const documents = [];
    querySnapshot.forEach((docSnap) => {
      documents.push({
        id: docSnap.id,
        data: toJSON(docSnap.data()),
      });
    });

    console.log(chalk.green(`✅ Found ${documents.length} document(s)!\n`));
    console.log(JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error(chalk.red("\n❌ Fetch failed:"), error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse arguments
const args = process.argv.slice(2);
const docPath = args[0];
const limitIndex = args.indexOf("--limit");

// Support both "--limit N" and just "N" as second arg (for npm run compatibility)
let limitCount = null;
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limitCount = parseInt(args[limitIndex + 1], 10);
} else if (args[1] && !args[1].startsWith("-")) {
  // Second arg is a number (npm run strips --limit)
  const parsed = parseInt(args[1], 10);
  if (!isNaN(parsed)) {
    limitCount = parsed;
  }
}

if (!docPath) {
  console.error(chalk.red("\n❌ Path required"));
  console.log(
    chalk.white("\nUsage:"),
    chalk.cyan("npm run doc:fetch <path> [--limit N]")
  );
  console.log(chalk.white("\nExamples:"));
  console.log(
    chalk.cyan("  npm run doc:fetch /apps/starter-app"),
    chalk.gray("# single document")
  );
  console.log(
    chalk.cyan("  npm run doc:fetch /users/2lk3j2k3j4kj"),
    chalk.gray("# single document")
  );
  console.log(
    chalk.cyan("  npm run doc:fetch /apps --limit 5"),
    chalk.gray("# 5 docs from collection")
  );
  console.log(
    chalk.cyan("  npm run doc:fetch /apps/my-app/versions --limit 10"),
    chalk.gray("# 10 versions\n")
  );
  process.exit(1);
}

if (limitCount !== null) {
  if (isNaN(limitCount) || limitCount < 1) {
    console.error(chalk.red("\n❌ --limit must be a positive number"));
    process.exit(1);
  }
  fetchCollection(docPath, limitCount);
} else {
  fetchDocument(docPath);
}
