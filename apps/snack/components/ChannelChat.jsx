/**
 * ChannelChat - Main chat area for a channel
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Stack,
  Group,
  Text,
  Title,
  ActionIcon,
  Textarea,
  Button,
  Loader,
  Center,
  Paper,
  Badge,
  Tooltip,
  Box,
} from "@mantine/core";
import {
  IconSend,
  IconUsers,
  IconHash,
  IconLock,
  IconUserPlus,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { collections } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";
import { MessageItem } from "./MessageItem.jsx";

/**
 * @typedef {Object} Channel
 * @property {string} id
 * @property {string} name
 * @property {string | undefined} description
 * @property {'public' | 'private'} visibility
 * @property {number} memberCount
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} channelId
 * @property {string} content
 * @property {string} authorId
 * @property {Record<string, string[]>} reactions
 * @property {Object | null} createdAt
 */

export function ChannelChat() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { selectedChannelId, openMembersModal } = useAppStore();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  // Fetch channel data
  const channelWhere = useMemo(() => {
    return selectedChannelId
      ? [["__name__", "==", selectedChannelId]]
      : [["__name__", "==", "__none__"]];
  }, [selectedChannelId]);

  // We need to fetch the channel by ID - let's get all and filter
  const { data: allChannels, loading: channelLoading } = useCollection(
    collections.channels
  );

  /** @type {Channel | undefined} */
  const channel = useMemo(() => {
    return allChannels.find((c) => c.id === selectedChannelId);
  }, [allChannels, selectedChannelId]);

  // Check if user is a member
  const membershipWhere = useMemo(() => {
    return user?.uid && selectedChannelId
      ? [
          ["channelId", "==", selectedChannelId],
          ["userId", "==", user.uid],
        ]
      : [["channelId", "==", "__none__"]];
  }, [selectedChannelId, user?.uid]);

  const { data: membershipData, add: addMember } = useCollection(
    collections.members,
    {
      where: membershipWhere,
    }
  );

  const isMember = membershipData.length > 0;

  // Fetch messages for this channel
  const messagesWhere = useMemo(() => {
    return selectedChannelId
      ? [["channelId", "==", selectedChannelId]]
      : [["channelId", "==", "__none__"]];
  }, [selectedChannelId]);

  const {
    data: messagesData,
    loading: messagesLoading,
    add: addMessage,
    update: updateMessage,
    remove: removeMessage,
  } = useCollection(collections.messages, {
    where: messagesWhere,
  });

  // Get channel update function
  const { update: updateChannel } = useCollection(collections.channels);

  // Sort messages by time (oldest first)
  /** @type {Message[]} */
  const messages = useMemo(() => {
    return [...messagesData].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });
  }, [messagesData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleJoinChannel = async () => {
    if (!user || !channel) return;

    try {
      await addMember({
        channelId: channel.id,
        userId: user.uid,
        displayName: profile?.displayName || user.email || "User",
        photoURL: profile?.photoURL || null,
        role: "member",
      });

      // Update channel member count
      await updateChannel(channel.id, {
        memberCount: (channel.memberCount || 0) + 1,
      });
    } catch (error) {
      console.error("Failed to join channel:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !messageText.trim() || !channel) return;

    setSending(true);
    const content = messageText.trim();
    setMessageText("");

    try {
      await addMessage({
        channelId: channel.id,
        content,
        authorId: user.uid,
        authorName: profile?.displayName || user.email || "Anonymous",
        authorPhotoURL: profile?.photoURL || null,
        reactions: {},
        isEdited: false,
        editedAt: null,
      });

      // Update channel stats
      await updateChannel(channel.id, {
        messageCount: (channel.messageCount || 0) + 1,
        lastMessageAt: new Date(),
        lastMessagePreview:
          content.length > 50 ? content.substring(0, 50) + "..." : content,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessageText(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (/** @type {React.KeyboardEvent} */ e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedChannelId) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <IconHash size={48} color="gray" />
          <Text c="dimmed">Select a channel to start chatting</Text>
        </Stack>
      </Center>
    );
  }

  if (channelLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (!channel) {
    return (
      <Center h="100%">
        <Text c="dimmed">Channel not found</Text>
      </Center>
    );
  }

  return (
    <Stack h="100%" gap={0}>
      {/* Channel Header */}
      <Paper
        p="md"
        withBorder
        style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            {channel.visibility === "private" ? (
              <IconLock size={20} />
            ) : (
              <IconHash size={20} />
            )}
            <Title order={4}>{channel.name}</Title>
            {channel.description && (
              <>
                <Text c="dimmed">|</Text>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {channel.description}
                </Text>
              </>
            )}
          </Group>
          <Group gap="xs">
            <Badge variant="light" leftSection={<IconUsers size={12} />}>
              {channel.memberCount || 0} members
            </Badge>
            <Tooltip label="Manage members">
              <ActionIcon variant="subtle" onClick={openMembersModal}>
                <IconUsers size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Messages Area */}
      <Box
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messagesLoading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : messages.length === 0 ? (
          <Center style={{ flex: 1 }}>
            <Stack align="center" gap="md">
              <IconHash size={48} color="gray" />
              <Text c="dimmed" ta="center">
                This is the beginning of #{channel.name}
                <br />
                Send a message to get the conversation started!
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap={0} py="md">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onUpdate={updateMessage}
                onDelete={removeMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Message Input */}
      <Paper p="md" withBorder style={{ borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        {!user ? (
          <Text size="sm" c="dimmed" ta="center">
            Please sign in to send messages
          </Text>
        ) : !isMember ? (
          <Center>
            <Button
              leftSection={<IconUserPlus size={16} />}
              onClick={handleJoinChannel}
            >
              Join #{channel.name} to send messages
            </Button>
          </Center>
        ) : (
          <Group gap="sm" align="flex-end">
            <Textarea
              placeholder={`Message #${channel.name}`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              autosize
              minRows={1}
              maxRows={5}
              style={{ flex: 1 }}
              disabled={sending}
            />
            <ActionIcon
              size="lg"
              variant="filled"
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              loading={sending}
            >
              <IconSend size={18} />
            </ActionIcon>
          </Group>
        )}
      </Paper>

      {/* CSS for hover effects */}
      <style>{`
        .message-item:hover {
          background-color: var(--mantine-color-gray-0);
        }
        .message-item:hover .message-actions {
          opacity: 1 !important;
        }
      `}</style>
    </Stack>
  );
}



