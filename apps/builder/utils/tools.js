/**
 * Agent Tools
 * Tool implementations for the LLM agent to manipulate app files
 */

import { lintAllFiles, formatLintErrors } from "./linter.js";
import { formatFilesWithLineNumbers, saveAppFiles } from "./fileSystem.js";
import { writeDraft } from "./draftSync.js";

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
      name: "readFiles",
      description:
        "Read all files in the current app. Returns all file contents with line numbers. Use this to see the current state of the app.",
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
      name: "createFile",
      description:
        "Create a new file in the app. If the file already exists, it will be overwritten.",
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
        "Replace specific lines in a file. Line numbers are 1-indexed. The replacement text replaces lines from startLine to endLine (inclusive).",
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
      description: "Delete a file from the app.",
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
];

/**
 * Execute a tool call
 * @param {string} toolName
 * @param {Record<string, any>} args
 * @param {() => { files: Record<string, string>, currentAppId: string | null, userId: string | null, userEmail: string | null }} getState
 * @param {(files: Record<string, string>) => void} updateFiles
 * @returns {Promise<ToolResult>}
 */
export async function executeTool(toolName, args, getState, updateFiles) {
  const { files, currentAppId, userId, userEmail } = getState();

  if (!currentAppId) {
    return {
      success: false,
      output:
        "Error: No app is currently selected. Please init or checkout an app first.",
    };
  }

  /** @type {ToolResult} */
  let result;

  switch (toolName) {
    case "readFiles":
      result = executeReadFiles(files);
      break;

    case "createFile":
      result = executeCreateFile(files, args, currentAppId, updateFiles);
      break;

    case "replaceLines":
      result = executeReplaceLines(files, args, currentAppId, updateFiles);
      break;

    case "deleteFile":
      result = executeDeleteFile(files, args, currentAppId, updateFiles);
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

  // Format output
  const action = isNew ? "Created" : "Updated";
  const lineCount = content.split("\n").length;
  const formatted = formatFilesWithLineNumbers(newFiles);

  return {
    success: true,
    output: `${action} ${fileName} (${lineCount} lines)\n\n${formatted}\n\n--- Lint Status ---\n${lintOutput}`,
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

  // Format output
  const linesReplaced = endLine - startLine + 1;
  const linesInserted = replacementLines.length;
  const formatted = formatFilesWithLineNumbers(newFiles);

  return {
    success: true,
    output: `Replaced lines ${startLine}-${endLine} (${linesReplaced} lines) with ${linesInserted} lines in ${fileName}\n\n${formatted}\n\n--- Lint Status ---\n${lintOutput}`,
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

  // Format output
  const formatted =
    Object.keys(newFiles).length > 0
      ? formatFilesWithLineNumbers(newFiles)
      : "No files remaining.";

  return {
    success: true,
    output: `Deleted ${fileName}\n\n${formatted}\n\n--- Lint Status ---\n${lintOutput}`,
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

You have these tools available:
1. \`readFiles()\` - See all current files with line numbers
2. \`createFile(fileName, content)\` - Create or overwrite a file
3. \`replaceLines(fileName, startLine, endLine, replacement)\` - Edit specific lines
4. \`deleteFile(fileName)\` - Remove a file

After each edit, you'll see the updated files and any lint errors. Fix lint errors before continuing.

## Guidelines

1. Always start by reading the current files to understand the app state
2. Make incremental changes and verify they work
3. Use Mantine components for UI (Button, TextInput, Stack, Group, Paper, etc.)
4. Follow React best practices (hooks, functional components)
5. Keep code clean and well-commented
6. Use JSDoc type annotations for better tooling

The user will describe what they want to build. Help them create a working Basebase app!`;
}
