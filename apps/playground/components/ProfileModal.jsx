/**
 * ProfileModal - User profile editor
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Avatar,
  Text,
  Alert,
} from "@mantine/core";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { SignOutButton } from "../../../framework/components/AuthProvider.jsx";
import { db } from "../../../framework/core/firebase-init.js";

export function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhotoURL(profile.photoURL || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          displayName: displayName.trim(),
          photoURL: photoURL.trim(),
          bio: bio.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
      onClose();
    } catch (err) {
      console.error("Failed to update profile:", err);
      setSaveError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Profile"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      zIndex={10000}
    >
      <Stack gap="md">
        {loading && <Text>Loading profile...</Text>}

        {profile && (
          <>
            <Group justify="center">
              <Avatar src={photoURL} alt="Profile" size="xl" radius="xl" />
            </Group>

            <TextInput
              label="Display Name"
              placeholder="Your Name"
              value={displayName}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
            />
            <TextInput
              label="Photo URL"
              placeholder="https://example.com/your-photo.jpg"
              value={photoURL}
              onChange={(event) => setPhotoURL(event.currentTarget.value)}
            />
            <Textarea
              label="Bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(event) => setBio(event.currentTarget.value)}
              autosize
              minRows={2}
            />

            {saveError && (
              <Alert color="red" title="Save Error">
                {saveError}
              </Alert>
            )}

            <Group justify="space-between" mt="md">
              <SignOutButton />
              <Button onClick={handleSave} loading={saveLoading}>
                Save Changes
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
