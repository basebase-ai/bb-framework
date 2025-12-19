/**
 * Draft Sync Utilities
 * Handles syncing draft files to Firestore for preview
 */

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { transform } from "sucrase";

/**
 * Transform source files to compiled JS
 * @param {Record<string, string>} files - Source files (JSX)
 * @returns {{ compiled: Record<string, string>, errors: Array<{file: string, error: string}> }}
 */
export function compileFiles(files) {
  /** @type {Record<string, string>} */
  const compiled = {};
  /** @type {Array<{file: string, error: string}>} */
  const errors = [];

  for (const [fileName, content] of Object.entries(files)) {
    const jsFileName = fileName.replace(/\.jsx$/, ".js");

    if (/\.(jsx?|tsx?)$/.test(fileName)) {
      try {
        // Remove hot reload code
        let cleanedCode = content.replace(
          /if\s*\(\s*import\.meta\.hot\s*\)\s*\{[\s\S]*?\n\}/g,
          ""
        );

        // Normalize framework imports
        cleanedCode = cleanedCode.replace(
          /from\s+["'](\.\.\/)+(framework\/[^"']+)\.jsx["']/g,
          'from "$2.js"'
        );
        cleanedCode = cleanedCode.replace(
          /from\s+["'](\.\.\/)+(framework\/[^"']+)\.js["']/g,
          'from "$2.js"'
        );

        const result = transform(cleanedCode, {
          transforms: ["jsx", "typescript", "imports"],
          jsxRuntime: "classic",
          production: true,
        });

        compiled[jsFileName] = result.code;
      } catch (err) {
        errors.push({ file: fileName, error: err.message });
        // Still include the file but with an error comment
        compiled[
          jsFileName
        ] = `// COMPILE ERROR: ${err.message}\n// Original file: ${fileName}`;
      }
    } else {
      compiled[jsFileName] = content;
    }
  }

  return { compiled, errors };
}

/**
 * Write draft to Firestore
 * @param {string} appId - App ID
 * @param {Record<string, string>} files - Source files
 * @param {string} userId - User ID
 * @param {string} [userEmail] - User email
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function writeDraft(appId, files, userId, userEmail) {
  try {
    // Compile files
    const { compiled, errors } = compileFiles(files);

    // Check if app document exists, create if not
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      // Create app document
      await setDoc(appRef, {
        name: appId,
        description: `${appId} - built with Builder`,
        owner: userId,
        accessMode: "open",
        currentVersion: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`📝 Created app document for "${appId}"`);
    }

    // Write to drafts/latest
    const draftRef = doc(db, "apps", appId, "drafts", "latest");
    await setDoc(draftRef, {
      source: files,
      compiled,
      metadata: {
        entry: "app.js",
        sourceEntry: "app.jsx",
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        updatedByEmail: userEmail || null,
        moduleCount: Object.keys(files).length,
        totalSize: Object.values(files).reduce((sum, f) => sum + f.length, 0),
        compileErrors: errors.length > 0 ? errors : null,
      },
    });

    console.log(
      `✅ Draft synced for "${appId}" (${Object.keys(files).length} files)`
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to write draft:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the preview URL for an app
 * @param {string} appId - App ID
 * @returns {string} Preview URL with draft param
 */
export function getPreviewUrl(appId) {
  // Detect environment - use same protocol as current page
  const isDev = window.location.hostname.includes("localhost");
  const protocol = window.location.protocol;

  if (isDev) {
    // Local development - use same protocol, localhost with app subdomain
    return `${protocol}//${appId}.localhost:3000/?draft=true`;
  } else {
    // Production - use basebase.dev domain
    return `https://${appId}.basebase.dev/?draft=true`;
  }
}
