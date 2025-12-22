/**
 * App Examples Utilities
 * Loads a curated set of published apps into memory and supports regex search.
 */

import { doc, getDoc } from "firebase/firestore";

/**
 * Curated example apps to load (latest published version).
 * Keep this list small to avoid large downloads.
 * @type {string[]}
 */
export const CURATED_EXAMPLE_APP_IDS = [
  "starter-app",
  "www",
  "connections",
  "snack",
  "signbase",
  "projectbase",
  "community-calendar",
];

/**
 * @typedef {{ files: Record<string, string>, versionHash: string | null, loadedAt: number }} ExampleApp
 */

/**
 * Load curated app examples from Firestore.
 * @param {import('firebase/firestore').Firestore} db
 * @param {string[]} appIds
 * @returns {Promise<Record<string, ExampleApp>>}
 */
export async function loadCuratedExamples(db, appIds) {
  /** @type {Record<string, ExampleApp>} */
  const result = {};

  const now = Date.now();

  for (const appId of appIds) {
    try {
      const appRef = doc(db, "apps", appId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) continue;

      const appData = appSnap.data();
      /** @type {string | null} */
      const versionHash = appData.currentVersion || null;
      if (!versionHash) continue;

      const versionRef = doc(db, "apps", appId, "versions", versionHash);
      const versionSnap = await getDoc(versionRef);
      if (!versionSnap.exists()) continue;

      const versionData = versionSnap.data();
      /** @type {Record<string, string>} */
      const files = versionData.source || {};
      if (!files || Object.keys(files).length === 0) continue;

      result[appId] = {
        files,
        versionHash,
        loadedAt: now,
      };
    } catch {
      // Ignore individual app failures; keep loading others
    }
  }

  return result;
}

/**
 * Format a single file with line numbers (1-indexed).
 * @param {string} fileName
 * @param {string} content
 * @returns {string}
 */
export function formatFileWithLineNumbers(fileName, content) {
  const lines = String(content || "").split("\n");
  const numbered = lines
    .map((line, i) => `${String(i + 1).padStart(4, " ")} | ${line}`)
    .join("\n");
  return `=== ${fileName} (${lines.length} lines) ===\n${numbered}`;
}

/**
 * Search through example apps with a regex pattern, returning context around matches.
 * @param {Record<string, ExampleApp>} exampleApps
 * @param {string} pattern
 * @param {{ contextLines?: number, maxMatches?: number, flags?: string }} [opts]
 * @returns {{ ok: true, output: string } | { ok: false, error: string }}
 */
export function searchExampleApps(exampleApps, pattern, opts = {}) {
  const contextLines =
    typeof opts.contextLines === "number" ? opts.contextLines : 10;
  const maxMatches = typeof opts.maxMatches === "number" ? opts.maxMatches : 30;
  const flags = typeof opts.flags === "string" ? opts.flags : "i";

  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { ok: false, error: `Invalid regex: ${e.message}` };
  }

  /** @type {string[]} */
  const chunks = [];
  let matchCount = 0;

  for (const [appId, app] of Object.entries(exampleApps || {})) {
    for (const [fileName, content] of Object.entries(app.files || {})) {
      const lines = String(content || "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!re.test(lines[i])) continue;

        const start = Math.max(0, i - contextLines);
        const end = Math.min(lines.length - 1, i + contextLines);

        const excerpt = lines
          .slice(start, end + 1)
          .map(
            (line, idx) =>
              `${String(start + idx + 1).padStart(4, " ")} | ${line}`
          )
          .join("\n");

        chunks.push(
          `--- ${appId} :: ${fileName} :: lines ${start + 1}-${
            end + 1
          } ---\n${excerpt}`
        );

        matchCount++;
        if (matchCount >= maxMatches) {
          chunks.push(
            `\n[TRUNCATED] Reached maxMatches=${maxMatches}. Refine your regex for more specific results.`
          );
          return { ok: true, output: chunks.join("\n\n") };
        }
      }
    }
  }

  if (matchCount === 0) {
    return { ok: true, output: "No matches found in curated examples." };
  }

  return { ok: true, output: chunks.join("\n\n") };
}
