#!/usr/bin/env node
/**
 * Simple development server using Vite
 */

import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function startDevServer() {
  try {
    console.log(chalk.cyan("\n🚀 Starting Basebase development server...\n"));

    // Create Vite server (uses vite.config.js from project root)
    const server = await createServer({
      configFile: join(root, "vite.config.js"),
    });

    await server.listen();

    server.printUrls();

    console.log(chalk.gray("\n  Watching for changes...\n"));
  } catch (error) {
    console.error(chalk.red("\n❌ Failed to start dev server:"), error.message);
    console.error(error);
    process.exit(1);
  }
}

startDevServer();

