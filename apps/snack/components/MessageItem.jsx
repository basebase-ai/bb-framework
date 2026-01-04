/**
 * MessageItem - Individual message with reactions and editing
 */

import React, { useState } from "react";
import {
  Paper,
  Group,
  Stack,
  Text,
  Avatar,
  ActionIcon,
  Textarea,
  Button,
  Menu,
  Tooltip,
  Badge,
} from "@mantine/core";
import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconMoodSmile,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { REACTION_EMOJIS } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} channelId
 * @property {string} content
 * @property {string} authorId
 * @property {string | undefined} authorName
 * @property {string | undefined} authorPhotoURL
 * @property {Record<string, string[]>} reactions
 * @property {boolean} isEdited
 * @property {Object | null} editedAt
 * @property {Object | null} createdAt
 */

/**
 * @param {{ message: Message, onUpdate: (id: string, updates: Partial<Message>) => Promise<void>, onDelete: (id: string) => Promise<void> }} props
 */
export function MessageItem({ message, onUpdate, onDelete }) {
  const { user } = useAuth();
  const { editingMessageId, setEditingMessage } = useAppStore();
  const [editContent, setEditContent] = useState(message.content);
  const [saving, setSaving] = useState(false);

  const { profiles } = useUserProfiles([message.authorId]);
  const authorProfile = profiles.get(message.authorId);

  const isAuthor = user?.uid === message.authorId;
  const isEditing = editingMessageId === message.id;

  const formattedTime = message.createdAt?.toDate
    ? new Date(message.createdAt.toDate()).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

  const formattedDate = message.createdAt?.toDate
    ? new Date(message.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  const handleStartEdit = () => {
    setEditContent(message.content);
    setEditingMessage(message.id);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setEditingMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await onUpdate(message.id, {
        content: editContent.trim(),
        isEdited: true,
        editedAt: new Date(),
      });
      setEditingMessage(null);
    } catch (error) {
      console.error("Failed to update message:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this message?")) return;
    try {
      await onDelete(message.id);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleReaction = async (/** @type {string} */ emoji) => {
    if (!user) return;

    const currentReactions = { ...message.reactions };
    const emojiReactions = currentReactions[emoji] || [];
    const userIndex = emojiReactions.indexOf(user.uid);

    if (userIndex >= 0) {
      // Remove reaction
      emojiReactions.splice(userIndex, 1);
      if (emojiReactions.length === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = emojiReactions;
      }
    } else {
      // Add reaction
      currentReactions[emoji] = [...emojiReactions, user.uid];
    }

    try {
      await onUpdate(message.id, { reactions: currentReactions });
    } catch (error) {
      console.error("Failed to update reaction:", error);
    }
  };

  // Get reaction counts
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, users]) => users.length > 0
  );

  return (
    <Group
      gap="sm"
      align="flex-start"
      wrap="nowrap"
      py="xs"
      px="md"
      style={{
        "&:hover": { backgroundColor: "var(--mantine-color-gray-0)" },
      }}
      className="message-item"
    >
      {/* Avatar */}
      <Avatar
        src={authorProfile?.photoURL || message.authorPhotoURL}
        alt={authorProfile?.displayName || message.authorName || "User"}
        size="md"
        radius="sm"
        mt={4}
      />

      {/* Content */}
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <Group gap="xs" align="baseline">
          <Text size="sm" fw={700}>
            {authorProfile?.displayName || message.authorName || "Anonymous"}
          </Text>
          <Text size="xs" c="dimmed">
            {formattedDate} at {formattedTime}
          </Text>
          {message.isEdited && (
            <Text size="xs" c="dimmed" fs="italic">
              (edited)
            </Text>
          )}
        </Group>

        {/* Message Body */}
        {isEditing ? (
          <Stack gap="xs">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autosize
              minRows={1}
              maxRows={10}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
            />
            <Group gap="xs">
              <Button
                size="xs"
                onClick={handleSaveEdit}
                loading={saving}
                leftSection={<IconCheck size={14} />}
              >
                Save
              </Button>
              <Button
                size="xs"
                variant="default"
                onClick={handleCancelEdit}
                leftSection={<IconX size={14} />}
              >
                Cancel
              </Button>
              <Text size="xs" c="dimmed">
                Escape to cancel • Enter to save
              </Text>
            </Group>
          </Stack>
        ) : (
          <Text
            size="sm"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {message.content}
          </Text>
        )}

        {/* Reactions */}
        {!isEditing && reactionEntries.length > 0 && (
          <Group gap={4} mt={4}>
            {reactionEntries.map(([emoji, users]) => {
              const hasReacted = user ? users.includes(user.uid) : false;
              return (
                <Tooltip
                  key={emoji}
                  label={`${users.length} ${users.length === 1 ? "person" : "people"} reacted`}
                >
                  <Badge
                    variant={hasReacted ? "filled" : "light"}
                    color={hasReacted ? "blue" : "gray"}
                    size="lg"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleReaction(emoji)}
                  >
                    {emoji} {users.length}
                  </Badge>
                </Tooltip>
              );
            })}
          </Group>
        )}
      </Stack>

      {/* Actions (visible on hover via CSS) */}
      {!isEditing && (
        <Group
          gap={4}
          className="message-actions"
          style={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          {/* Reaction picker */}
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm">
                <IconMoodSmile size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Group gap={4} p="xs">
                {REACTION_EMOJIS.map((emoji) => (
                  <ActionIcon
                    key={emoji}
                    variant="subtle"
                    size="lg"
                    onClick={() => handleReaction(emoji)}
                  >
                    <Text size="lg">{emoji}</Text>
                  </ActionIcon>
                ))}
              </Group>
            </Menu.Dropdown>
          </Menu>

          {/* More actions */}
          {isAuthor && (
            <Menu shadow="md">
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={handleStartEdit}
                >
                  Edit message
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={handleDelete}
                >
                  Delete message
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      )}
    </Group>
  );
}



