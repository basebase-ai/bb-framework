/**
 * Shared utilities for querying accessible apps from Firestore.
 *
 * An app is "accessible" to a user if any of these conditions hold:
 *   1. The user is the owner (app.owner === user.uid)
 *   2. The user is an explicit collaborator (app.collaborators array-contains user.uid)
 *   3. The app has publicEdit enabled (app.publicEdit === true)
 */

import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * @typedef {Object} AccessibleApp
 * @property {string} id           - The Firestore document ID (appId)
 * @property {string} name         - Display name of the app
 * @property {string} description  - App description
 * @property {string} owner        - UID of the app owner
 * @property {"owner" | "collaborator" | "public"} role - The user's relationship to this app
 * @property {string | null} currentVersion - Current published version hash
 * @property {string | null} updatedAt      - ISO string of last update (or null)
 * @property {string | null} accessMode     - "open" or "invite-only"
 */

/**
 * Fetch all apps accessible to the given user by running three parallel Firestore
 * queries (owned, collaborator, publicEdit) and deduplicating results.
 *
 * @param {import("firebase/firestore").Firestore} db - Firestore instance
 * @param {string} userUid - The authenticated user's UID
 * @returns {Promise<AccessibleApp[]>}
 */
export async function fetchAccessibleApps(db, userUid) {
  const appsRef = collection(db, "apps");

  // Run all three queries in parallel
  const [ownedSnap, collabSnap, publicSnap] = await Promise.all([
    getDocs(query(appsRef, where("owner", "==", userUid))),
    getDocs(query(appsRef, where("collaborators", "array-contains", userUid))),
    getDocs(query(appsRef, where("publicEdit", "==", true))),
  ]);

  /** @type {Map<string, AccessibleApp>} */
  const appsMap = new Map();

  // Owner takes highest priority
  ownedSnap.forEach((docSnap) => {
    appsMap.set(docSnap.id, formatApp(docSnap, "owner"));
  });

  // Collaborator — only add if not already present (owner wins)
  collabSnap.forEach((docSnap) => {
    if (!appsMap.has(docSnap.id)) {
      appsMap.set(docSnap.id, formatApp(docSnap, "collaborator"));
    }
  });

  // Public — only add if not already present
  publicSnap.forEach((docSnap) => {
    if (!appsMap.has(docSnap.id)) {
      appsMap.set(docSnap.id, formatApp(docSnap, "public"));
    }
  });

  // Sort alphabetically by appId for deterministic output
  /** @type {AccessibleApp[]} */
  const results = Array.from(appsMap.values());
  results.sort((a, b) => a.id.localeCompare(b.id));

  return results;
}

/**
 * Format a Firestore document snapshot into an AccessibleApp object.
 *
 * @param {import("firebase/firestore").QueryDocumentSnapshot} docSnap
 * @param {"owner" | "collaborator" | "public"} role
 * @returns {AccessibleApp}
 */
function formatApp(docSnap, role) {
  const data = docSnap.data();
  /** @type {string | null} */
  let updatedAt = null;
  if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
    updatedAt = data.updatedAt.toDate().toISOString();
  }

  return {
    id: docSnap.id,
    name: data.name || "",
    description: data.description || "",
    owner: data.owner || "",
    role,
    currentVersion: data.currentVersion || null,
    updatedAt,
    accessMode: data.accessMode || null,
  };
}
