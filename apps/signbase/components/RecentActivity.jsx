/**
 * RecentActivity - Shows recent signatures, file additions, etc.
 */

import React, { useMemo } from "react";
import {
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Avatar,
  Timeline,
  ScrollArea,
} from "@mantine/core";
import {
  IconFileText,
  IconSignature,
  IconClock,
  IconMapPin,
} from "@tabler/icons-react";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";

/**
 * @typedef {Object} RecentActivityProps
 * @property {Array} documents - All documents
 * @property {Array} signatures - All signatures
 * @property {number} limit - Maximum number of items to show
 */

/**
 * @param {RecentActivityProps} props
 */
export function RecentActivity({ documents, signatures, limit = 10 }) {
  // Get unique user IDs for profile lookup
  const userIds = useMemo(() => {
    const ids = new Set();
    documents?.forEach((doc) => {
      if (doc.owner) ids.add(doc.owner);
    });
    signatures?.forEach((sig) => {
      if (sig.signerId) ids.add(sig.signerId);
    });
    return Array.from(ids);
  }, [documents, signatures]);

  const { profiles } = useUserProfiles(userIds);

  // Create a map of document IDs to titles for quick lookup
  const documentMap = useMemo(() => {
    const map = new Map();
    documents?.forEach((doc) => {
      map.set(doc.id, doc.title || doc.name);
    });
    return map;
  }, [documents]);

  // Combine and sort activities by date
  const activities = useMemo(() => {
    const items = [];

    // Add document creations
    documents?.forEach((doc) => {
      if (doc.createdAt) {
        const date = doc.createdAt.toDate
          ? doc.createdAt.toDate()
          : new Date(doc.createdAt);
        items.push({
          type: "document",
          id: doc.id,
          title: doc.title || doc.name,
          user: doc.owner,
          date,
          timestamp: date.getTime(),
        });
      }
    });

    // Add signatures
    signatures?.forEach((sig) => {
      if (sig.signedAt) {
        const date = sig.signedAt.toDate
          ? sig.signedAt.toDate()
          : new Date(sig.signedAt);
        items.push({
          type: "signature",
          id: sig.id,
          documentId: sig.documentId,
          documentTitle: documentMap.get(sig.documentId) || "Unknown document",
          signerName: sig.signerName,
          signerEmail: sig.signerEmail,
          user: sig.signerId,
          location: sig.location,
          date,
          timestamp: date.getTime(),
        });
      }
    });

    // Sort by date (most recent first)
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }, [documents, signatures, limit, documentMap]);

  // Format date for display
  const formatDate = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Format location for display
  const formatLocation = (location) => {
    if (!location) return null;
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country && !location.region) parts.push(location.country);
    if (parts.length > 0) return parts.join(", ");
    return null;
  };

  if (activities.length === 0) {
    return (
      <Paper withBorder style={{ overflow: "hidden" }}>
        <Group p="sm" bg="gray.0" justify="space-between">
          <Group gap="xs">
            <IconClock size={18} color="#228be6" />
            <Text fw={500} size="sm">Recent Activity</Text>
          </Group>
        </Group>
        <Stack p="md" align="center">
          <Text size="sm" c="dimmed">
            No recent activity
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder style={{ overflow: "hidden" }}>
      <Group p="sm" bg="gray.0" justify="space-between">
        <Group gap="xs">
          <IconClock size={18} color="#228be6" />
          <Text fw={500} size="sm">Recent Activity</Text>
        </Group>
        <Badge variant="light" color="blue" size="sm">
          {activities.length}
        </Badge>
      </Group>

      <ScrollArea h={300}>
        <Timeline active={-1} bulletSize={24} lineWidth={2} p="md">
          {activities.map((activity) => {
            const profile = profiles?.get?.(activity.user);
            const displayName =
              profile?.displayName ||
              (activity.type === "signature"
                ? activity.signerName
                : "Unknown");

            return (
              <Timeline.Item
                key={`${activity.type}-${activity.id}`}
                bullet={
                  activity.type === "document" ? (
                    <IconFileText size={12} />
                  ) : (
                    <IconSignature size={12} />
                  )
                }
                title={
                  <Group gap="xs" wrap="nowrap">
                    <Avatar
                      src={profile?.photoURL}
                      size="xs"
                      radius="xl"
                      alt={displayName}
                    />
                    <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                      {activity.type === "document"
                        ? "Document added"
                        : "Document signed"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(activity.date)}
                    </Text>
                  </Group>
                }
              >
                <Stack gap={4} mt={4}>
                  {activity.type === "document" ? (
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {activity.title}
                    </Text>
                  ) : (
                    <>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {activity.signerName} signed "{activity.documentTitle}"
                      </Text>
                      {activity.location && formatLocation(activity.location) && (
                        <Group gap={4}>
                          <IconMapPin size={12} color="gray" />
                          <Text size="xs" c="dimmed">
                            {formatLocation(activity.location)}
                          </Text>
                        </Group>
                      )}
                    </>
                  )}
                </Stack>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </ScrollArea>
    </Paper>
  );
}

