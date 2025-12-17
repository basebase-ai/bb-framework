/**
 * Nango: Create Connect Session
 *
 * Creates a short-lived Connect session token for the frontend to initiate OAuth.
 * This replaces the deprecated public key approach.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.integrationId - Nango integration ID (e.g., "google-mail", "hubspot")
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, sessionToken: string, expiresAt: string}>}
 *
 * @see https://docs.nango.dev/reference/api/connect/sessions/create
 */
module.exports = async function (params, context) {
  const { integrationId } = params;
  // Support both context.auth.uid (Firebase) and context.userId (task-based execution)
  const userId = context.auth?.uid || context.userId;

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

  context.log("Creating Nango Connect session", { integrationId, userId });

  try {
    // Create Connect session via Nango API
    // We pass userId as end_user.id so we can look up connections by user later
    const response = await context.http.post(
      "https://api.nango.dev/connect/sessions",
      {
        end_user: {
          id: userId,
          email: context.auth?.email || undefined,
          display_name: context.auth?.displayName || undefined,
        },
        // Optional: specify which integration to connect
        // If omitted, user can choose from all enabled integrations
        allowed_integrations: integrationId ? [integrationId] : undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    // Response structure: { data: { token, connect_link, expires_at } }
    const sessionData = response.data?.data || response.data;

    context.log("Connect session created successfully", {
      userId,
      integrationId,
      expiresAt: sessionData.expires_at,
    });

    return {
      success: true,
      sessionToken: sessionData.token,
      connectLink: sessionData.connect_link,
      expiresAt: sessionData.expires_at,
    };
  } catch (error) {
    context.error("Failed to create Connect session:", error);
    context.error("Nango error details:", {
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      throw new Error("Invalid Nango secret key");
    }

    if (error.response?.status === 400) {
      const errorData = error.response?.data;
      throw new Error(
        `Failed to create Nango session: ${
          errorData?.error?.message ||
          errorData?.message ||
          JSON.stringify(errorData) ||
          error.message
        }`
      );
    }

    throw new Error(
      `Failed to create Nango session: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};
