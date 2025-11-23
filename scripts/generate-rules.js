#!/usr/bin/env node
/**
 * Generate Firestore security rules from schema
 * Usage: npm run generate:rules [appId]
 * Default appId: starter-app
 */

import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outputPath = join(root, "firestore.rules");

// Get appId from command line args, default to starter-app
const appId = process.argv[2] || "starter-app";
const schemaPath = join(root, `apps/${appId}/schema.js`);

async function generateRules() {
  console.log(chalk.cyan("\n🔒 Generating Firestore security rules from schema...\n"));

  try {
    // Dynamic import of schema
    const schemaModule = await import(`file://${schemaPath}`);
    const schema = schemaModule.schema;

    let rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
`;

    // Helper to convert simple rule expressions to proper Firestore rules
    const convertRule = (ruleExpr) => {
      // The schema already contains proper resource.data and request.resource.data references
      // We just need to replace "auth" with "request.auth"
      let rule = ruleExpr;
      
      // Replace auth.uid with request.auth.uid
      rule = rule.replace(/\bauth\.uid\b/g, "request.auth.uid");
      
      // Replace standalone "auth" with "request.auth" (but only if not already prefixed)
      rule = rule.replace(/\bauth\b(?!\s*\.)/g, "request.auth");
      
      // Replace doc.id with just doc (Firestore convention)
      rule = rule.replace(/\bdoc\.id\b/g, "doc");
      
      return rule;
    };

    // Generate rules for each collection
    Object.entries(schema).forEach(([collectionName, config]) => {
      rules += `\n    // ${collectionName} collection\n`;
      rules += `    match /${collectionName}/{doc} {\n`;

      // Read rule
      if (config.rules.read) {
        const readRule = convertRule(config.rules.read);
        rules += `      allow read: if ${readRule};\n`;
      }

      // Write rule (covers update)
      if (config.rules.write) {
        const writeRule = convertRule(config.rules.write);
        rules += `      allow update: if ${writeRule};\n`;
      }

      // Create rule
      if (config.rules.create) {
        const createRule = convertRule(config.rules.create);
        rules += `      allow create: if ${createRule};\n`;
      }

      // Delete rule
      if (config.rules.delete) {
        const deleteRule = convertRule(config.rules.delete);
        rules += `      allow delete: if ${deleteRule};\n`;
      }

      // Subcollections
      if (config.subcollections) {
        Object.entries(config.subcollections).forEach(([subName, subConfig]) => {
          rules += `\n      // ${subName} subcollection\n`;
          rules += `      match /${subName}/{subdoc} {\n`;

          const subRules = subConfig.rules || config.rules;
          
          if (subRules.read) {
            const readRule = convertRule(subRules.read);
            rules += `        allow read: if ${readRule};\n`;
          }
          if (subRules.write) {
            const writeRule = convertRule(subRules.write);
            rules += `        allow update: if ${writeRule};\n`;
          }
          if (subRules.create) {
            const createRule = convertRule(subRules.create);
            rules += `        allow create: if ${createRule};\n`;
          }
          if (subRules.delete) {
            const deleteRule = convertRule(subRules.delete);
            rules += `        allow delete: if ${deleteRule};\n`;
          }

          rules += `      }\n`;
        });
      }

      rules += `    }\n`;
    });

    rules += `  }
}
`;

    // Write to file
    await writeFile(outputPath, rules);

    console.log(chalk.green("✅ Firestore rules generated successfully!"));
    console.log(chalk.gray(`   Output: ${outputPath}\n`));
    console.log(chalk.yellow("📋 Next steps:"));
    console.log(chalk.white("   1. Review the generated rules in"), chalk.cyan("firestore.rules"));
    console.log(chalk.white("   2. Deploy with:"), chalk.cyan("firebase deploy --only firestore:rules"));
    console.log(chalk.white("   3. Or copy/paste into Firebase Console → Firestore → Rules\n"));

    // Display the rules
    console.log(chalk.gray("Generated rules:\n"));
    console.log(chalk.dim(rules));

  } catch (error) {
    console.error(chalk.red("\n❌ Failed to generate rules:"), error.message);
    process.exit(1);
  }
}

generateRules();

