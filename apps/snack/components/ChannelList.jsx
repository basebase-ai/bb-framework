/**
 * ChannelList - Left sidebar showing all channels
 */

import React, { useMemo } from "react";
import {
  Stack,
  NavLink,
  Text,
  Group,
  ActionIcon,
  Badge,
  Loader,
  Center,
  Tooltip,
} from "@mantine/core";
import { IconHash, IconLock, IconPlus } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";

/**
 * @typedef {Object} Channel
 * @property {string} id
 * @property {string} name
 * @property {string | undefined} description
 * @property {'public' | 'private'} visibility
 * @property {number} memberCount
 * @property {number} messageCount
 * @property {Object | null} lastMessageAt
 * @property {string | undefined} lastMessagePreview
 */

export function ChannelList() {
  const { user } = useAuth();
  const { selectedChannelId, setSelectedChannel, openCreateChannelModal } =
    useAppStore();

  // Get all public channels
  const { data: channels, loading } = useCollection(collections.channels);

  // Get user's channel memberships
  const membershipWhere = useMemo(() => {
    return user?.uid
      ? [["userId", "==", user.uid]]
      : [["userId", "==", "__none__"]];
  }, [user?.uid]);

  const { data: memberships } = useCollection(collections.members, {
    where: membershipWhere,
  });

  // Set of channel IDs user is a member of
  const memberChannelIds = useMemo(() => {
    return new Set(memberships.map((m) => m.channelId));
  }, [memberships]);

  // Sort channels: joined first, then by last message time
  /** @type {Channel[]} */
  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      const aJoined = memberChannelIds.has(a.id);
      const bJoined = memberChannelIds.has(b.id);

      // Joined channels first
      if (aJoined && !bJoined) return -1;
      if (!aJoined && bJoined) return 1;

      // Then by last message time (most recent first)
      const aTime = a.lastMessageAt?.toMillis?.() || 0;
      const bTime = b.lastMessageAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [channels, memberChannelIds]);

  // Auto-select first channel if none selected
  React.useEffect(() => {
    if (!selectedChannelId && sortedChannels.length > 0) {
      // Prefer first joined channel
      const firstJoined = sortedChannels.find((c) =>
        memberChannelIds.has(c.id)
      );
      setSelectedChannel(firstJoined?.id || sortedChannels[0].id);
    }
  }, [sortedChannels, selectedChannelId, memberChannelIds, setSelectedChannel]);

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap={0}>
      {/* Header */}
      <Group justify="space-between" px="sm" py="xs">
        <Text size="xs" fw={600} c="rgba(255,255,255,0.7)" tt="uppercase">
          Channels
        </Text>
        <Tooltip label="Create Channel" position="right">
          <ActionIcon
            variant="subtle"
            size="sm"
            color="white"
            onClick={openCreateChannelModal}
          >
            <IconPlus size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Channel List */}
      {sortedChannels.length === 0 ? (
        <Text size="sm" c="rgba(255,255,255,0.6)" ta="center" py="md">
          No channels yet.
          <br />
          Create one to get started!
        </Text>
      ) : (
        sortedChannels.map((channel) => {
          const isMember = memberChannelIds.has(channel.id);
          const isSelected = selectedChannelId === channel.id;

          return (
            <NavLink
              key={channel.id}
              active={isSelected}
              onClick={() => setSelectedChannel(channel.id)}
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text
                    size="sm"
                    fw={isSelected ? 600 : 400}
                    truncate
                    c={isMember ? "white" : "rgba(255,255,255,0.7)"}
                    style={{ flex: 1 }}
                  >
                    {channel.name}
                  </Text>
                  {!isMember && (
                    <Badge size="xs" variant="outline" color="rgba(255,255,255,0.5)">
                      Join
                    </Badge>
                  )}
                </Group>
              }
              leftSection={
                channel.visibility === "private" ? (
                  <IconLock size={16} color={isMember ? "white" : "rgba(255,255,255,0.7)"} />
                ) : (
                  <IconHash size={16} color={isMember ? "white" : "rgba(255,255,255,0.7)"} />
                )
              }
              description={
                channel.lastMessagePreview ? (
                  <Text size="xs" c="rgba(255,255,255,0.6)" truncate>
                    {channel.lastMessagePreview}
                  </Text>
                ) : null
              }
            />
          );
        })
      )}
    </Stack>
  );
}



