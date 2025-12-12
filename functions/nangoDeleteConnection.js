/**
 * Nango: Delete Connection
 *
 * Disconnects a user's OAuth connection and revokes access.
 * Requires the Nango-generated connectionId (not the user ID).
 *
 * @param {Object} params - Function parameters
 * @param {string} params.integrationId - Nango integration ID (e.g., "google-mail", "hubspot")
 * @param {string} params.connectionId - Nango's connection ID (returned from nangoCheckConnection)
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, message: string}>}
 */
module.exports = async function (params, context) {
  const { integrationId, connectionId } = params;
  // Support both context.auth.uid (Firebase) and context.userId (task-based execution)
  const userId = context.auth?.uid || context.userId;

  if (!integrationId) {
    throw new Error("integrationId is required");
  }
  if (!connectionId) {
    throw new Error("connectionId is required");
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

  context.log("Deleting Nango connection", { integrationId, connectionId });

  try {
    // Delete the connection via Nango API
    // API: DELETE /connections/{connectionId}?provider_config_key=<id>
    await context.http.delete(
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

    context.log("Connection deleted successfully", {
      integrationId,
      connectionId,
    });

    return {
      success: true,
      message: `${integrationId} disconnected successfully`,
    };
  } catch (error) {
    // If connection doesn't exist, that's fine - it's already "disconnected"
    if (
      error.response?.status === 404 ||
      error.message?.includes("not found")
    ) {
      context.log("Connection already deleted or never existed", {
        integrationId,
        connectionId,
      });

      return {
        success: true,
        message: `${integrationId} was not connected`,
      };
    }

    context.error("Failed to delete connection:", error);
    throw error;
  }
};
