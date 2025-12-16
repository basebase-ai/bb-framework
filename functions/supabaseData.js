/**
 * Supabase Data Operations
 *
 * Unified function for querying Supabase data.
 * Use the `action` parameter to specify the operation.
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
  const supabaseCredentials = userSecretsDoc.exists
    ? userSecretsDoc.data()?.services?.supabase
    : null;

  if (!supabaseCredentials) {
    throw new Error(
      "Supabase not connected. Please add your credentials first."
    );
  }

  const { projectUrl, apiKey } = supabaseCredentials;

  if (!projectUrl || !apiKey) {
    throw new Error("Invalid stored credentials");
  }

  switch (action) {
    // =========================================================================
    // LIST TABLES - Get all tables in the database
    // =========================================================================
    case "listTables": {
      context.log("Listing Supabase tables", { userId });

      try {
        // The root endpoint returns OpenAPI spec with all tables
        const response = await context.http.get(`${projectUrl}/rest/v1/`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000,
        });

        const paths = response.data?.paths || {};
        const tables = Object.keys(paths)
          .filter((path) => path.startsWith("/") && !path.includes("{"))
          .map((path) => {
            const tableName = path.replace("/", "");
            return {
              name: tableName,
              path: path,
            };
          })
          .filter((t) => t.name && !t.name.startsWith("rpc/"));

        context.log("Supabase tables listed successfully", {
          count: tables.length,
        });

        return {
          success: true,
          tables,
        };
      } catch (error) {
        context.error("Failed to list Supabase tables:", error);

        if (error.response?.status === 401) {
          throw new Error("Invalid API key. Please check your credentials.");
        } else if (error.response?.status === 403) {
          throw new Error("Access denied. Check your API key permissions.");
        }

        throw new Error(
          error.response?.data?.message ||
            error.message ||
            "Failed to list tables"
        );
      }
    }

    // =========================================================================
    // QUERY - Fetch data from a table
    // =========================================================================
    case "query": {
      const { tableName, limit = 100 } = params;

      if (!tableName) {
        throw new Error("tableName is required for query action");
      }

      context.log("Querying Supabase table", { userId, tableName, limit });

      try {
        const response = await context.http.get(
          `${projectUrl}/rest/v1/${encodeURIComponent(tableName)}`,
          {
            params: {
              limit: Math.min(limit, 1000),
              select: "*",
            },
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Prefer: "count=exact",
            },
            timeout: 30000,
          }
        );

        const rows = response.data || [];

        // Extract column names from the first row
        const columns =
          rows.length > 0
            ? Object.keys(rows[0]).map((key) => ({
                name: key,
                type: typeof rows[0][key],
              }))
            : [];

        return {
          success: true,
          tableName,
          columns,
          rows,
          rowCount: rows.length,
        };
      } catch (error) {
        context.error("Error fetching Supabase data:", error);

        if (error.response?.status === 404) {
          throw new Error(`Table "${tableName}" not found`);
        }

        if (error.response?.status === 401) {
          throw new Error("Invalid API key. Please check your credentials.");
        }

        throw new Error(
          `Failed to fetch data from Supabase: ${error.message || "Unknown error"}`
        );
      }
    }

    default:
      throw new Error(`Unknown action: ${action}. Use: listTables | query`);
  }
};

