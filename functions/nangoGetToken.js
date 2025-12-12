/**
 * Nango: Get OAuth Token
 *
 * Retrieves a valid OAuth access token for a user's connection.
 * Nango automatically handles token refresh - you always get a valid token.
 *
 * Looks up connections by end_user.id (Firebase UID) since Nango generates
 * connection IDs automatically.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.integrationId - Nango integration ID (e.g., "google-mail", "hubspot")
 * @param {string} [params.endUserId] - End user ID (defaults to authenticated user's UID)
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, accessToken: string, connectionId: string, integrationId: string}>}
 *
 * @example
 * // In another backend function:
 * const tokenResult = await context.callFunction("nangoGetToken", {
 *   integrationId: "hubspot"
 * });
 * const token = tokenResult.accessToken;
 */
module.exports = async function (params, context) {
  const { integrationId, endUserId } = params;
  // Support both context.auth.uid (Firebase) and context.userId (task-based execution)
  const userId = endUserId || context.auth?.uid || context.userId;

  if (!integrationId) {
    throw new Error("integrationId is required");
  }
  if (!userId) {
    throw new Error("User must be authenticated");
  }

  // Get Nango secret key
  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error(
      "NANGO_SECRET_KEY not configured. Add it to your environment secrets."
    );
  }

  context.log("Getting Nango token", { integrationId, endUserId: userId });

  try {
    // First, find the connection by endUserId
    // API: GET /connections?endUserId=<id>&integrationId=<id>
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
      throw new Error(
        `No ${integrationId} connection found for user. Please connect first.`
      );
    }

    const connectionId = connections[0].connection_id;

    // Now get the connection details with credentials
    // API: GET /connections/{connectionId}?provider_config_key=<id>
    // Nango automatically refreshes expired tokens
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

    const connection = connResponse.data;

    if (!connection.credentials?.access_token) {
      throw new Error(`No access token found for ${integrationId} connection`);
    }

    context.log("Token retrieved successfully", {
      integrationId,
      connectionId,
      endUserId: userId,
    });

    return {
      success: true,
      accessToken: connection.credentials.access_token,
      connectionId: connectionId,
      integrationId: connection.provider_config_key,
    };
  } catch (error) {
    context.error("Failed to get Nango token:", error);

    if (
      error.response?.status === 404 ||
      error.message?.includes("not found") ||
      error.message?.includes("No ")
    ) {
      throw new Error(
        `No ${integrationId} connection found for user. Please connect first.`
      );
    }

    throw error;
  }
};
