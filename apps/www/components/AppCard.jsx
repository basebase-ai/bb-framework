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

// Helper function to format relative time
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
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
 * }} props
 */
export default function AppCard({ app, ownerProfile, ownerDisplayName, onDetails, onFork }) {
  return (
    <Card
      shadow="xs"
      withBorder
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderColor: "#f5f3eb",
        transition: "all 0.2s ease",
        background: "#FFFFFF",
        cursor: "pointer",
      }}
      sx={(theme) => ({
        "&:hover": {
          borderColor: "#ff715b",
          transform: "translateY(-2px)",
          boxShadow: `0 4px 16px rgba(255, 113, 91, 0.12)`,
        },
      })}
      onClick={() => onDetails(app)}
    >
      <Card.Section
        withBorder
        inheritPadding
        py="xs"
        style={{
          background: "#faf9f7",
          borderColor: "#f5f3eb",
        }}
      >
        <Group position="apart" align="flex-start" wrap="nowrap" gap="xs">
          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Avatar
              src={app.logoURL}
              alt={app.name}
              radius="sm"
              size="md"
              color="coral"
              style={{ flexShrink: 0 }}
            >
              {app.name?.charAt(0)?.toUpperCase() || "A"}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text weight={600} size="sm" style={{ wordBreak: "break-word", lineHeight: 1.2 }}>
                {app.name || "Untitled App"}
              </Text>
              <Text size="xs" color="dimmed" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                by {ownerProfile?.displayName || "Unknown"}
              </Text>
            </div>
          </Group>
          {app.category && (
            <Badge color="gray" variant="light" style={{ flexShrink: 0 }}>
              {app.category}
            </Badge>
          )}
        </Group>
      </Card.Section>

      <Stack gap={4} mt="xs" style={{ flex: 1 }}>
        <Text size="xs" color="dimmed" lineClamp={2}>
          {app.description || "No description provided"}
        </Text>

        {app.tags && app.tags.length > 0 && (
          <Group gap={3} mt={2}>
            {app.tags.slice(0, 2).map((tag, idx) => (
              <Badge key={idx} variant="dot" color="dark" style={{ textTransform: "none" }}>
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
            <Text size="xs" color="dimmed">
              ({app.ratingCount || 0})
            </Text>
          </Group>
        )}
      </Stack>

      {/* Owner */}
      <Group gap={6} mt="xs" pt="xs" style={{ borderTop: "1px solid #f5f3eb" }}>
        <Avatar
          src={ownerProfile?.photoURL || null}
          alt={ownerProfile?.displayName || "Owner"}
          size="sm"
          radius="xl"
          color="teal"
        >
          {(ownerProfile?.displayName || "Unknown User").charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" style={{ color: "#5a7a7e" }}>
            {ownerDisplayName}
          </Text>
          {app.updatedAt && (
            <Text size="xs" style={{ color: "#a49966", opacity: 0.8 }}>
              {formatRelativeTime(app.updatedAt)}
            </Text>
          )}
        </div>
      </Group>

      <Group gap="xs" mt="xs" grow>
        <Button
          variant="light"
          color="slate"
          leftSection={<IconInfoCircle size={12} />}
          onClick={(event) => {
            event.stopPropagation();
            onDetails(app);
          }}
        >
          Details
        </Button>
        <Button
          variant="filled"
          color="coral"
          leftSection={<IconGitFork size={12} />}
          onClick={(event) => {
            event.stopPropagation();
            onFork(app);
          }}
        >
          Fork
        </Button>
      </Group>
    </Card>
  );
}

