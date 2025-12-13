/**
 * Fetch Slack Messages
 *
 * Retrieves recent messages from a Slack channel using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.channelId - Slack channel ID
 * @param {number} [params.limit=50] - Maximum number of messages to fetch
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, messages: Array}>}
 */
module.exports = async function (params, context) {
  const { channelId, limit = 50 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!channelId) {
    throw new Error("channelId is required");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "slack";

  context.log("Fetching Slack messages", { userId, channelId, limit });

  try {
    // Step 1: Find the user's Slack connection
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
      throw new Error("Slack not connected. Please connect first.");
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
      throw new Error("No access token found for Slack");
    }

    // Step 3: Fetch messages from Slack API (conversations.history)
    const slackResponse = await context.http.get(
      "https://slack.com/api/conversations.history",
      {
        params: {
          channel: channelId,
          limit: Math.min(limit, 100),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (!slackResponse.data?.ok) {
      throw new Error(slackResponse.data?.error || "Slack API error");
    }

    // Get user info for messages (optional, for displaying names)
    const messages = (slackResponse.data?.messages || [])
      .filter((msg) => msg.type === "message" && !msg.subtype) // Filter out system messages
      .map((msg) => ({
        ts: msg.ts,
        text: msg.text || "",
        userId: msg.user || null,
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      }));

    context.log("Slack messages fetched successfully", {
      count: messages.length,
    });

    return {
      success: true,
      messages,
      channelId,
    };
  } catch (error) {
    context.error("Failed to fetch Slack messages:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Slack authentication failed. Please reconnect your account."
      );
    }

    throw new Error(
      error.response?.data?.error || error.message || "Failed to fetch messages"
    );
  }
};
