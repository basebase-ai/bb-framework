/**
 * PostgreSQL Data Operations
 *
 * Unified function for querying PostgreSQL databases.
 * Use the `action` parameter to specify the operation.
 *
 * Credentials are stored in user-secrets collection as:
 * { services: { postgres: { connectionString } } }
 *
 * @param {Object} params - Function parameters
 * @param {string} params.action - Action: "listTables" | "query"
 * @param {string} [params.tableName] - Table name (required for query)
 * @param {number} [params.limit=100] - Max records to fetch (for query)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Action-specific result
 */
module.exports = async function (params, context) {
  const { action } = params;

  if (!action) {
    throw new Error("action is required: listTables | query");
  }

  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const db = context.firestore();

  // Get stored credentials from user-secrets
  const userSecretsDoc = await db.collection("user-secrets").doc(userId).get();
  const postgresCredentials = userSecretsDoc.exists
    ? userSecretsDoc.data()?.services?.postgres
    : null;

  if (!postgresCredentials) {
    throw new Error(
      "PostgreSQL not connected. Please add your credentials first."
    );
  }

  const { connectionString } = postgresCredentials;

  if (!connectionString) {
    throw new Error("Invalid stored credentials");
  }

  // Use pg library for PostgreSQL connections
  const { Client } = require("pg");

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Allow self-signed certs
    },
  });

  try {
    await client.connect();

    switch (action) {
      // =========================================================================
      // LIST TABLES - Get all tables in the database
      // =========================================================================
      case "listTables": {
        context.log("Listing PostgreSQL tables", { userId });

        const result = await client.query(`
          SELECT table_name, table_schema
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `);

        const tables = result.rows.map((row) => ({
          name: row.table_name,
          schema: row.table_schema,
        }));

        context.log("PostgreSQL tables listed successfully", {
          count: tables.length,
        });

        return {
          success: true,
          tables,
        };
      }

      // =========================================================================
      // QUERY - Fetch data from a table
      // =========================================================================
      case "query": {
        const { tableName, limit = 100 } = params;

        if (!tableName) {
          throw new Error("tableName is required for query action");
        }

        context.log("Querying PostgreSQL table", { userId, tableName, limit });

        // Sanitize table name to prevent SQL injection
        const sanitizedTable = tableName.replace(/[^a-zA-Z0-9_]/g, "");

        const result = await client.query(
          `SELECT * FROM "${sanitizedTable}" LIMIT $1`,
          [Math.min(limit, 1000)]
        );

        const rows = result.rows || [];

        // Extract column info
        const columns = result.fields
          ? result.fields.map((field) => ({
              name: field.name,
              dataTypeID: field.dataTypeID,
            }))
          : [];

        return {
          success: true,
          tableName,
          columns,
          rows,
          rowCount: rows.length,
        };
      }

      default:
        throw new Error(`Unknown action: ${action}. Use: listTables | query`);
    }
  } catch (error) {
    context.error("PostgreSQL operation failed:", error);

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to PostgreSQL server. Please check your connection string."
      );
    }

    if (error.code === "28P01" || error.code === "28000") {
      throw new Error(
        "Authentication failed. Please check your credentials."
      );
    }

    throw new Error(error.message || "PostgreSQL operation failed");
  } finally {
    await client.end();
  }
};
