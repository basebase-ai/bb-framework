/**
 * Virtual Module System
 * Loads and executes app code from Firestore dynamically
 */

export class ModuleLoader {
  constructor(modules, frameworkExports) {
    this.modules = {}; // Registry of all modules
    this.frameworkExports = frameworkExports || {}; // Framework exports available to app

    // Register all modules
    Object.entries(modules).forEach(([path, code]) => {
      this.registerModule(path, code);
    });
  }

  registerModule(path, code) {
    this.modules[path] = {
      path,
      code,
      exports: {},
      loaded: false,
      error: null,
    };
  }

  /**
   * Resolve import path relative to importer
   * e.g., "./components/Button.jsx" from "app.jsx" → "components/Button.jsx"
   */
  resolvePath(importPath, importerPath) {
    // Handle relative imports
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const importerDir = importerPath.split("/").slice(0, -1).join("/");
      const resolved = this.normalizePath(`${importerDir}/${importPath}`);

      // Try exact match first
      if (this.modules[resolved]) return resolved;

      // Try with .js extension (for .jsx imports)
      const withJs = resolved.replace(/\.jsx$/, ".js");
      if (this.modules[withJs]) return withJs;

      return resolved;
    }

    // Handle framework imports (e.g., "../../framework/hooks/useAuth.js")
    if (importPath.includes("framework/")) {
      // These will be provided by frameworkExports
      return importPath;
    }

    // Absolute app imports
    return importPath;
  }

  normalizePath(path) {
    const parts = path.split("/");
    const result = [];

    for (const part of parts) {
      if (part === "..") {
        result.pop();
      } else if (part !== "." && part !== "") {
        result.push(part);
      }
    }

    return result.join("/");
  }

  /**
   * Load and execute a module
   */
  require(modulePath, importerPath = "") {
    // Skip CSS imports (they should be loaded in the HTML)
    if (modulePath.endsWith(".css")) {
      return {};
    }

    // Check if it's an external module (react, @mantine/core, etc.)
    if (this.frameworkExports[modulePath]) {
      return this.frameworkExports[modulePath];
    }

    const resolvedPath = this.resolvePath(modulePath, importerPath);

    // Check again with resolved path (for framework imports)
    if (this.frameworkExports[resolvedPath]) {
      return this.frameworkExports[resolvedPath];
    }

    const module = this.modules[resolvedPath];

    if (!module) {
      // Provide helpful error message
      const isExternalPackage =
        !modulePath.startsWith(".") && !modulePath.startsWith("/");
      if (isExternalPackage) {
        throw new Error(
          `Module not found: ${modulePath} (imported from ${importerPath})\n\n` +
            `This looks like an external package. If you just added it to package.json, ` +
            `you need to register it in framework/production-entry.js:\n` +
            `1. Add: import * as ${modulePath
              .split("/")[0]
              .replace(/[^a-zA-Z0-9]/g, "")} from '${modulePath}';\n` +
            `2. Register in frameworkExports: '${modulePath}': ${modulePath
              .split("/")[0]
              .replace(/[^a-zA-Z0-9]/g, "")}\n` +
            `3. Rebuild: npm run build\n` +
            `4. Commit and deploy to Railway`
        );
      }
      throw new Error(
        `Module not found: ${modulePath} (imported from ${importerPath})`
      );
    }

    // Return cached exports if already loaded
    if (module.loaded) {
      return module.exports;
    }

    // Check for circular dependencies
    if (module.loading) {
      console.warn(`Circular dependency detected: ${resolvedPath}`);
      return module.exports;
    }

    module.loading = true;

    try {
      // Create module context
      const moduleContext = {
        exports: module.exports,
        require: (path) => this.require(path, resolvedPath),
      };

      // Transform CommonJS-style code to be executable
      // The compiled code from sucrase will use require() and module.exports
      const wrappedCode = `
        (function(module, exports, require) {
          ${module.code}
          return module.exports;
        })
      `;

      // Execute the module
      const moduleFunction = eval(wrappedCode);
      const result = moduleFunction(
        moduleContext,
        moduleContext.exports,
        moduleContext.require
      );

      module.exports = result || moduleContext.exports;
      module.loaded = true;
      module.loading = false;

      return module.exports;
    } catch (error) {
      module.error = error;
      module.loading = false;
      console.error(`Error loading module ${resolvedPath}:`, error);
      throw error;
    }
  }

  /**
   * Load the entry module (typically app.js)
   */
  loadEntry(entryPath = "app.js") {
    return this.require(entryPath);
  }
}
