/**
 * ProfileModal - User profile editor
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  PasswordInput,
  Button,
  Group,
  Text,
  Alert,
  Divider,
  Collapse,
  Box,
} from "@mantine/core";
import { IconUser, IconAlignLeft, IconLogout, IconLock, IconKey } from "@tabler/icons-react";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
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
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [success, setSuccess] = useState(false);
  
  // Password management state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(/** @type {string | null} */ (null));
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Detect auth providers
  const authInfo = useMemo(() => {
    if (!user) return { hasPassword: false, hasGoogle: false, providers: [] };
    const providers = user.providerData.map(p => p.providerId);
    return {
      hasPassword: providers.includes('password'),
      hasGoogle: providers.includes('google.com'),
      providers,
    };
  }, [user]);

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhotoURL(profile.photoURL || "");
      setBio(profile.bio || "");
    }
  }, [profile]);
  
  // Reset password fields when modal closes
  useEffect(() => {
    if (!opened) {
      setShowPasswordSection(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setPasswordSuccess(false);
    }
  }, [opened]);

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
  
  /**
   * Handle password change for users with existing password auth
   */
  const handleChangePassword = async () => {
    if (!user) return;
    
    // Validation
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    
    try {
      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(user.email || "", currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Auto-hide success after delay
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordSection(false);
      }, 2000);
    } catch (err) {
      console.error("Password change error:", err);
      const code = err instanceof Error && 'code' in err ? String(err.code) : '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError("Current password is incorrect");
      } else if (code === 'auth/weak-password') {
        setPasswordError("Password is too weak. Use at least 6 characters.");
      } else {
        setPasswordError(err instanceof Error ? err.message : "Failed to update password");
      }
    } finally {
      setPasswordSaving(false);
    }
  };
  
  /**
   * Handle setting a password for Google-only users
   * Requires re-auth with Google first, then links email/password credential
   */
  const handleSetPassword = async () => {
    if (!user || !user.email) return;
    
    // Validation
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    
    try {
      // Re-authenticate with Google popup first (required for security-sensitive operations)
      const googleProvider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, googleProvider);
      
      // Create email/password credential and link it
      const credential = EmailAuthProvider.credential(user.email, newPassword);
      await linkWithCredential(user, credential);
      
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      
      // Auto-hide success after delay
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordSection(false);
      }, 2000);
    } catch (err) {
      console.error("Set password error:", err);
      const code = err instanceof Error && 'code' in err ? String(err.code) : '';
      if (code === 'auth/popup-closed-by-user') {
        setPasswordError("Google sign-in was cancelled. Please try again.");
      } else if (code === 'auth/provider-already-linked') {
        setPasswordError("A password is already set for this account.");
      } else if (code === 'auth/weak-password') {
        setPasswordError("Password is too weak. Use at least 6 characters.");
      } else if (code === 'auth/requires-recent-login') {
        setPasswordError("Please sign out and sign back in, then try again.");
      } else {
        setPasswordError(err instanceof Error ? err.message : "Failed to set password");
      }
    } finally {
      setPasswordSaving(false);
    }
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

        <Divider />

        {/* Password Section */}
        <Box>
          <Button
            variant="subtle"
            leftSection={<IconLock size={16} />}
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            fullWidth
            justify="flex-start"
            c="dimmed"
          >
            {authInfo.hasPassword ? "Change Password" : "Set Password for CLI Access"}
          </Button>
          
          <Collapse in={showPasswordSection}>
            <Stack gap="sm" mt="md" p="md" style={{ background: 'var(--mantine-color-dark-6)', borderRadius: 8 }}>
              {!authInfo.hasPassword && (
                <Alert color="blue" icon={<IconKey size={16} />}>
                  <Text size="sm">
                    You signed in with Google. Set a password to use command-line tools like <code>npm run app:commit</code>.
                  </Text>
                </Alert>
              )}
              
              {authInfo.hasPassword && (
                <PasswordInput
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordSaving}
                />
              )}
              
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordSaving}
                description="Minimum 6 characters"
              />
              
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordSaving}
              />
              
              {passwordError && (
                <Alert color="red" title="Error">
                  {passwordError}
                </Alert>
              )}
              
              {passwordSuccess && (
                <Alert color="green" title="Success">
                  {authInfo.hasPassword ? "Password updated!" : "Password set! You can now use CLI tools."}
                </Alert>
              )}
              
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError(null);
                  }}
                  disabled={passwordSaving}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={authInfo.hasPassword ? handleChangePassword : handleSetPassword}
                  loading={passwordSaving}
                  disabled={!newPassword || !confirmPassword || (authInfo.hasPassword && !currentPassword)}
                  size="sm"
                >
                  {authInfo.hasPassword ? "Update Password" : "Set Password"}
                </Button>
              </Group>
            </Stack>
          </Collapse>
        </Box>

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

