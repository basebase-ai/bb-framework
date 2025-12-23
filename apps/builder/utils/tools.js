/**
 * Agent Tools
 * Tool implementations for the LLM agent to manipulate app files
 */

import { lintAllFiles, formatLintErrors } from "./linter.js";
import { formatFilesWithLineNumbers, saveAppFiles } from "./fileSystem.js";
import { writeDraft } from "./draftSync.js";
import { formatFileWithLineNumbers, searchExampleApps } from "./appExamples.js";

/**
 * @typedef {Object} ToolResult
 * @property {boolean} success
 * @property {string} output - Formatted output for the agent
 * @property {Record<string, string>} [files] - Updated files (if changed)
 * @property {import('./linter.js').LintError[]} [errors] - Lint errors
 */

/**
 * Tool definitions for the agent (OpenAI function calling format)
 */
export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "listFiles",
      description:
        "List all files in the current app with line counts. Use this for a quick overview before reading specific files.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "readFile",
      description:
        "Read a single file with line numbers. Prefer this over readFiles when you only need one file.",
      parameters: {
        type: "object",
        properties: {
          fileName: {
            type: "string",
            description:
              "Path to the file, e.g. 'app.jsx' or 'components/Todo.jsx'",
          },
        },
        required: ["fileName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "readFiles",
      description:
        "Read ALL files in the current app. Returns all file contents with line numbers. Only use when you need to see everything at once.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchCurrentApp",
      description:
        "Search the currently loaded app files using a regex pattern. Returns matches with line numbers and ~5 lines of context.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              'Regex pattern string, e.g. "AuthProvider|landingPage"',
          },
          flags: {
            type: "string",
            description: 'Regex flags (default: i). Example: "im"',
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createFile",
      description:
        "Create a new file in the app. If the file already exists, it will be overwritten. Returns only the created file (not all files).",
      parameters: {
        type: "object",
        properties: {
          fileName: {
            type: "string",
            description:
              "Path to the file, e.g. 'components/TodoList.jsx' or 'schema.js'",
          },
          content: {
            type: "string",
            description: "The full content of the file",
          },
        },
        required: ["fileName", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replaceLines",
      description:
        "Replace specific lines in a file. Line numbers are 1-indexed. Returns only the edited file (not all files).",
      parameters: {
        type: "object",
        properties: {
          fileName: {
            type: "string",
            description: "Path to the file to edit",
          },
          startLine: {
            type: "number",
            description: "First line to replace (1-indexed, inclusive)",
          },
          endLine: {
            type: "number",
            description: "Last line to replace (1-indexed, inclusive)",
          },
          replacement: {
            type: "string",
            description: "Text to insert in place of the specified lines",
          },
        },
        required: ["fileName", "startLine", "endLine", "replacement"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete a file from the app. Returns confirmation only.",
      parameters: {
        type: "object",
        properties: {
          fileName: {
            type: "string",
            description: "Path to the file to delete",
          },
        },
        required: ["fileName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchExampleApps",
      description:
        "Search a curated set of published Basebase apps (latest version) using a regex pattern. Returns matches with ~5 lines of context and line numbers.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: 'Regex pattern string, e.g. ".*login.*|.*signin.*"',
          },
          flags: {
            type: "string",
            description: 'Regex flags (default: i). Example: "im"',
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "readExampleApp",
      description:
        "Read an example app file from the curated published apps list. If fileName is omitted, returns all files for that app. Always returns with line numbers.",
      parameters: {
        type: "object",
        properties: {
          appId: { type: "string", description: "Example app ID" },
          fileName: {
            type: "string",
            description:
              "Optional file path (e.g. 'app.jsx'). If omitted, returns all files.",
          },
        },
        required: ["appId"],
      },
    },
  },
];

/**
 * Execute a tool call
 * @param {string} toolName
 * @param {Record<string, any>} args
 * @param {() => { files: Record<string, string>, currentAppId: string | null, userId: string | null, userEmail: string | null, exampleApps?: Record<string, { files: Record<string, string>, versionHash: string | null, loadedAt: number }> }} getState
 * @param {(files: Record<string, string>) => void} updateFiles
 * @returns {Promise<ToolResult>}
 */
export async function executeTool(toolName, args, getState, updateFiles) {
  const { files, currentAppId, userId, userEmail, exampleApps } = getState();

  /** @type {ToolResult} */
  let result;

  switch (toolName) {
    case "listFiles":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeListFiles(files);
      break;

    case "readFile":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeReadFile(files, args);
      break;

    case "readFiles":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeReadFiles(files);
      break;

    case "searchCurrentApp":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeSearchCurrentApp(files, args);
      break;

    case "createFile":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeCreateFile(files, args, currentAppId, updateFiles);
      break;

    case "replaceLines":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeReplaceLines(files, args, currentAppId, updateFiles);
      break;

    case "deleteFile":
      if (!currentAppId) {
        return {
          success: false,
          output:
            "Error: No app is currently selected. Please create or open an app first.",
        };
      }
      result = executeDeleteFile(files, args, currentAppId, updateFiles);
      break;

    // Example tools (preferred names)
    case "searchExampleApps":
      result = executeSearchAppExamples(exampleApps || {}, args);
      break;

    case "readExampleApp":
      result = executeReadAppExample(exampleApps || {}, args);
      break;

    default:
      return {
        success: false,
        output: `Error: Unknown tool '${toolName}'`,
      };
  }

  // Sync draft to Firestore for mutating operations
  if (result.success && result.files && userId) {
    const draftResult = await writeDraft(
      currentAppId,
      result.files,
      userId,
      userEmail
    );
    if (!draftResult.success) {
      console.warn("Failed to sync draft:", draftResult.error);
      // Don't fail the tool, just warn
    }
  }

  return result;
}

/**
 * List all files with line counts (lightweight)
 * @param {Record<string, string>} files
 * @returns {ToolResult}
 */
function executeListFiles(files) {
  const fileNames = Object.keys(files);
  if (fileNames.length === 0) {
    return {
      success: true,
      output: "The app is empty. No files found.",
    };
  }

  const listing = fileNames
    .sort()
    .map((name) => {
      const lineCount = (files[name] || "").split("\n").length;
      return `${name} (${lineCount} lines)`;
    })
    .join("\n");

  return {
    success: true,
    output: `Files in app:\n${listing}`,
  };
}

/**
 * Read a single file with line numbers
 * @param {Record<string, string>} files
 * @param {{ fileName?: string }} args
 * @returns {ToolResult}
 */
function executeReadFile(files, args) {
  const fileName = args?.fileName;
  if (!fileName) {
    return { success: false, output: "Error: fileName is required" };
  }

  const content = files[fileName];
  if (typeof content !== "string") {
    return {
      success: false,
      output: `Error: File '${fileName}' not found. Use listFiles() to see available files.`,
    };
  }

  return {
    success: true,
    output: formatFileWithLineNumbers(fileName, content),
  };
}

/**
 * Search curated example apps using regex.
 * @param {Record<string, { files: Record<string, string>, versionHash: string | null, loadedAt: number }>} exampleApps
 * @param {{ pattern?: string, flags?: string }} args
 * @returns {ToolResult}
 */
function executeSearchAppExamples(exampleApps, args) {
  const pattern = args?.pattern;
  const flags = args?.flags;
  if (!pattern) {
    return { success: false, output: "Error: pattern is required" };
  }
  if (!exampleApps || Object.keys(exampleApps).length === 0) {
    return {
      success: false,
      output:
        "No curated examples are loaded yet. Please wait a moment and try again.",
    };
  }

  const res = searchExampleApps(exampleApps, pattern, {
    contextLines: 5,
    maxMatches: 30,
    flags: typeof flags === "string" ? flags : "i",
  });

  if (!res.ok) return { success: false, output: res.error };
  return { success: true, output: res.output };
}

/**
 * Read an example app file (or all files) with line numbers.
 * @param {Record<string, { files: Record<string, string>, versionHash: string | null, loadedAt: number }>} exampleApps
 * @param {{ appId?: string, fileName?: string }} args
 * @returns {ToolResult}
 */
function executeReadAppExample(exampleApps, args) {
  const appId = args?.appId;
  const fileName = args?.fileName;
  if (!appId) return { success: false, output: "Error: appId is required" };

  const app = exampleApps[appId];
  if (!app) {
    return {
      success: false,
      output: `Error: Example app '${appId}' not found in curated examples.`,
    };
  }

  if (fileName) {
    const content = app.files[fileName];
    if (typeof content !== "string") {
      return {
        success: false,
        output: `Error: File '${fileName}' not found in example app '${appId}'.`,
      };
    }
    return {
      success: true,
      output: formatFileWithLineNumbers(fileName, content),
    };
  }

  // All files
  return { success: true, output: formatFilesWithLineNumbers(app.files) };
}

/**
 * Read all files - returns formatted content with line numbers
 * @param {Record<string, string>} files
 * @returns {ToolResult}
 */
function executeReadFiles(files) {
  if (Object.keys(files).length === 0) {
    return {
      success: true,
      output: "The app is empty. No files found.",
    };
  }

  const formatted = formatFilesWithLineNumbers(files);
  const lintErrors = lintAllFiles(files);
  const lintOutput = formatLintErrors(lintErrors);

  return {
    success: true,
    output: `${formatted}\n\n--- Lint Status ---\n${lintOutput}`,
    files,
    errors: lintErrors,
  };
}

/**
 * Search current app files using regex and return context with line numbers.
 * @param {Record<string, string>} files
 * @param {{ pattern?: string, flags?: string }} args
 * @returns {ToolResult}
 */
function executeSearchCurrentApp(files, args) {
  const pattern = args?.pattern;
  const flags = typeof args?.flags === "string" ? args.flags : "i";
  const contextLines = 5;
  const maxMatches = 50;

  if (!pattern) {
    return { success: false, output: "Error: pattern is required" };
  }

  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { success: false, output: `Invalid regex: ${e.message}` };
  }

  /** @type {string[]} */
  const chunks = [];
  let matchCount = 0;

  for (const [fileName, content] of Object.entries(files || {})) {
    const lines = String(content || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;

      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length - 1, i + contextLines);

      const excerpt = lines
        .slice(start, end + 1)
        .map(
          (line, idx) => `${String(start + idx + 1).padStart(4, " ")} | ${line}`
        )
        .join("\n");

      chunks.push(
        `--- CURRENT :: ${fileName} :: lines ${start + 1}-${
          end + 1
        } ---\n${excerpt}`
      );

      matchCount++;
      if (matchCount >= maxMatches) {
        chunks.push(
          `\n[TRUNCATED] Reached maxMatches=${maxMatches}. Refine your regex for more specific results.`
        );
        return { success: true, output: chunks.join("\n\n") };
      }
    }
  }

  if (matchCount === 0) {
    return { success: true, output: "No matches found in current app files." };
  }

  return { success: true, output: chunks.join("\n\n") };
}

/**
 * Create or overwrite a file
 * @param {Record<string, string>} files
 * @param {{ fileName: string, content: string }} args
 * @param {string} appId
 * @param {(files: Record<string, string>) => void} updateFiles
 * @returns {ToolResult}
 */
function executeCreateFile(files, args, appId, updateFiles) {
  const { fileName, content } = args;

  if (!fileName) {
    return { success: false, output: "Error: fileName is required" };
  }

  const isNew = !files[fileName];
  const newFiles = { ...files, [fileName]: content };

  // Save to localStorage
  saveAppFiles(appId, newFiles);
  updateFiles(newFiles);

  // Lint the updated files
  const lintErrors = lintAllFiles(newFiles);
  const lintOutput = formatLintErrors(lintErrors);

  // Format output - only show the created/updated file, not all files
  const action = isNew ? "Created" : "Updated";
  const lineCount = content.split("\n").length;
  const fileFormatted = formatFileWithLineNumbers(fileName, content);

  return {
    success: true,
    output: `${action} ${fileName} (${lineCount} lines)\n\n${fileFormatted}\n\n--- Lint Status ---\n${lintOutput}`,
    files: newFiles,
    errors: lintErrors,
  };
}

/**
 * Replace lines in a file
 * @param {Record<string, string>} files
 * @param {{ fileName: string, startLine: number, endLine: number, replacement: string }} args
 * @param {string} appId
 * @param {(files: Record<string, string>) => void} updateFiles
 * @returns {ToolResult}
 */
function executeReplaceLines(files, args, appId, updateFiles) {
  const { fileName, startLine, endLine, replacement } = args;

  if (!fileName) {
    return { success: false, output: "Error: fileName is required" };
  }

  if (!files[fileName]) {
    return { success: false, output: `Error: File '${fileName}' not found` };
  }

  if (typeof startLine !== "number" || typeof endLine !== "number") {
    return {
      success: false,
      output: "Error: startLine and endLine must be numbers",
    };
  }

  const lines = files[fileName].split("\n");

  if (startLine < 1 || endLine < startLine || endLine > lines.length) {
    return {
      success: false,
      output: `Error: Invalid line range. File has ${lines.length} lines. Got startLine=${startLine}, endLine=${endLine}`,
    };
  }

  // Replace lines (convert to 0-indexed)
  const replacementLines = replacement.split("\n");
  const newLines = [
    ...lines.slice(0, startLine - 1),
    ...replacementLines,
    ...lines.slice(endLine),
  ];

  const newContent = newLines.join("\n");
  const newFiles = { ...files, [fileName]: newContent };

  // Save to localStorage
  saveAppFiles(appId, newFiles);
  updateFiles(newFiles);

  // Lint the updated files
  const lintErrors = lintAllFiles(newFiles);
  const lintOutput = formatLintErrors(lintErrors);

  // Format output - only show the edited file, not all files
  const linesReplaced = endLine - startLine + 1;
  const linesInserted = replacementLines.length;
  const fileFormatted = formatFileWithLineNumbers(fileName, newContent);

  return {
    success: true,
    output: `Replaced lines ${startLine}-${endLine} (${linesReplaced} lines) with ${linesInserted} lines in ${fileName}\n\n${fileFormatted}\n\n--- Lint Status ---\n${lintOutput}`,
    files: newFiles,
    errors: lintErrors,
  };
}

/**
 * Delete a file
 * @param {Record<string, string>} files
 * @param {{ fileName: string }} args
 * @param {string} appId
 * @param {(files: Record<string, string>) => void} updateFiles
 * @returns {ToolResult}
 */
function executeDeleteFile(files, args, appId, updateFiles) {
  const { fileName } = args;

  if (!fileName) {
    return { success: false, output: "Error: fileName is required" };
  }

  if (!files[fileName]) {
    return { success: false, output: `Error: File '${fileName}' not found` };
  }

  const newFiles = { ...files };
  delete newFiles[fileName];

  // Save to localStorage
  saveAppFiles(appId, newFiles);
  updateFiles(newFiles);

  // Lint the updated files
  const lintErrors = lintAllFiles(newFiles);
  const lintOutput = formatLintErrors(lintErrors);

  // Format output - just confirmation + remaining file list (no content)
  const remainingFiles = Object.keys(newFiles);
  const remainingList =
    remainingFiles.length > 0
      ? `Remaining files: ${remainingFiles.sort().join(", ")}`
      : "No files remaining.";

  return {
    success: true,
    output: `Deleted ${fileName}\n\n${remainingList}\n\n--- Lint Status ---\n${lintOutput}`,
    files: newFiles,
    errors: lintErrors,
  };
}

/**
 * Get system prompt for the agent
 * @param {string} appId
 * @returns {string}
 */
export function getSystemPrompt(appId) {
  return `You are an AI assistant helping to build a Basebase web application called "${appId}".

## About Basebase

Basebase is a React-based framework for building web apps with:
- React 18 + Mantine UI components
- Firebase Firestore for real-time data
- Built-in authentication via AuthProvider
- Zustand for local UI state

## Project Structure

A typical Basebase app has:
- \`schema.js\` - Defines APP_ID and collection names
- \`app.jsx\` - Main entry point, sets up providers and renders the app
- \`components/*.jsx\` - React components
- \`stores/*.js\` - Zustand stores for local state (optional)
- \`hooks/*.js\` - Custom hooks (optional)

## Key Patterns

### Collections (Firestore)
\`\`\`javascript
import { useCollection } from "../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";

const { data, loading, add, update, remove } = useCollection(collections.myCollection, {
  where: [["owner", "==", user?.uid]],
  orderBy: ["createdAt", "desc"],
});
\`\`\`

### Authentication
\`\`\`javascript
import { useAuth } from "../../framework/hooks/useAuth.js";
const { user, authenticated } = useAuth();
\`\`\`

### Framework Imports
Always use relative paths to framework:
- \`../../framework/hooks/useAuth.js\`
- \`../../framework/hooks/useCollection.js\`
- \`../../framework/components/AuthProvider.jsx\`

## Your Tools

You have these tools available (prefer lightweight tools first!):

**Reading (prefer specific over broad):**
1. \`listFiles()\` - Quick overview: file names + line counts (use this first!)
2. \`readFile(fileName)\` - Read ONE file with line numbers (prefer this)
3. \`readFiles()\` - Read ALL files (only when you need everything)
4. \`searchCurrentApp(pattern, flags?)\` - Regex search with ~5 lines context

**Writing (returns only the affected file):**
5. \`createFile(fileName, content)\` - Create or overwrite a file
6. \`replaceLines(fileName, startLine, endLine, replacement)\` - Edit specific lines
7. \`deleteFile(fileName)\` - Remove a file

**Examples (for learning patterns):**
8. \`searchExampleApps(pattern, flags?)\` - Search curated apps with ~5 lines context
9. \`readExampleApp(appId, fileName?)\` - Read example app file(s)

**Efficiency tips:**
- Start with \`listFiles()\` to see what exists, then \`readFile()\` for specific files
- After edits, you only see the edited file - use \`readFile()\` if you need to check another file
- Fix lint errors before continuing

## Guidelines

1. Always start by reading the current files to understand the app state
2. If you're unsure about a Basebase-specific pattern, you MUST search curated examples first (and then read the relevant file) before implementing. This is especially important for:
   - Authentication / landing pages / access control (AuthProvider, roles, membership)
   - Firestore collection access patterns (namespacing via APP_ID, useCollection/useDocument queries)
   - File/image/video storage patterns (useStorage, FileUploader, CDN URLs)
   - Getting auth user info and profiles (useAuth, useUserProfile/useUserProfiles)
   - Secrets and server functions (useFunction, server-side context, API keys)
   - Third-party integrations (OAuth via useNangoOAuth, API keys, external requests)
   Use \`searchExampleApps(...)\` to find the pattern, then \`readExampleApp(appId, fileName)\` to copy it precisely.
3. Prefer copying the exact working pattern from curated examples over inventing a new approach.
4. If you create a logged-out/unauthenticated page, wire it through \`AuthProvider\`'s \`landingPage\` prop (do not rely on checking \`user\` inside children only).
5. When adding external dependencies, do not assume they are available in production unless they are registered in the framework's production exports.
   - Use \`searchExampleApps("landingPage|AuthProvider|signIn|login")\` or similar
   - Then use \`readExampleApp("starter-app", "app.jsx")\` (or other relevant file) to copy the exact working pattern
2. Make incremental changes and verify they work
3. Use Mantine components for UI (Button, TextInput, Stack, Group, Paper, etc.)
4. Follow React best practices (hooks, functional components)
5. Keep code clean and well-commented
6. Use JSDoc type annotations for better tooling

The user will describe what they want to build. Help them create a working Basebase app!`;
}
