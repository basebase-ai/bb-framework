/**
 * List Airtable Bases
 *
 * Lists all bases the user has access to in Airtable using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, bases: Array}>}
 */
module.exports = async function (params, context) {
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "airtable";

  context.log("Listing Airtable bases", { userId });

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

    // Step 3: List bases via Airtable API
    const airtableResponse = await context.http.get(
      "https://api.airtable.com/v0/meta/bases",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const bases = (airtableResponse.data?.bases || []).map((base) => ({
      id: base.id,
      name: base.name,
      permissionLevel: base.permissionLevel,
    }));

    context.log("Airtable bases listed successfully", {
      count: bases.length,
    });

    return {
      success: true,
      bases,
    };
  } catch (error) {
    context.error("Failed to list Airtable bases:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Airtable authentication failed. Please reconnect your account."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure you have the required permissions."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to list bases"
    );
  }
};
