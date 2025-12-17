/**
 * CreateChannelModal - Modal for creating new channels
 */

import React, { useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  SegmentedControl,
  Button,
  Group,
  Text,
  Alert,
} from "@mantine/core";
import { IconHash, IconLock, IconAlertCircle } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { collections, CHANNEL_VISIBILITY } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";

export function CreateChannelModal() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { createChannelModalOpen, closeCreateChannelModal, setSelectedChannel } =
    useAppStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState(CHANNEL_VISIBILITY.PUBLIC);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const { add: addChannel } = useCollection(collections.channels);
  const { add: addMember } = useCollection(collections.members);

  const handleClose = () => {
    setName("");
    setDescription("");
    setVisibility(CHANNEL_VISIBILITY.PUBLIC);
    setError(null);
    closeCreateChannelModal();
  };

  const handleCreate = async () => {
    if (!user) return;

    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!channelName) {
      setError("Channel name is required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(channelName)) {
      setError(
        "Channel name can only contain lowercase letters, numbers, and hyphens"
      );
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create the channel
      const channelId = await addChannel({
        name: channelName,
        description: description.trim() || null,
        visibility,
        memberCount: 1,
        messageCount: 0,
        lastMessageAt: null,
        lastMessagePreview: null,
        createdBy: user.uid,
      });

      // Add creator as owner/member
      await addMember({
        channelId,
        userId: user.uid,
        displayName: profile?.displayName || user.email || "User",
        photoURL: profile?.photoURL || null,
        role: "owner",
      });

      // Select the new channel
      setSelectedChannel(channelId);
      handleClose();
    } catch (err) {
      console.error("Failed to create channel:", err);
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      opened={createChannelModalOpen}
      onClose={handleClose}
      title="Create a channel"
      size="md"
      zIndex={10000}
    >
      <Stack gap="md">
        {/* Channel Name */}
        <TextInput
          label="Channel name"
          placeholder="e.g. general, announcements"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftSection={
            visibility === CHANNEL_VISIBILITY.PRIVATE ? (
              <IconLock size={16} />
            ) : (
              <IconHash size={16} />
            )
          }
          description="Lowercase, no spaces. Use hyphens for multi-word names."
          required
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="What's this channel about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={2}
          maxRows={4}
        />

        {/* Visibility */}
        <div>
          <Text size="sm" fw={500} mb={4}>
            Visibility
          </Text>
          <SegmentedControl
            value={visibility}
            onChange={(v) => setVisibility(v)}
            data={[
              {
                value: CHANNEL_VISIBILITY.PUBLIC,
                label: (
                  <Group gap={4}>
                    <IconHash size={14} />
                    <span>Public</span>
                  </Group>
                ),
              },
              {
                value: CHANNEL_VISIBILITY.PRIVATE,
                label: (
                  <Group gap={4}>
                    <IconLock size={14} />
                    <span>Private</span>
                  </Group>
                ),
              },
            ]}
            fullWidth
          />
          <Text size="xs" c="dimmed" mt={4}>
            {visibility === CHANNEL_VISIBILITY.PUBLIC
              ? "Anyone can join this channel"
              : "Only invited members can see and join"}
          </Text>
        </div>

        {/* Error */}
        {error && (
          <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            title="Error"
          >
            {error}
          </Alert>
        )}

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={creating}>
            Create Channel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


