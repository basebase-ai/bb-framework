/**
 * ChatPanel - Chat interface for talking to the AI agent
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Stack,
  Group,
  Textarea,
  ActionIcon,
  ScrollArea,
  Text,
  Paper,
  Loader,
  Center,
  Button,
} from "@mantine/core";
import { IconSend, IconTrash, IconPlayerStop } from "@tabler/icons-react";
import { useBuilderStore } from "../stores/builderStore.js";
import { useLLMAgent } from "../hooks/useLLMAgent.js";
import { MessageItem } from "./MessageItem.jsx";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const inputRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));

  const { messages, currentAppId, isAgentThinking, clearMessages } =
    useBuilderStore();
  const { sendMessage, isProcessing, abort } = useLLMAgent();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, isAgentThinking]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentAppId]);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (/** @type {React.KeyboardEvent} */ e) => {
    // Enter sends, Shift+Enter inserts newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentAppId) {
    return (
      <Center h="100%" p="xl">
        <Stack align="center" gap="md">
          <Text size="lg" fw={500} c="dimmed">
            No App Selected
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={300}>
            Use the Init App or Checkout App buttons to get started building.
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack h="100%" gap={0}>
      {/* Header */}
      <Paper p="sm" withBorder style={{ borderTop: 0, borderLeft: 0, borderRight: 0 }}>
        <Group justify="space-between">
          <Text fw={500}>Chat with AI Agent</Text>
          {messages.length > 0 && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={clearMessages}
              title="Clear chat"
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Paper>

      {/* Messages */}
      <ScrollArea
        style={{ flex: 1 }}
        p="sm"
        viewportRef={scrollRef}
      >
        <Stack gap="sm">
          {messages.length === 0 && (
            <Paper p="lg" radius="md" bg="gray.0">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  👋 Hello! I'm your AI assistant.
                </Text>
                <Text size="sm" c="dimmed">
                  I can help you build your Basebase app "{currentAppId}". Try asking me to:
                </Text>
                <Text size="sm" c="dimmed" component="ul" pl="md">
                  <li>Read the current files to see what we have</li>
                  <li>Add a new component or feature</li>
                  <li>Fix a bug or improve the code</li>
                  <li>Explain how something works</li>
                </Text>
              </Stack>
            </Paper>
          )}

          {messages
            .filter(
              (msg) =>
                msg.role === "user" ||
                msg.role === "assistant" ||
                msg.role === "tool_request"
            )
            .filter((msg) => !(msg.role === "assistant" && !msg.content?.trim()))
            .map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}

          {isAgentThinking && (
            <Paper p="sm" radius="md" bg="gray.0">
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Thinking...
                </Text>
              </Group>
            </Paper>
          )}
        </Stack>
      </ScrollArea>

      {/* Input */}
      <Paper p="sm" withBorder style={{ borderBottom: 0, borderLeft: 0, borderRight: 0 }}>
        <Group gap="xs">
          <Textarea
            ref={inputRef}
            placeholder={`Message the assistant about ${currentAppId}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
            disabled={isProcessing}
            autosize
            minRows={3}
            maxRows={8}
          />
          {isProcessing ? (
            <ActionIcon
              size="lg"
              variant="filled"
              color="red"
              onClick={abort}
              title="Stop"
            >
              <IconPlayerStop size={18} />
            </ActionIcon>
          ) : (
            <ActionIcon
              size="lg"
              variant="filled"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <IconSend size={18} />
            </ActionIcon>
          )}
        </Group>
      </Paper>
    </Stack>
  );
}
