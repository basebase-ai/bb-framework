/**
 * Summarize Slack Channel
 *
 * Fetches recent messages from a Slack channel and uses an LLM to summarize them.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.channelId - Slack channel ID
 * @param {string} params.channelName - Channel name for context
 * @param {number} [params.messageLimit=50] - Number of messages to include
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, summary: string}>}
 */
module.exports = async function (params, context) {
  const { channelId, channelName, messageLimit = 50 } = params;
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

  const openaiKey = await context.getSecret("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const integrationId = "slack";

  context.log("Summarizing Slack channel", { userId, channelId, channelName });

  try {
    // Step 1: Get Slack access token via Nango
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

    // Step 2: Fetch messages from Slack
    const slackResponse = await context.http.get(
      "https://slack.com/api/conversations.history",
      {
        params: {
          channel: channelId,
          limit: Math.min(messageLimit, 100),
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

    const messages = (slackResponse.data?.messages || [])
      .filter((msg) => msg.type === "message" && !msg.subtype && msg.text)
      .slice(0, messageLimit)
      .reverse(); // Chronological order

    if (messages.length === 0) {
      return {
        success: true,
        summary: "No messages found in this channel to summarize.",
        messageCount: 0,
      };
    }

    // Step 3: Format messages for the LLM
    const formattedMessages = messages
      .map((msg) => {
        const time = new Date(parseFloat(msg.ts) * 1000).toLocaleString();
        return `[${time}] ${msg.text}`;
      })
      .join("\n");

    // Step 4: Call OpenAI to summarize
    const prompt = `You are a helpful assistant that summarizes Slack channel conversations.

Below are the ${messages.length} most recent messages from the Slack channel "${
      channelName || channelId
    }".

Please provide a concise summary that includes:
1. Main topics discussed
2. Key decisions or action items (if any)
3. Important questions raised (if any)
4. Overall sentiment/tone of the conversation

Messages:
${formattedMessages}

Summary:`;

    const openaiResponse = await context.http.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const summary =
      openaiResponse.data?.choices?.[0]?.message?.content ||
      "Failed to generate summary";

    context.log("Slack channel summarized successfully", {
      channelId,
      messageCount: messages.length,
      summaryLength: summary.length,
    });

    return {
      success: true,
      summary,
      messageCount: messages.length,
      channelId,
      channelName,
    };
  } catch (error) {
    context.error("Failed to summarize Slack channel:", error);

    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please check your connections.");
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to summarize channel"
    );
  }
};
