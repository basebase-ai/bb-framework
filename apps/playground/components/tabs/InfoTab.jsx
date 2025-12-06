import React from "react";
import { Card, Text, Badge, Group, Stack, Avatar, Divider, ActionIcon } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";

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

export default function InfoTab({ app, ownerProfile, collaboratorProfiles }) {
  return (
    <Stack gap="md">
      <Card withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">App URL</Text>
            <Group gap="xs">
              <Text size="sm" ff="monospace">{app.id}.basebase.com</Text>
              <ActionIcon 
                size="xs" 
                variant="subtle"
                onClick={() => {
                  navigator.clipboard.writeText(`https://${app.id}.basebase.com`);
                  showNotification({ message: "URL copied!", color: "teal" });
                }}
              >
                <IconCopy size={12} />
              </ActionIcon>
            </Group>
          </Group>
          
          <Divider />
          
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">Category</Text>
            <Badge color="violet" variant="light">{app.category || "Uncategorized"}</Badge>
          </Group>
          
          <Divider />
          
          <div>
            <Text size="sm" fw={500} c="dimmed" mb="xs">Description</Text>
            <Text size="sm">{app.description || "No description provided"}</Text>
          </div>
          
          {app.tags && app.tags.length > 0 && (
            <>
              <Divider />
              <div>
                <Text size="sm" fw={500} c="dimmed" mb="xs">Tags</Text>
                <Group gap={4}>
                  {app.tags.map((tag, idx) => (
                    <Badge key={idx} variant="dot" color="violet" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </div>
            </>
          )}
        </Stack>
      </Card>
      
      <Card withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={600}>Owner</Text>
          <Group gap="sm">
            <Avatar
              src={ownerProfile?.photoURL}
              alt={ownerProfile?.displayName}
              size="md"
              radius="xl"
              color="violet"
            >
              {(ownerProfile?.displayName || "?").charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text size="sm" fw={500}>{ownerProfile?.displayName || "Unknown"}</Text>
              <Text size="xs" c="dimmed">{ownerProfile?.email}</Text>
            </div>
          </Group>
          
          {app.collaborators && app.collaborators.length > 0 && (
            <>
              <Divider />
              <Text size="sm" fw={600}>Collaborators</Text>
              <Stack gap="xs">
                {app.collaborators.map((uid) => {
                  const profile = collaboratorProfiles?.get(uid);
                  return (
                    <Group key={uid} gap="sm">
                      <Avatar src={profile?.photoURL} size="sm" radius="xl" color="violet">
                        {(profile?.displayName || "?").charAt(0).toUpperCase()}
                      </Avatar>
                      <Text size="sm">{profile?.displayName || profile?.email || uid}</Text>
                    </Group>
                  );
                })}
              </Stack>
            </>
          )}
        </Stack>
      </Card>
      
      <Card withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">Access Mode</Text>
            <Badge color={app.accessMode === "open" ? "teal" : "orange"} variant="light">
              {app.accessMode === "open" ? "Open" : "Invite Only"}
            </Badge>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">Public Use</Text>
            <Badge color={app.publicUse ? "teal" : "gray"} variant="light">
              {app.publicUse ? "Yes" : "No"}
            </Badge>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">Public Edit</Text>
            <Badge color={app.publicEdit ? "teal" : "gray"} variant="light">
              {app.publicEdit ? "Yes" : "No"}
            </Badge>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">Created</Text>
            <Text size="sm">{app.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}</Text>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">Last Updated</Text>
            <Text size="sm">{formatRelativeTime(app.updatedAt)}</Text>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}

