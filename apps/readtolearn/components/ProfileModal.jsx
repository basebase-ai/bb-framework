/**
 * ProfileModal - User profile editor
 */
import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Avatar,
  Text,
} from "@mantine/core";
import { IconUser, IconMail } from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";

/**
 * @param {{ opened: boolean, onClose: () => void }} props
 */
export function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, updateProfile, loading } = useUserProfile(user?.uid);

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!displayName.trim()) return;

    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      onClose();
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Profile" centered>
      <Stack gap="md">
        <Group justify="center">
          <Avatar
            src={profile?.photoURL || user.photoURL}
            size={80}
            radius={80}
            color="blue"
          >
            {(displayName || user.email || "U").charAt(0).toUpperCase()}
          </Avatar>
        </Group>

        <TextInput
          label="Display Name"
          placeholder="Enter your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          leftSection={<IconUser size={16} />}
        />

        <TextInput
          label="Email"
          value={user.email || ""}
          leftSection={<IconMail size={16} />}
          disabled
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!displayName.trim()}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


