/**
 * Linter Utilities
 * Browser-based linting using Sucrase for syntax checking
 */

import { transform } from "sucrase";

/**
 * @typedef {Object} LintError
 * @property {string} file
 * @property {number} [line]
 * @property {number} [column]
 * @property {string} message
 * @property {'error' | 'warning'} severity
 */

/**
 * Lint a single file for syntax errors
 * @param {string} fileName
 * @param {string} code
 * @returns {LintError[]}
 */
export function lintFile(fileName, code) {
  /** @type {LintError[]} */
  const errors = [];

  // Only lint JS/JSX/TS/TSX files
  if (!/\.(jsx?|tsx?)$/.test(fileName)) {
    return errors;
  }

  // Try to parse/transform with Sucrase
  try {
    transform(code, {
      transforms: ["jsx", "typescript"],
      jsxRuntime: "classic",
      production: false,
    });
  } catch (err) {
    // Extract line/column from Sucrase error
    const line = err.loc?.line || extractLineFromError(err.message);
    const column = err.loc?.column;

    errors.push({
      file: fileName,
      line,
      column,
      message: cleanErrorMessage(err.message),
      severity: "error",
    });
  }

  return errors;
}

/**
 * Lint all files in an app
 * @param {Record<string, string>} files
 * @returns {LintError[]}
 */
export function lintAllFiles(files) {
  /** @type {LintError[]} */
  const allErrors = [];

  for (const [fileName, content] of Object.entries(files)) {
    const fileErrors = lintFile(fileName, content);
    allErrors.push(...fileErrors);
  }

  // Check for missing imports
  const missingImportErrors = checkMissingImports(files);
  allErrors.push(...missingImportErrors);

  return allErrors;
}

/**
 * Check for imports that reference non-existent local files
 * @param {Record<string, string>} files
 * @returns {LintError[]}
 */
function checkMissingImports(files) {
  /** @type {LintError[]} */
  const errors = [];

  // Regex to match local imports (starting with ./ or ../)
  const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"](\.[^'"]+)['"]/g;

  for (const [fileName, content] of Object.entries(files)) {
    if (!/\.(jsx?|tsx?)$/.test(fileName)) continue;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;

      while ((match = importRegex.exec(line)) !== null) {
        const importPath = match[1];

        // Skip framework imports
        if (importPath.includes("framework/")) continue;

        // Resolve the import path relative to current file
        const resolvedPath = resolveImportPath(fileName, importPath);

        // Check if the file exists (with various extensions)
        const exists = checkFileExists(files, resolvedPath);

        if (!exists) {
          errors.push({
            file: fileName,
            line: i + 1,
            message: `Import not found: '${importPath}'`,
            severity: "warning",
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Resolve an import path relative to the importing file
 * @param {string} fromFile
 * @param {string} importPath
 * @returns {string}
 */
function resolveImportPath(fromFile, importPath) {
  // Get directory of the importing file
  const fromDir = fromFile.includes("/")
    ? fromFile.substring(0, fromFile.lastIndexOf("/"))
    : "";

  // Split paths into parts
  const importParts = importPath.split("/");
  const dirParts = fromDir ? fromDir.split("/") : [];

  for (const part of importParts) {
    if (part === ".") {
      // Current directory, skip
      continue;
    } else if (part === "..") {
      // Parent directory
      dirParts.pop();
    } else {
      // Normal path segment
      dirParts.push(part);
    }
  }

  return dirParts.join("/");
}

/**
 * Check if a file exists in the files map (with extension variations)
 * @param {Record<string, string>} files
 * @param {string} path
 * @returns {boolean}
 */
function checkFileExists(files, path) {
  // Direct match
  if (files[path]) return true;

  // Try adding common extensions
  const extensions = [".js", ".jsx", ".ts", ".tsx"];
  for (const ext of extensions) {
    if (files[path + ext]) return true;
  }

  // Try index files
  for (const ext of extensions) {
    if (files[`${path}/index${ext}`]) return true;
  }

  return false;
}

/**
 * Extract line number from error message if not in loc
 * @param {string} message
 * @returns {number | undefined}
 */
function extractLineFromError(message) {
  // Try to extract line number from patterns like "Error at line 15" or "(15:8)"
  const lineMatch =
    message.match(/line\s+(\d+)/i) || message.match(/\((\d+):\d+\)/);
  return lineMatch ? parseInt(lineMatch[1], 10) : undefined;
}

/**
 * Clean up error message for display
 * @param {string} message
 * @returns {string}
 */
function cleanErrorMessage(message) {
  // Remove file path prefixes and clean up
  return message
    .replace(/^.*?:\s*/, "") // Remove "filename: " prefix
    .replace(/\(\d+:\d+\)\s*$/, "") // Remove trailing position
    .trim();
}

/**
 * Format lint errors for display to agent
 * @param {LintError[]} errors
 * @returns {string}
 */
export function formatLintErrors(errors) {
  if (errors.length === 0) {
    return "✓ No lint errors found.";
  }

  const lines = errors.map((err) => {
    const location = err.line
      ? `:${err.line}${err.column ? `:${err.column}` : ""}`
      : "";
    const icon = err.severity === "error" ? "❌" : "⚠️";
    return `${icon} ${err.file}${location}: ${err.message}`;
  });

  return `Found ${errors.length} issue(s):\n${lines.join("\n")}`;
}
