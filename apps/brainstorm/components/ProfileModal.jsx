/**
 * ProfileModal - User profile editor
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Avatar,
  Text,
  Alert,
  Divider,
} from "@mantine/core";
import { IconUser, IconPhoto, IconAlignLeft } from "@tabler/icons-react";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { SignOutButton } from "../../../framework/components/AuthProvider.jsx";

export function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, loading, update } = useUserProfile(user?.uid);
  
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhotoURL(profile.photoURL || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await update({
        displayName: displayName.trim() || user?.email?.split('@')[0] || 'User',
        photoURL: photoURL.trim() || null,
        bio: bio.trim() || null,
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current profile data
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhotoURL(profile.photoURL || "");
      setBio(profile.bio || "");
    }
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (loading && !profile) {
    return (
      <Modal opened={opened} onClose={onClose} title="Edit Profile" size="md">
        <Text c="dimmed">Loading...</Text>
      </Modal>
    );
  }

  return (
    <Modal 
      opened={opened} 
      onClose={handleCancel} 
      title="Edit Profile" 
      size="md"
      zIndex={10000}
    >
      <Stack gap="lg">
        {/* Avatar Preview */}
        <Group justify="center">
          <Avatar 
            src={photoURL || profile?.photoURL} 
            alt={displayName || profile?.displayName}
            size={100}
            radius="xl"
          />
        </Group>

        {/* Display Name */}
        <TextInput
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          leftSection={<IconUser size={16} />}
          required
        />

        {/* Photo URL */}
        <TextInput
          label="Photo URL"
          placeholder="https://example.com/photo.jpg"
          value={photoURL}
          onChange={(e) => setPhotoURL(e.target.value)}
          leftSection={<IconPhoto size={16} />}
          description="Enter a direct link to your profile picture"
        />

        {/* Bio */}
        <Textarea
          label="Bio"
          placeholder="Tell us about yourself..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          leftSection={<IconAlignLeft size={16} />}
          minRows={3}
          maxRows={6}
          description="Optional short bio or description"
        />

        {/* Email (read-only) */}
        <TextInput
          label="Email"
          value={user?.email || ""}
          disabled
          description="Email cannot be changed here"
        />

        {/* Success Message */}
        {success && (
          <Alert color="green" title="Success">
            Profile updated successfully!
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        <Divider />

        {/* Actions */}
        <Group justify="space-between">
          <SignOutButton variant="subtle" color="red" />
          <Group>
            <Button variant="default" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

