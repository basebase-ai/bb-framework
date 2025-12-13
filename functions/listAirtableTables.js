/**
 * List Airtable Tables
 *
 * Lists all tables in a specific Airtable base using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.baseId - Airtable base ID
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, tables: Array}>}
 */
module.exports = async function (params, context) {
  const { baseId } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!baseId) {
    throw new Error("baseId is required");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "airtable";

  context.log("Listing Airtable tables", { userId, baseId });

  try {
    // Step 1: Find the user's Airtable connection
    const listResponse = await context.http.get(
      "https://api.nango.dev/connections",
      {
        params: {
          endUserId: userId,
          integrationId: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const connections = listResponse.data?.connections || [];

    if (connections.length === 0) {
      throw new Error("Airtable not connected. Please connect first.");
    }

    const connectionId = connections[0].connection_id;

    // Step 2: Get the access token
    const connResponse = await context.http.get(
      `https://api.nango.dev/connections/${connectionId}`,
      {
        params: {
          provider_config_key: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const accessToken = connResponse.data?.credentials?.access_token;

    if (!accessToken) {
      throw new Error("No access token found for Airtable");
    }

    // Step 3: Get base schema to list tables
    const airtableResponse = await context.http.get(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const tables = (airtableResponse.data?.tables || []).map((table) => ({
      id: table.id,
      name: table.name,
      description: table.description || null,
      primaryFieldId: table.primaryFieldId,
      fields: table.fields?.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
      })),
    }));

    context.log("Airtable tables listed successfully", {
      count: tables.length,
    });

    return {
      success: true,
      tables,
      baseId,
    };
  } catch (error) {
    context.error("Failed to list Airtable tables:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Airtable authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required permissions."
      );
    } else if (error.response?.status === 404) {
      throw new Error("Base not found. Please check the base ID.");
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to list tables"
    );
  }
};
