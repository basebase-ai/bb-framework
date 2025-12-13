/**
 * List Supabase Tables
 *
 * Lists all tables in the user's Supabase database using stored credentials.
 *
 * @param {Object} params - Function parameters
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, tables: Array}>}
 */
module.exports = async function (params, context) {
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  context.log("Listing Supabase tables", { userId });

  try {
    // Get stored credentials
    const db = context.firestore();
    const credentialsDoc = await db
      .collection("supabase-credentials")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      throw new Error(
        "Supabase not connected. Please add your credentials first."
      );
    }

    const { projectUrl, apiKey } = credentialsDoc.data();

    // Query Supabase to get table list using the introspection endpoint
    // We use the REST API to query pg_catalog
    const response = await context.http.get(`${projectUrl}/rest/v1/`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
    });

    // The root endpoint returns OpenAPI spec with all tables
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
      error.response?.data?.message || error.message || "Failed to list tables"
    );
  }
};
