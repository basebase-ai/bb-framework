import React from "react";
import {
  Card,
  Text,
  Button,
  Badge,
  Group,
  Stack,
  Avatar,
  Rating,
} from "@mantine/core";
import { IconGitFork, IconInfoCircle } from "@tabler/icons-react";

/** @type {Record<string, Record<string, string>>} */
const THEMES = {
  light: {
    bg: "#FFFFFF",
    bgHeader: "#faf9f7",
    border: "#f5f3eb",
    borderHover: "#ff715b",
    text: "#1a1a1a",
    textMuted: "#5a7a7e",
    textDim: "#a49966",
    accent: "#ff715b",
    accentAlt: "#17bebb",
  },
  dark: {
    bg: "#111111",
    bgHeader: "#161616",
    border: "#2a2a2a",
    borderHover: "#22c55e",
    text: "#e5e5e5",
    textMuted: "#888888",
    textDim: "#666666",
    accent: "#22c55e",
    accentAlt: "#ec4899",
  },
};

/**
 * Helper function to format relative time
 * @param {any} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * @param {{
 *   app: Record<string, any>;
 *   ownerProfile: Record<string, any> | undefined;
 *   ownerDisplayName: string;
 *   onDetails: (app: Record<string, any>) => void;
 *   onFork: (app: Record<string, any>) => void;
 *   darkMode?: boolean;
 * }} props
 */
export default function AppCard({ app, ownerProfile, ownerDisplayName, onDetails, onFork, darkMode = false }) {
  const colors = darkMode ? THEMES.dark : THEMES.light;

  return (
    <Card
      shadow="xs"
      withBorder
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderColor: colors.border,
        transition: "all 0.2s ease",
        background: colors.bg,
        cursor: "pointer",
      }}
      onClick={() => onDetails(app)}
    >
      <Card.Section
        withBorder
        inheritPadding
        py="xs"
        style={{
          background: colors.bgHeader,
          borderColor: colors.border,
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Avatar
              src={app.logoURL}
              alt={app.name}
              radius="sm"
              size="md"
              color={darkMode ? "green" : "orange"}
              style={{ flexShrink: 0 }}
            >
              {app.name?.charAt(0)?.toUpperCase() || "A"}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text fw={600} size="sm" style={{ wordBreak: "break-word", lineHeight: 1.2, color: colors.text }}>
                {app.name || "Untitled App"}
              </Text>
              <Text size="xs" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: colors.textMuted }}>
                by {ownerProfile?.displayName || "Unknown"}
              </Text>
            </div>
          </Group>
          {app.category && (
            <Badge color={darkMode ? "dark" : "gray"} variant={darkMode ? "outline" : "light"} style={{ flexShrink: 0 }}>
              {app.category}
            </Badge>
          )}
        </Group>
      </Card.Section>

      <Stack gap={4} mt="xs" style={{ flex: 1 }}>
        <Text size="xs" lineClamp={2} style={{ color: colors.textMuted }}>
          {app.description || "No description provided"}
        </Text>

        {app.tags && app.tags.length > 0 && (
          <Group gap={3} mt={2}>
            {app.tags.slice(0, 2).map((/** @type {string} */ tag, /** @type {number} */ idx) => (
              <Badge key={idx} variant="dot" color={darkMode ? "green" : "dark"} style={{ textTransform: "none" }}>
                {tag}
              </Badge>
            ))}
            {app.tags.length > 2 && (
              <Badge variant="outline" color="gray">
                +{app.tags.length - 2}
              </Badge>
            )}
          </Group>
        )}

        {(app.rating || app.ratingCount) && (
          <Group gap="xs" mt="auto" pt="xs">
            <Rating value={app.rating || 0} fractions={2} readOnly size="xs" />
            <Text size="xs" style={{ color: colors.textMuted }}>
              ({app.ratingCount || 0})
            </Text>
          </Group>
        )}
      </Stack>

      {/* Owner */}
      <Group gap={6} mt="xs" pt="xs" style={{ borderTop: `1px solid ${colors.border}` }}>
        <Avatar
          src={ownerProfile?.photoURL || null}
          alt={ownerProfile?.displayName || "Owner"}
          size="sm"
          radius="xl"
          color={darkMode ? "pink" : "teal"}
        >
          {(ownerProfile?.displayName || "Unknown User").charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" style={{ color: colors.textMuted }}>
            {ownerDisplayName}
          </Text>
          {app.updatedAt && (
            <Text size="xs" style={{ color: colors.textDim }}>
              {formatRelativeTime(app.updatedAt)}
            </Text>
          )}
        </div>
      </Group>

      <Group gap="xs" mt="xs" grow>
        <Button
          variant={darkMode ? "outline" : "light"}
          leftSection={<IconInfoCircle size={12} />}
          onClick={(event) => {
            event.stopPropagation();
            onDetails(app);
          }}
          style={darkMode ? { borderColor: colors.border, color: colors.text } : undefined}
        >
          Details
        </Button>
        <Button
          variant="filled"
          leftSection={<IconGitFork size={12} />}
          onClick={(event) => {
            event.stopPropagation();
            onFork(app);
          }}
          style={{
            backgroundColor: colors.accent,
            color: darkMode ? "#0a0a0a" : "#FFFFFF",
          }}
        >
          Fork
        </Button>
      </Group>
    </Card>
  );
}

