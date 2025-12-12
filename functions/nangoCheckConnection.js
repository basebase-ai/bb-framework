/**
 * Nango: Check Connection Status
 *
 * Checks if a user has an active OAuth connection for a specific integration.
 * Uses end_user.id (Firebase UID) to look up connections since Nango now
 * generates connection IDs automatically.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.integrationId - Nango integration ID (e.g., "google-mail", "hubspot")
 * @param {string} [params.endUserId] - End user ID (defaults to authenticated user's UID)
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, connection: Object|null}>}
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

  context.log("Checking Nango connection", {
    integrationId,
    endUserId: userId,
  });

  try {
    // List connections filtered by endUserId and integrationId
    // API: GET /connections?endUserId=<id>&integrationId=<id>
    const response = await context.http.get(
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

    const connections = response.data?.connections || [];

    if (connections.length === 0) {
      context.log("No connection found", { integrationId, endUserId: userId });
      return {
        success: false,
        connection: null,
      };
    }

    // Return the first (most recent) connection
    const conn = connections[0];

    context.log("Connection found", {
      integrationId,
      connectionId: conn.connection_id,
      endUserId: userId,
    });

    // Build connection object, omitting undefined values (Firestore doesn't like undefined)
    const connection = {
      integrationId:
        conn.provider_config_key || conn.integration_id || integrationId,
      connectionId: conn.connection_id,
      endUserId: conn.end_user?.id || userId,
    };

    // Only add createdAt if it exists
    if (conn.created_at || conn.created) {
      connection.createdAt = conn.created_at || conn.created;
    }

    return {
      success: true,
      connection,
    };
  } catch (error) {
    // Handle 404 or empty response - not an error, just no connection
    if (
      error.response?.status === 404 ||
      error.message?.includes("not found")
    ) {
      context.log("No connection found", { integrationId, endUserId: userId });
      return {
        success: false,
        connection: null,
      };
    }

    // Actual error
    context.error("Error checking connection:", error);
    throw error;
  }
};
