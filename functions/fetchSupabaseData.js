/**
 * Fetch data from a Supabase table
 *
 * @param {Object} params - Function parameters
 * @param {string} params.tableName - Name of the table to fetch from
 * @param {number} [params.limit=100] - Maximum number of records to fetch
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Table data with columns and rows
 */
module.exports = async function (params, context) {
  const { tableName, limit = 100 } = params;

  if (!tableName) {
    throw new Error("tableName is required");
  }

  const userId = context.auth?.uid || context.userId;
  if (!userId) {
    throw new Error("User must be authenticated");
  }

  try {
    // Get stored credentials
    const db = context.firestore();
    const credentialsDoc = await db
      .collection("supabase-credentials")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      throw new Error(
        "Supabase credentials not found. Please save your credentials first."
      );
    }

    const { projectUrl, apiKey } = credentialsDoc.data();

    if (!projectUrl || !apiKey) {
      throw new Error("Invalid stored credentials");
    }

    // Fetch data from Supabase REST API
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
};
