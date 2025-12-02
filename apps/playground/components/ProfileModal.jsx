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
  Text,
  Alert,
  Divider,
} from "@mantine/core";
import { IconUser, IconAlignLeft, IconLogout } from "@tabler/icons-react";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { SignOutButton } from "../../../framework/components/AuthProvider.jsx";
import { EditImage } from "../../../framework/components/EditImage.jsx";
import { APP_ID } from "../schema.js";

export function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, loading, update } = useUserProfile(user?.uid);
  const { upload, uploading, progress } = useStorage(APP_ID);
  
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

  const handlePhotoUpload = async (file) => {
    try {
      // Upload to storage with user ID in path
      const path = `profile-photos/${user.uid}/${Date.now()}_${file.name}`;
      const result = await upload(file, path);
      
      // Set the download URL
      setPhotoURL(result.url);
      
      // Auto-save to profile
      await update({
        photoURL: result.url,
      });
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    }
  };

  const handlePhotoClear = async () => {
    try {
      // Clear the local state
      setPhotoURL("");
      
      // Auto-save to profile
      await update({
        photoURL: null,
      });
    } catch (err) {
      console.error('Error clearing photo:', err);
      setError('Failed to clear photo. Please try again.');
    }
  };

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
      <Modal 
        opened={opened} 
        onClose={onClose} 
        title="Edit Profile" 
        size="md"
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        zIndex={10000}
      >
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
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      zIndex={10000}
    >
      <Stack gap="lg">
        {/* Photo Upload */}
        <EditImage
          value={photoURL || profile?.photoURL}
          onChange={handlePhotoClear}
          onUpload={handlePhotoUpload}
          uploading={uploading}
          progress={progress}
          size={100}
          maxSize={5 * 1024 * 1024}
        />

        {/* Display Name */}
        <TextInput
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          leftSection={<IconUser size={16} />}
          required
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

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </Group>

        <Divider />

        {/* Sign Out */}
        <Group justify="center">
          <SignOutButton 
            variant="subtle" 
            color="red"
            leftSection={<IconLogout size={16} />}
          >
            Sign Out
          </SignOutButton>
        </Group>
      </Stack>
    </Modal>
  );
}

