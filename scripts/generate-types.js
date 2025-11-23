#!/usr/bin/env node
/**
 * Generate TypeScript types from schema
 */

import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Get appId from command line args, default to starter-app
const appId = process.argv[2] || "starter-app";
const schemaPath = join(root, `apps/${appId}/schema.js`);
const outputPath = join(root, `apps/${appId}/types.d.ts`);

async function generateTypes() {
  console.log(chalk.cyan("\n📝 Generating TypeScript types from schema...\n"));

  try {
    // Dynamic import of schema
    const schemaModule = await import(schemaPath);
    const schema = schemaModule.schema;

    let types = "// Auto-generated types from schema.js\n\n";

    Object.entries(schema).forEach(([collectionName, config]) => {
      const typeName = collectionName.charAt(0).toUpperCase() + collectionName.slice(0, -1);
      
      types += `export interface ${typeName} {\n`;
      types += "  id: string;\n";

      Object.entries(config.fields).forEach(([fieldName, fieldConfig]) => {
        const optional = !fieldConfig.required ? "?" : "";
        let tsType = "any";

        switch (fieldConfig.type) {
          case "string":
            tsType = "string";
            break;
          case "number":
            tsType = "number";
            break;
          case "boolean":
            tsType = "boolean";
            break;
          case "timestamp":
            tsType = "Date | { toDate: () => Date }";
            break;
          case "reference":
            tsType = "string";
            break;
          case "array":
            tsType = "any[]";
            break;
          case "map":
            tsType = "Record<string, any>";
            break;
          case "enum":
            tsType = fieldConfig.values.map((v) => `"${v}"`).join(" | ");
            break;
        }

        types += `  ${fieldName}${optional}: ${tsType};\n`;
      });

      types += "}\n\n";
    });

    await writeFile(outputPath, types);

    console.log(chalk.green("✅ Types generated successfully!"));
    console.log(chalk.gray(`   Output: ${outputPath}\n`));
  } catch (error) {
    console.error(chalk.red("\n❌ Failed to generate types:"), error.message);
    process.exit(1);
  }
}

generateTypes();

