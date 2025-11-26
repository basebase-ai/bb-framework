/**
 * Email Card - Display individual email with actions
 */

import React from "react";
import {
  Paper,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Collapse,
  Divider,
  Box,
} from "@mantine/core";
import { IconMail, IconMailOpened, IconArchive, IconChevronDown, IconChevronUp } from "@tabler/icons-react";

export function EmailCard({
  email,
  onMarkAsRead,
  onArchive,
  isExpanded,
  onToggleExpand,
}) {
  const receivedDate = email.receivedAt?.toDate ? email.receivedAt.toDate() : new Date(email.receivedAt);
  const formattedDate = receivedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Paper
      shadow="xs"
      p="md"
      withBorder
      style={{
        cursor: "pointer",
        backgroundColor: email.isRead ? "transparent" : "#f8f9fa",
        borderLeft: email.isRead ? "3px solid transparent" : "3px solid #228be6",
      }}
    >
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between" wrap="nowrap" onClick={onToggleExpand}>
          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
            {email.isRead ? (
              <IconMailOpened size={20} color="gray" />
            ) : (
              <IconMail size={20} color="#228be6" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text fw={email.isRead ? 400 : 600} truncate>
                {email.subject || "(No Subject)"}
              </Text>
              <Text size="sm" c="dimmed" truncate>
                {email.from}
              </Text>
            </div>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {formattedDate}
            </Text>
            {!email.isRead && <Badge size="sm" color="blue">New</Badge>}
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
        </Group>

        {/* Snippet */}
        <Text size="sm" c="dimmed" lineClamp={isExpanded ? undefined : 2}>
          {email.snippet}
        </Text>

        {/* Expanded Content */}
        <Collapse in={isExpanded}>
          <Stack gap="sm" mt="sm">
            {email.llmReason && (
              <Box
                p="sm"
                style={{
                  backgroundColor: "#e7f5ff",
                  borderRadius: 4,
                  borderLeft: "3px solid #228be6",
                }}
              >
                <Text size="sm" fw={500} mb={4}>
                  🤖 AI Insight:
                </Text>
                <Text size="sm">{email.llmReason}</Text>
              </Box>
            )}

            {email.to && email.to.length > 0 && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>To:</Text>
                <Text size="sm">{email.to.join(", ")}</Text>
              </div>
            )}

            {email.cc && email.cc.length > 0 && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>CC:</Text>
                <Text size="sm">{email.cc.join(", ")}</Text>
              </div>
            )}

            <Divider />

            <Group gap="xs">
              {!email.isRead && (
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(email.id);
                  }}
                  title="Mark as read"
                >
                  <IconMailOpened size={18} />
                </ActionIcon>
              )}
              <ActionIcon
                variant="light"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(email.id);
                }}
                title="Archive"
              >
                <IconArchive size={18} />
              </ActionIcon>
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}

