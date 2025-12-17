#!/usr/bin/env node
/**
 * Debug app version data in Firestore
 * Usage: npm run app:debug <appId>
 *
 * Shows what files are in source vs compiled to diagnose checkout issues
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import chalk from "chalk";
import { firebaseConfig } from "../config/firebase.config.js";

// Initialize Firebase with public config (no auth needed for read)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debug(appId) {
  console.log(chalk.cyan(`\n🔍 Debugging app: ${appId}\n`));

  try {
    // Get app document
    console.log(chalk.cyan("📡 Fetching app metadata..."));
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      console.error(chalk.red(`❌ App "${appId}" not found`));
      process.exit(1);
    }

    const appData = appSnap.data();
    const currentVersion = appData.currentVersion;

    console.log(chalk.gray(`   Current version: ${currentVersion}`));
    console.log(chalk.gray(`   Owner: ${appData.owner}`));

    // Get version document
    console.log(chalk.cyan("\n📡 Fetching version data..."));
    const versionRef = doc(db, "apps", appId, "versions", currentVersion);
    const versionSnap = await getDoc(versionRef);

    if (!versionSnap.exists()) {
      console.error(chalk.red(`❌ Version "${currentVersion}" not found`));
      process.exit(1);
    }

    const versionData = versionSnap.data();
    const source = versionData.source || {};
    const compiled = versionData.compiled || {};
    const metadata = versionData.metadata || {};

    console.log(
      chalk.gray(
        `   Published: ${metadata.publishedAt?.toDate?.() || "unknown"}`
      )
    );
    console.log(chalk.gray(`   Message: ${metadata.message || "none"}`));

    // List files in source (what checkout uses)
    const sourceFiles = Object.keys(source).sort();
    console.log(
      chalk.cyan(
        `\n📁 SOURCE files (${sourceFiles.length}) - used by checkout:`
      )
    );
    sourceFiles.forEach((f) => {
      const size = source[f]?.length || 0;
      const isSchema = f.includes("schema") ? chalk.yellow(" ← SCHEMA") : "";
      console.log(
        chalk.gray(`   ${f} (${(size / 1024).toFixed(1)}kb)${isSchema}`)
      );
    });

    // List files in compiled (what production uses)
    const compiledFiles = Object.keys(compiled).sort();
    console.log(
      chalk.cyan(
        `\n📁 COMPILED files (${compiledFiles.length}) - used by production:`
      )
    );
    compiledFiles.forEach((f) => {
      const size = compiled[f]?.length || 0;
      const isSchema = f.includes("schema") ? chalk.yellow(" ← SCHEMA") : "";
      console.log(
        chalk.gray(`   ${f} (${(size / 1024).toFixed(1)}kb)${isSchema}`)
      );
    });

    // Check for discrepancies
    console.log(chalk.cyan("\n🔎 Analysis:"));

    // Files in compiled but not source
    const compiledOnly = compiledFiles.filter((f) => {
      // Normalize .js/.jsx difference
      const base = f.replace(/\.js$/, "");
      return !sourceFiles.some((s) => s.replace(/\.(jsx?|tsx?)$/, "") === base);
    });

    if (compiledOnly.length > 0) {
      console.log(chalk.yellow(`\n   ⚠️  Files in COMPILED but not SOURCE:`));
      compiledOnly.forEach((f) => console.log(chalk.red(`      - ${f}`)));
    }

    // Check for schema specifically
    const hasSourceSchema = sourceFiles.some((f) => f.includes("schema"));
    const hasCompiledSchema = compiledFiles.some((f) => f.includes("schema"));

    console.log(
      chalk.white(
        `\n   Schema in source: ${hasSourceSchema ? "✅ YES" : "❌ NO"}`
      )
    );
    console.log(
      chalk.white(
        `   Schema in compiled: ${hasCompiledSchema ? "✅ YES" : "❌ NO"}`
      )
    );

    if (!hasSourceSchema && hasCompiledSchema) {
      console.log(
        chalk.red(
          `\n   🚨 PROBLEM FOUND: schema.js exists in compiled but NOT in source!`
        )
      );
      console.log(
        chalk.yellow(
          `   This explains why checkout doesn't get the schema file.`
        )
      );
      console.log(
        chalk.yellow(
          `   The app needs to be re-committed from a local copy that has schema.js`
        )
      );
    }

    console.log(chalk.green("\n✅ Debug complete!\n"));
  } catch (error) {
    console.error(chalk.red("\n❌ Debug failed:"), error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse arguments
const appId = process.argv[2];

if (!appId) {
  console.error(chalk.red("\n❌ App ID required"));
  console.log(chalk.white("\nUsage:"), chalk.cyan("npm run app:debug <appId>"));
  console.log(
    chalk.white("Example:"),
    chalk.cyan("npm run app:debug sagestocks\n")
  );
  process.exit(1);
}

debug(appId);

