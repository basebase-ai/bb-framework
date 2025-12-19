/**
 * ProfileModal - User profile management modal
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Avatar,
  Group,
  Text,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUser, IconLogout } from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { signOut } from "firebase/auth";
import { auth } from "../../../framework/core/firebase-init.js";

/**
 * @param {{ opened: boolean, onClose: () => void }} props
 */
export function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile(user?.uid);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      notifications.show({
        title: "Profile updated",
        message: "Your display name has been updated.",
        color: "green",
      });
        onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update profile.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!user) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Profile" centered>
      <Stack gap="md">
        <Group>
          <Avatar src={profile?.photoURL} size="lg" radius="xl">
            {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text fw={500}>{profile?.displayName || "No name set"}</Text>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
          </div>
        </Group>

        <Divider />

        <TextInput
          label="Display Name"
          placeholder="Enter your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          leftSection={<IconUser size={16} />}
        />

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
