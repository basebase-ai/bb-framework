/**
 * useLLMAgent Hook
 * Manages conversation with LLM including tool calling
 */

import { useState, useCallback, useRef } from "react";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useBuilderStore } from "../stores/builderStore.js";
import {
  executeTool,
  toolDefinitions,
  getSystemPrompt,
} from "../utils/tools.js";

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'assistant' | 'system' | 'tool'} role
 * @property {string} content
 * @property {number} timestamp
 * @property {Object} [toolCalls]
 */

/**
 * Hook for managing LLM agent conversation with tool calling
 * @returns {Object} Agent utilities
 */
export function useLLMAgent() {
  const { call: callLLM, loading: llmLoading } = useFunction("askLLM");
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef(false);

  const {
    currentAppId,
    files,
    messages,
    addMessage,
    updateFiles,
    setLintErrors,
    setAgentThinking,
  } = useBuilderStore();

  /**
   * Build the message history for the LLM
   * Reads directly from store to get fresh messages (not stale closure)
   * @returns {Array<{role: string, content: string}>}
   */
  const buildMessageHistory = useCallback(() => {
    const history = [];

    // Get fresh messages from store (not from closure which may be stale)
    const currentMessages = useBuilderStore.getState().messages;
    const appId = useBuilderStore.getState().currentAppId;

    // Add system prompt
    if (appId) {
      history.push({
        role: "system",
        content: getSystemPrompt(appId),
      });
    }

    // Add conversation history
    for (const msg of currentMessages) {
      if (msg.role === "user") {
        history.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        history.push({ role: "assistant", content: msg.content });
      } else if (msg.role === "tool") {
        // Tool results are included as user context (so LLM sees them as input)
        history.push({
          role: "user",
          content: `[Tool Result: ${msg.toolCall?.name}]\n${msg.content}`,
        });
      }
    }

    return history;
  }, []);

  /**
   * Parse tool calls from assistant response
   * The assistant should format tool calls as JSON blocks
   * @param {string} content
   * @returns {{ text: string, toolCalls: Array<{name: string, arguments: Object}> }}
   */
  const parseToolCalls = useCallback((content) => {
    const toolCalls = [];
    let text = content;

    // Look for tool call blocks in the format:
    // ```tool
    // {"name": "toolName", "arguments": {...}}
    // ```
    const toolBlockRegex = /```tool\s*\n([\s\S]*?)\n```/g;
    let match;

    while ((match = toolBlockRegex.exec(content)) !== null) {
      try {
        const toolCall = JSON.parse(match[1].trim());
        if (toolCall.name && toolCall.arguments !== undefined) {
          toolCalls.push(toolCall);
        }
      } catch (e) {
        console.warn("Failed to parse tool call:", match[1], e);
      }
    }

    // Remove tool blocks from text
    text = content.replace(toolBlockRegex, "").trim();

    return { text, toolCalls };
  }, []);

  /**
   * Send a message to the agent and handle the response
   * Implements agentic loop: continues until no tool calls in response
   * @param {string} userMessage
   */
  const sendMessage = useCallback(
    async (userMessage) => {
      if (!currentAppId) {
        addMessage({
          role: "assistant",
          content:
            "Please select or create an app first using the Init App or Checkout App buttons.",
        });
        return;
      }

      if (isProcessing) return;

      setIsProcessing(true);
      setAgentThinking(true);
      abortRef.current = false;

      // Add user message
      addMessage({
        role: "user",
        content: userMessage,
      });

      /** @type {Array<{role: string, content: string}>} */
      let conversationHistory = [];

      // Tool instructions (included in every call)
      const toolInstructions = `
You have access to these tools to modify the app. To use a tool, include a JSON block like this:

\`\`\`tool
{"name": "toolName", "arguments": {"arg1": "value1"}}
\`\`\`

Available tools:
${toolDefinitions
  .map((t) => `- ${t.function.name}: ${t.function.description}`)
  .join("\n")}

IMPORTANT RULES:
1. ALWAYS write a brief message to the user explaining what you're about to do BEFORE each tool call
2. After receiving tool results, continue working until the task is complete
3. Always read the files first if you haven't seen them yet
4. When you're done and ready to respond to the user, write your response without any tool blocks

Example of good response format:
"Let me read the current files to understand the app structure.

\`\`\`tool
{"name": "readFiles", "arguments": {}}
\`\`\`"

Never output just a tool call without explaining what you're doing first.`;

      // Maximum iterations to prevent infinite loops
      const MAX_ITERATIONS = 10;
      let iteration = 0;

      try {
        // Agentic loop: continue until no tool calls or max iterations
        while (iteration < MAX_ITERATIONS && !abortRef.current) {
          iteration++;
          console.log(`🔄 Agent iteration ${iteration}`);

          // Build fresh history from store (includes new tool results)
          conversationHistory = buildMessageHistory();

          // On first iteration, add the user message
          if (iteration === 1) {
            conversationHistory.push({ role: "user", content: userMessage });
          }

          // Build prompt
          const fullPrompt = `${conversationHistory
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n\n")}\n\n${toolInstructions}`;

          // Call LLM
          const result = await callLLM({
            provider: "openai",
            model: "gpt-5.2",
            message: fullPrompt,
            options: { maxTokens: 4096 },
          });

          if (abortRef.current) break;

          const responseContent =
            result?.response ||
            "I encountered an error processing your request.";

          // Parse for tool calls
          const { text, toolCalls } = parseToolCalls(responseContent);

          // Add assistant message (the text part) if there is any
          if (text) {
            addMessage({
              role: "assistant",
              content: text,
            });
          }

          // If no tool calls, we're done!
          if (toolCalls.length === 0) {
            console.log(`✅ Agent completed after ${iteration} iteration(s)`);
            break;
          }

          // Execute tool calls
          for (const toolCall of toolCalls) {
            if (abortRef.current) break;

            console.log(`🔧 Executing tool: ${toolCall.name}`);

            // Execute the tool (async - syncs draft to Firestore)
            const toolResult = await executeTool(
              toolCall.name,
              toolCall.arguments || {},
              () => ({
                files: useBuilderStore.getState().files,
                currentAppId,
                userId: user?.uid || null,
                userEmail: user?.email || null,
              }),
              (newFiles) => {
                updateFiles(newFiles);
              }
            );

            // Update lint errors
            if (toolResult.errors) {
              setLintErrors(toolResult.errors);
            }

            // Add tool result message (will be included in next iteration's history)
            addMessage({
              role: "tool",
              content: toolResult.output,
              toolCall: { name: toolCall.name, success: toolResult.success },
            });
          }

          // Continue loop - tool results will be in the next iteration's history
        }

        if (iteration >= MAX_ITERATIONS) {
          console.warn("⚠️ Agent reached max iterations");
          addMessage({
            role: "assistant",
            content:
              "I've reached the maximum number of steps. Let me know if you'd like me to continue.",
          });
        }
      } catch (error) {
        console.error("Agent error:", error);
        addMessage({
          role: "assistant",
          content: `I encountered an error: ${error.message}. Please try again.`,
        });
      } finally {
        setIsProcessing(false);
        setAgentThinking(false);
      }
    },
    [
      currentAppId,
      isProcessing,
      addMessage,
      buildMessageHistory,
      callLLM,
      parseToolCalls,
      updateFiles,
      setLintErrors,
      setAgentThinking,
      user,
    ]
  );

  /**
   * Abort current processing
   */
  const abort = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
    setAgentThinking(false);
  }, [setAgentThinking]);

  return {
    sendMessage,
    abort,
    isProcessing: isProcessing || llmLoading,
  };
}
