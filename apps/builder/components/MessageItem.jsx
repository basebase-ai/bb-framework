/**
 * MessageItem - Renders a single chat message with markdown support
 */

import React from "react";
import { Paper, Text, Group, ThemeIcon, Code, ScrollArea, Box, TypographyStylesProvider } from "@mantine/core";
import {
  IconUser,
  IconRobot,
  IconTool,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { marked } from "marked";

/**
 * Truncate user message for display (keeps full content in state).
 * @param {string} text
 * @param {number} maxLines
 * @returns {string}
 */
function truncateUserMessageForDisplay(text, maxLines) {
  const lines = String(text || "").split("\n");
  if (lines.length <= maxLines) return String(text || "");
  const remaining = lines.length - maxLines;
  return `${lines.slice(0, maxLines).join("\n")}\n… (${remaining} more line${
    remaining === 1 ? "" : "s"
  } hidden)`;
}

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'assistant' | 'tool' | 'tool_request'} role
 * @property {string} content
 * @property {number} timestamp
 * @property {{ name: string, success: boolean }} [toolCall]
 */

/**
 * @param {{ message: Message }} props
 */
export function MessageItem({ message }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool";
  const isToolRequest = message.role === "tool_request";
  const displayContent = isUser
    ? truncateUserMessageForDisplay(message.content, 10)
    : message.content;

  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isTool || isToolRequest) {
    if (isToolRequest) {
      return (
        <Paper
          p="xs"
          radius="md"
          withBorder
          style={{
            backgroundColor: "#f8f9fa",
            borderColor: "#e9ecef",
          }}
        >
          <Group gap="xs" justify="space-between">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="gray">
                <IconTool size={14} />
              </ThemeIcon>
              <Text size="xs" c="dimmed" fw={500}>
                {message.content}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {time}
            </Text>
          </Group>
        </Paper>
      );
    }

    return (
      <Paper
        p="xs"
        radius="md"
        withBorder
        style={{
          backgroundColor: isToolRequest ? "#f8f9fa" : (message.toolCall?.success ? "#f0fdf4" : "#fef2f2"),
          borderColor: isToolRequest ? "#e9ecef" : (message.toolCall?.success ? "#86efac" : "#fecaca"),
        }}
      >
        <Group gap="xs" mb="xs">
          <ThemeIcon
            size="sm"
            variant="light"
            color={isToolRequest ? "gray" : (message.toolCall?.success ? "green" : "red")}
          >
            {isToolRequest ? <IconTool size={14} /> : message.toolCall?.success ? <IconCheck size={14} /> : <IconX size={14} />}
          </ThemeIcon>
          <Text size="xs" fw={500} c={isToolRequest ? "dimmed" : (message.toolCall?.success ? "green" : "red")}>
            {isToolRequest ? "Tool call" : (message.toolCall?.name || "Tool")}
          </Text>
          <Text size="xs" c="dimmed">
            {time}
          </Text>
        </Group>
        <ScrollArea.Autosize mah={300}>
          <Code block style={{ fontSize: "11px", whiteSpace: "pre-wrap" }}>
            {message.content}
          </Code>
        </ScrollArea.Autosize>
      </Paper>
    );
  }

  return (
    <Paper
      p="sm"
      radius="md"
      style={{
        backgroundColor: isUser ? "#e7f5ff" : "#f8f9fa",
        marginLeft: isUser ? "40px" : 0,
        marginRight: isAssistant ? "40px" : 0,
      }}
    >
      <Group gap="xs" mb="xs">
        <ThemeIcon
          size="sm"
          variant="light"
          color={isUser ? "blue" : "gray"}
        >
          {isUser ? <IconUser size={14} /> : <IconRobot size={14} />}
        </ThemeIcon>
        <Text size="xs" fw={500}>
          {isUser ? "You" : "Assistant"}
        </Text>
        <Text size="xs" c="dimmed">
          {time}
        </Text>
      </Group>
      <Box pl={28}>
        {isAssistant ? (
          <TypographyStylesProvider>
            <div
              style={{ fontSize: "14px", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: marked.parse(message.content || "") }}
            />
          </TypographyStylesProvider>
        ) : (
          <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {displayContent}
          </Text>
        )}
      </Box>
    </Paper>
  );
}
