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
 * @property {{ name: string, success: boolean, id?: string }} [toolCall]
 * @property {{ id: string, name: string, arguments: Record<string, any> }[]} [toolCalls] - tool calls produced by assistant
 */

/**
 * @typedef {{ role: 'system'|'user'|'assistant'|'tool', content: string, tool_call_id?: string }} LLMMessage
 */

/**
 * @typedef {{ id: string, name: string, arguments: Record<string, any> }} LLMToolCall
 */

/**
 * Convert parsed tool call args to a JSON string for OpenAI tool_calls.
 * @param {Record<string, any>} args
 * @returns {string}
 */
function toolArgsToJson(args) {
  if (!args || typeof args !== "object") return "{}";
  if (typeof args.__raw === "string" && args.__raw.trim()) return args.__raw;
  try {
    return JSON.stringify(args);
  } catch {
    return "{}";
  }
}

/**
 * Human-friendly message for a tool call when the model returns no text.
 * @param {string} toolName
 * @returns {string}
 */
function getToolCallAnnouncement(toolName) {
  switch (toolName) {
    case "readFiles":
      return "Let me read the current files so I understand what we're working with.";
    case "createFile":
      return "I’m going to create/update a file to implement this.";
    case "replaceLines":
      return "I’m going to edit the relevant file(s) to implement this change.";
    case "deleteFile":
      return "I’m going to remove the unnecessary file.";
    default:
      return "I’m going to make a code change now.";
  }
}

/**
 * Tiny status indicator for showing tool calls in chat.
 * @param {string} toolName
 * @returns {string}
 */
function getToolCallIndicator(toolName) {
  switch (toolName) {
    case "readFiles":
      return "Reading files…";
    case "searchCurrentApp":
      return "Searching current app…";
    case "searchExampleApps":
      return "Searching examples…";
    case "readExampleApp":
      return "Reading example…";
    case "createFile":
      return "Creating file…";
    case "replaceLines":
      return "Replacing lines…";
    case "deleteFile":
      return "Deleting file…";
    default:
      return "Running tool…";
  }
}

/**
 * Truncate a long tool output so it doesn't blow token budgets.
 * Keeps the head + tail with a clear marker.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
function truncateToolOutput(text, maxChars) {
  if (typeof text !== "string") return "";
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.6));
  const tail = text.slice(text.length - Math.floor(maxChars * 0.3));
  return `${head}\n\n[...TRUNCATED ${
    text.length - head.length - tail.length
  } chars...]\n\n${tail}`;
}

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
    addMessage,
    updateFiles,
    setLintErrors,
    setAgentThinking,
  } = useBuilderStore();

  /**
   * Build structured messages for the LLM (system/user/assistant/tool).
   * Reads directly from the store to avoid stale closure.
   * @returns {LLMMessage[]}
   */
  const buildMessageHistory = useCallback(() => {
    /** @type {LLMMessage[]} */
    const history = [];

    // Get fresh messages from store (not from closure which may be stale)
    /** @type {Message[]} */
    const currentMessages = useBuilderStore.getState().messages;
    /** @type {string | null} */
    const appId = useBuilderStore.getState().currentAppId;

    // Add system prompt
    if (appId) {
      history.push({
        role: "system",
        content:
          getSystemPrompt(appId) +
          `\n\n## Tool Calling\nWhen you need to modify files, call the provided tools (do NOT paste tool JSON blocks).\nIf you call a tool, also include a brief explanation for the user in your message content.\nAfter tool results are provided, continue until the task is complete.`,
      });
    }

    // Add conversation history
    for (const msg of currentMessages) {
      if (msg.role === "user") {
        history.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        // If this assistant message included tool calls, we must include them
        // so that subsequent role:"tool" messages are valid.
        if (Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) {
          history.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: msg.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.name,
                arguments: toolArgsToJson(tc.arguments),
              },
            })),
          });
        } else {
          history.push({ role: "assistant", content: msg.content });
        }
      } else if (msg.role === "tool") {
        // Preferred: OpenAI tool message with tool_call_id
        if (msg.toolCall?.id) {
          history.push({
            role: "tool",
            tool_call_id: msg.toolCall.id,
            content: truncateToolOutput(msg.content, 12000),
          });
        } else {
          // Back-compat for older stored tool messages
          history.push({
            role: "user",
            content: `[Tool Result: ${
              msg.toolCall?.name || "tool"
            }]\n${truncateToolOutput(msg.content, 12000)}`,
          });
        }
      }
    }

    return history;
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

      // Maximum iterations to prevent infinite loops
      const MAX_ITERATIONS = 10;
      let iteration = 0;

      try {
        // Agentic loop: continue until no tool calls or max iterations
        while (iteration < MAX_ITERATIONS && !abortRef.current) {
          iteration++;
          console.log(`🔄 Agent iteration ${iteration}`);

          // Build fresh structured history from store (includes new tool results)
          const conversationHistory = buildMessageHistory();

          /**
           * @param {number} maxTokens
           * @returns {Promise<{response?: string, toolCalls?: LLMToolCall[], finishReason?: string}>}
           */
          const callOnce = async (maxTokens) => {
            return await callLLM({
              provider: "openai",
              model: "gpt-5.2",
              messages: conversationHistory,
              tools: toolDefinitions,
              toolChoice: "auto",
              options: { maxTokens },
            });
          };

          // First attempt: moderate budget; retry once if we get empty output with length stop.
          let result = await callOnce(2048);
          const firstResponse = (result?.response || "").trim();
          const firstToolCalls = Array.isArray(result?.toolCalls)
            ? result.toolCalls
            : [];
          if (
            !abortRef.current &&
            firstToolCalls.length === 0 &&
            !firstResponse &&
            result?.finishReason === "length"
          ) {
            console.warn(
              "⚠️ Empty response with finishReason=length; retrying with higher maxTokens"
            );
            result = await callOnce(4096);
          }

          if (abortRef.current) break;

          const responseContent = result?.response || "";
          const toolCalls = Array.isArray(result?.toolCalls)
            ? result.toolCalls
            : [];

          const trimmedResponse = (responseContent || "").trim();

          // If the model returned tool calls but no user-facing text (common),
          // add a small synthesized message so the UI doesn't look "stuck".
          const shouldAnnounceToolCalls =
            toolCalls.length > 0 && trimmedResponse.length === 0;

          // Persist assistant message. If toolCalls exist, store them so we can build
          // the required assistant tool_calls message in the next iteration.
          if (trimmedResponse.length > 0 || toolCalls.length > 0) {
            addMessage({
              role: "assistant",
              content:
                trimmedResponse.length > 0
                  ? trimmedResponse
                  : shouldAnnounceToolCalls
                  ? getToolCallAnnouncement(toolCalls[0].name)
                  : "",
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            });
          }

          // If no tool calls, we're done
          if (toolCalls.length === 0) {
            // If we also got no text, surface an explicit failure instead of silently completing.
            if (!trimmedResponse) {
              addMessage({
                role: "assistant",
                content:
                  "I didn’t get a usable response back from the model. Please try again (or shorten the request).",
              });
            }
            console.log(`✅ Agent completed after ${iteration} iteration(s)`);
            break;
          }

          // Execute tool calls
          for (const toolCall of toolCalls) {
            if (abortRef.current) break;

            console.log(`🔧 Executing tool: ${toolCall.name}`);

            // Show tool call in the user-visible chat (but keep tool results hidden)
            addMessage({
              role: "tool_request",
              content: getToolCallIndicator(toolCall.name),
              toolCall: { id: toolCall.id, name: toolCall.name, success: true },
            });

            // Execute the tool (async - syncs draft to Firestore)
            const toolResult = await executeTool(
              toolCall.name,
              toolCall.arguments || {},
              () => ({
                files: useBuilderStore.getState().files,
                currentAppId,
                userId: user?.uid || null,
                userEmail: user?.email || null,
                exampleApps: useBuilderStore.getState().exampleApps,
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
              toolCall: {
                id: toolCall.id,
                name: toolCall.name,
                success: toolResult.success,
              },
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
