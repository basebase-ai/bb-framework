/**
 * Framework function: Ask an LLM for a response
 * @param {Object} params - Function parameters
 * @param {string} params.provider - LLM provider ('openai', 'anthropic', etc.)
 * @param {string} params.model - Model name (e.g., 'gpt-4', 'claude-3')
 * @param {string} [params.message] - User message/prompt (legacy)
 * @param {{role: 'system'|'user'|'assistant'|'tool', content: string, tool_call_id?: string}[]} [params.messages] - Structured chat messages
 * @param {Array<{type:'function', function:{name:string, description?:string, parameters?:any}}>} [params.tools] - Tool definitions (OpenAI tool calling)
 * @param {'auto'|'none'|{type:'function', function:{name:string}}} [params.toolChoice] - Tool choice behavior
 * @param {Object} [params.options] - Additional options
 * @param {Object} context - Function context
 * @returns {Promise<Object>} LLM response
 */
module.exports = async function (params, context) {
  const {
    provider,
    model,
    message,
    messages,
    tools,
    toolChoice,
    options = {},
  } = params;

  // Validate required parameters
  if (!provider) {
    throw new Error("Provider parameter is required");
  }
  if (!model) {
    throw new Error("Model parameter is required");
  }
  if (
    (!messages || !Array.isArray(messages) || messages.length === 0) &&
    !message
  ) {
    throw new Error("Either messages[] or message is required");
  }

  /** @type {{role: 'system'|'user'|'assistant'|'tool', content: string, tool_call_id?: string}[]} */
  const finalMessages =
    messages && Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: "user", content: message }];

  context.log("Asking LLM", {
    provider,
    model,
    messagePreview:
      finalMessages?.[finalMessages.length - 1]?.content?.substring(0, 100) +
      "...",
    messageCount: finalMessages.length,
    hasTools: Array.isArray(tools) && tools.length > 0,
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
        messages: finalMessages,
        max_completion_tokens: options.maxTokens || 1000, // Changed from max_tokens for newer models
        // Note: GPT-5 models don't support custom temperature (only default 1)
        // Older models like gpt-4o still support it
        ...(options.temperature !== undefined &&
          options.temperature !== 1 &&
          !model.startsWith("gpt-5") && {
            temperature: options.temperature,
          }),
        ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
        ...(toolChoice ? { tool_choice: toolChoice } : {}),
      };
      break;

    case "anthropic":
      endpoint = "https://api.anthropic.com/v1/messages";
      requestPayload = {
        model,
        max_tokens: options.maxTokens || 1000,
        // Anthropic format differs; we accept structured messages but only pass user/assistant content.
        messages: (finalMessages || [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
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
      const choice = response.data.choices[0];
      const message = choice.message;
      /** @type {{id:string, name:string, arguments:Record<string, any>}[]} */
      const toolCalls = [];

      if (Array.isArray(message?.tool_calls)) {
        for (const tc of message.tool_calls) {
          if (tc?.type !== "function") continue;
          const name = tc.function?.name;
          const argsStr = tc.function?.arguments;
          if (!name) continue;
          let args = {};
          try {
            args = argsStr ? JSON.parse(argsStr) : {};
          } catch (e) {
            // If parsing fails, return raw string so the client can surface it
            args = { __raw: argsStr || "" };
          }
          toolCalls.push({ id: tc.id, name, arguments: args });
        }
      }

      // Log for debugging GPT-5 response structure
      context.log("OpenAI Response Structure:", {
        model: response.data.model,
        choiceFinishReason: choice.finish_reason,
        messageKeys: message ? Object.keys(message) : [],
        hasContent: !!message.content,
        contentLength: message.content?.length || 0,
        hasRefusal: !!message.refusal,
        toolCallCount: toolCalls.length,
      });

      parsedResponse = {
        response: message.content || "",
        toolCalls,
        usage: response.data.usage,
        finishReason: choice.finish_reason,
      };
    } else if (provider.toLowerCase() === "anthropic") {
      parsedResponse = {
        response: response.data.content[0].text,
        toolCalls: [],
        usage: response.data.usage,
        finishReason: response.data.stop_reason,
      };
    }

    const result = {
      success: true,
      provider,
      model,
      response: parsedResponse.response,
      toolCalls: parsedResponse.toolCalls || [],
      finishReason: parsedResponse.finishReason,
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

      // Log the full error response for debugging
      context.error("OpenAI Error Response:", {
        status,
        errorData: JSON.stringify(errorData),
        errorMessage: errorData?.error?.message,
        errorType: errorData?.error?.type,
        errorCode: errorData?.error?.code,
      });

      if (status === 401) {
        throw new Error(`Invalid API key for ${provider}`);
      } else if (status === 429) {
        throw new Error(
          `Rate limit exceeded for ${provider}. Please try again later.`
        );
      } else if (status === 400) {
        throw new Error(
          `Bad request to ${provider}: ${
            errorData?.error?.message ||
            JSON.stringify(errorData) ||
            "Invalid parameters"
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
