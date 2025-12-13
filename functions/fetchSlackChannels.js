/**
 * Fetch Slack Channels
 *
 * Retrieves channels the user is a member of from Slack using Nango OAuth.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=100] - Maximum number of channels to fetch
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, channels: Array}>}
 */
module.exports = async function (params, context) {
  const { limit = 100 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  const integrationId = "slack";

  context.log("Fetching Slack channels", { userId, limit });

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

    // Step 3: Fetch channels from Slack API (conversations.list)
    const slackResponse = await context.http.get(
      "https://slack.com/api/conversations.list",
      {
        params: {
          types: "public_channel,private_channel",
          limit: Math.min(limit, 200),
          exclude_archived: true,
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

    const channels = (slackResponse.data?.channels || []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private || false,
      memberCount: channel.num_members || 0,
      topic: channel.topic?.value || null,
      purpose: channel.purpose?.value || null,
    }));

    context.log("Slack channels fetched successfully", {
      count: channels.length,
    });

    return {
      success: true,
      channels,
    };
  } catch (error) {
    context.error("Failed to fetch Slack channels:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Slack authentication failed. Please reconnect your account."
      );
    }

    throw new Error(
      error.response?.data?.error || error.message || "Failed to fetch channels"
    );
  }
};
