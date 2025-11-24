/**
 * Framework function: Ask an LLM for a response
 * @param {Object} params - Function parameters
 * @param {string} params.provider - LLM provider ('openai', 'anthropic', etc.)
 * @param {string} params.model - Model name (e.g., 'gpt-4', 'claude-3')
 * @param {string} params.message - User message/prompt
 * @param {Object} [params.options] - Additional options
 * @param {Object} context - Function context
 * @returns {Promise<Object>} LLM response
 */
module.exports = async function (params, context) {
  const { provider, model, message, options = {} } = params;

  // Validate required parameters
  if (!provider) {
    throw new Error("Provider parameter is required");
  }
  if (!model) {
    throw new Error("Model parameter is required");
  }
  if (!message) {
    throw new Error("Message parameter is required");
  }

  context.log("Asking LLM", {
    provider,
    model,
    message: message.substring(0, 100) + "...",
  });

  // Get API key from secrets
  const secretKey = provider.toUpperCase() + "_API_KEY";
  const apiKey = await context.getSecret(secretKey);
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${provider}`);
  }

  // Prepare request payload based on provider
  let requestPayload;
  let endpoint;

  switch (provider.toLowerCase()) {
    case "openai":
      endpoint = "https://api.openai.com/v1/chat/completions";
      requestPayload = {
        model,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      };
      break;

    case "anthropic":
      endpoint = "https://api.anthropic.com/v1/messages";
      requestPayload = {
        model,
        max_tokens: options.maxTokens || 1000,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      };
      break;

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  try {
    context.log("Making LLM API call", { provider, model, endpoint });

    // Make real HTTP request
    const response = await context.http.post(endpoint, requestPayload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider.toLowerCase() === "anthropic" && {
          "anthropic-version": "2023-06-01",
        }),
      },
      timeout: 30000, // 30 second timeout
    });

    // Debug logging
    context.log("HTTP Response received", {
      status: response?.status,
      hasData: !!response?.data,
      dataKeys: response?.data ? Object.keys(response.data) : "no data",
    });

    // Parse response based on provider
    let parsedResponse;
    if (provider.toLowerCase() === "openai") {
      parsedResponse = {
        response: response.data.choices[0].message.content,
        usage: response.data.usage,
      };
    } else if (provider.toLowerCase() === "anthropic") {
      parsedResponse = {
        response: response.data.content[0].text,
        usage: response.data.usage,
      };
    }

    const result = {
      success: true,
      provider,
      model,
      response: parsedResponse.response,
      usage: parsedResponse.usage,
      timestamp: new Date().toISOString(),
    };

    context.log("LLM API call completed", {
      provider,
      model,
      responseLength: parsedResponse.response.length,
      tokens: parsedResponse.usage?.total_tokens || "unknown",
    });

    return result;
  } catch (error) {
    context.error("Failed to call LLM API", error);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 401) {
        throw new Error(`Invalid API key for ${provider}`);
      } else if (status === 429) {
        throw new Error(
          `Rate limit exceeded for ${provider}. Please try again later.`
        );
      } else if (status === 400) {
        throw new Error(
          `Bad request to ${provider}: ${
            errorData.error?.message || "Invalid parameters"
          }`
        );
      } else {
        throw new Error(
          `${provider} API error (${status}): ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error(`Request timeout for ${provider} API`);
    } else {
      throw new Error(`Network error calling ${provider}: ${error.message}`);
    }
  }
};
