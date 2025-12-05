/**
 * SharePanel - Share documents with other users
 */

import React, { useState, useCallback } from "react";
import {
  Stack,
  Group,
  Title,
  Text,
  Paper,
  TextInput,
  Button,
  ActionIcon,
  Avatar,
  Badge,
  Select,
  ScrollArea,
  Loader,
  Divider,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import {
  IconX,
  IconShare,
  IconUserPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconMail,
  IconLink,
} from "@tabler/icons-react";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * Permission level options
 */
const PERMISSION_OPTIONS = [
  { value: 'view', label: 'Can view' },
  { value: 'edit', label: 'Can edit' },
];

/**
 * Shared user row component
 * @param {{ 
 *   userId: string, 
 *   permission: string, 
 *   onChangePermission: (perm: string) => void,
 *   onRemove: () => void,
 *   isOwner: boolean,
 *   userEmail?: string 
 * }} props
 */
function SharedUserRow({ userId, permission, onChangePermission, onRemove, isOwner, userEmail }) {
  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Avatar size="sm" radius="xl">
            {(userEmail || userId)?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Stack gap={0}>
            <Text size="sm" lineClamp={1}>
              {userEmail || userId}
            </Text>
            {isOwner && (
              <Badge size="xs" color="blue" variant="light">
                Owner
              </Badge>
            )}
          </Stack>
        </Group>
        
        {!isOwner && (
          <Group gap="xs" wrap="nowrap">
            <Select
              size="xs"
              value={permission}
              onChange={onChangePermission}
              data={PERMISSION_OPTIONS}
              style={{ width: 100 }}
            />
            <ActionIcon 
              variant="subtle" 
              color="red" 
              size="sm"
              onClick={onRemove}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        )}
      </Group>
    </Paper>
  );
}

/**
 * SharePanel component
 * @param {{ documentId: string, document: Object, onClose: () => void }} props
 */
export function SharePanel({ documentId, document: doc, onClose }) {
  const { user } = useAuth();
  
  /** @type {[string, Function]} */
  const [email, setEmail] = useState('');
  
  /** @type {[string, Function]} */
  const [permission, setPermission] = useState('edit');
  
  /** @type {[boolean, Function]} */
  const [loading, setLoading] = useState(false);
  
  /** @type {[string | null, Function]} */
  const [error, setError] = useState(null);
  
  /** @type {[string | null, Function]} */
  const [success, setSuccess] = useState(null);

  // Get document for updates
  const { update: updateDoc } = useDocument(collections.documents, documentId);

  // Search for users by email
  const { data: allUsers } = useCollection('users', {
    limit: 100,
  });

  // Current shared users
  const sharedWith = doc?.sharedWith || [];
  const permissions = doc?.permissions || {};
  const isOwner = doc?.owner === user?.uid;

  /**
   * Add a user by email
   */
  const handleAddUser = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    if (!isOwner) {
      setError('Only the owner can share this document');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Find user by email
      const targetUser = allUsers.find(
        u => u.email?.toLowerCase() === email.toLowerCase().trim()
      );
      
      if (!targetUser) {
        setError('User not found. They need to sign up first.');
        return;
      }
      
      if (targetUser.id === user?.uid) {
        setError("You can't share with yourself");
        return;
      }
      
      if (sharedWith.includes(targetUser.id)) {
        setError('User already has access');
        return;
      }
      
      // Add user to shared list
      const newSharedWith = [...sharedWith, targetUser.id];
      const newPermissions = { ...permissions, [targetUser.id]: permission };
      
      await updateDoc({
        sharedWith: newSharedWith,
        permissions: newPermissions,
      });
      
      setEmail('');
      setSuccess(`Shared with ${targetUser.email}`);
    } catch (err) {
      console.error('Failed to share:', err);
      setError('Failed to share document');
    } finally {
      setLoading(false);
    }
  }, [email, permission, isOwner, allUsers, sharedWith, permissions, user?.uid, updateDoc]);

  /**
   * Update a user's permission
   */
  const handleChangePermission = useCallback(async (userId, newPermission) => {
    if (!isOwner) return;
    
    try {
      const newPermissions = { ...permissions, [userId]: newPermission };
      await updateDoc({ permissions: newPermissions });
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  }, [isOwner, permissions, updateDoc]);

  /**
   * Remove a user's access
   */
  const handleRemoveUser = useCallback(async (userId) => {
    if (!isOwner) return;
    
    try {
      const newSharedWith = sharedWith.filter(id => id !== userId);
      const newPermissions = { ...permissions };
      delete newPermissions[userId];
      
      await updateDoc({
        sharedWith: newSharedWith,
        permissions: newPermissions,
      });
    } catch (err) {
      console.error('Failed to remove user:', err);
    }
  }, [isOwner, sharedWith, permissions, updateDoc]);

  // Get user info for shared users
  const sharedUsersWithInfo = sharedWith.map(userId => {
    const userInfo = allUsers.find(u => u.id === userId);
    return {
      userId,
      email: userInfo?.email || userId,
      permission: permissions[userId] || 'view',
    };
  });

  // Generate share link
  const shareLink = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?doc=${documentId}`
    : '';

  return (
    <Paper 
      withBorder 
      p="md" 
      style={{ 
        width: 350, 
        height: '100%',
        borderLeft: '1px solid var(--mantine-color-gray-3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconShare size={20} />
          <Title order={5}>Share Document</Title>
        </Group>
        <ActionIcon variant="subtle" onClick={onClose}>
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md">
          {/* Add user form */}
          {isOwner && (
            <Paper p="sm" bg="gray.0" withBorder>
              <Stack gap="sm">
                <Text size="sm" fw={500}>Add people</Text>
                
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    placeholder="Enter email address"
                    leftSection={<IconMail size={14} />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddUser();
                      }
                    }}
                  />
                  <Select
                    size="sm"
                    value={permission}
                    onChange={setPermission}
                    data={PERMISSION_OPTIONS}
                    style={{ width: 100 }}
                  />
                </Group>
                
                <Button
                  leftSection={loading ? <Loader size={14} /> : <IconUserPlus size={14} />}
                  onClick={handleAddUser}
                  disabled={loading || !email.trim()}
                  size="sm"
                >
                  Add
                </Button>
                
                {error && (
                  <Text size="xs" c="red">{error}</Text>
                )}
                
                {success && (
                  <Text size="xs" c="green">{success}</Text>
                )}
              </Stack>
            </Paper>
          )}

          <Divider />

          {/* People with access */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>People with access</Text>
            
            {/* Owner */}
            <SharedUserRow
              userId={doc?.owner}
              userEmail={allUsers.find(u => u.id === doc?.owner)?.email || doc?.owner}
              permission="owner"
              isOwner={true}
              onChangePermission={() => {}}
              onRemove={() => {}}
            />
            
            {/* Shared users */}
            {sharedUsersWithInfo.map(({ userId, email, permission }) => (
              <SharedUserRow
                key={userId}
                userId={userId}
                userEmail={email}
                permission={permission}
                isOwner={false}
                onChangePermission={(perm) => handleChangePermission(userId, perm)}
                onRemove={() => handleRemoveUser(userId)}
              />
            ))}
            
            {sharedWith.length === 0 && (
              <Text size="sm" c="dimmed">
                No one else has access yet
              </Text>
            )}
          </Stack>

          <Divider />

          {/* Copy link */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>Get link</Text>
            <Text size="xs" c="dimmed">
              Anyone with access can use this link to open the document
            </Text>
            
            <Group gap="xs" wrap="nowrap">
              <TextInput
                value={shareLink}
                readOnly
                leftSection={<IconLink size={14} />}
                style={{ flex: 1 }}
                styles={{
                  input: {
                    fontSize: 12,
                  },
                }}
              />
              <CopyButton value={shareLink}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                    <ActionIcon 
                      color={copied ? 'green' : 'gray'} 
                      variant="subtle"
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Stack>
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
