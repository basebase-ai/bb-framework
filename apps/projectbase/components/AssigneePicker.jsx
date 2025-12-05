/**
 * AssigneePicker - Autosuggest dropdown for selecting task assignee
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Popover,
  TextInput,
  Stack,
  Group,
  Avatar,
  Text,
  UnstyledButton,
  ActionIcon,
  ScrollArea,
} from "@mantine/core";
import { IconX, IconUser } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} [displayName]
 * @property {string} [photoURL]
 */

/**
 * @typedef {Object} AssigneePickerProps
 * @property {string | null} value - Current assignee user ID or null
 * @property {(userId: string | null) => void} onChange - Callback when assignee changes
 * @property {boolean} [compact] - Whether to show compact view (just avatar)
 */

/**
 * Gets display name for a user, with fallback to email
 * @param {User} user
 * @returns {string}
 */
function getUserDisplayName(user) {
  return user.displayName?.trim() || user.email || "Unknown";
}

/**
 * Gets the avatar initial for a user
 * @param {User} user
 * @returns {string}
 */
function getUserInitial(user) {
  const name = user.displayName?.trim() || user.email || "";
  return name.charAt(0).toUpperCase() || "?";
}

/**
 * Displays a user row in the dropdown
 */
function UserOption({ user, onClick, isSelected }) {
  const displayName = getUserDisplayName(user);
  const hasDisplayName = Boolean(user.displayName?.trim());
  const photoURL = user.photoURL?.trim() || undefined;

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 12px",
        borderRadius: "4px",
        backgroundColor: isSelected ? "var(--mantine-color-blue-light)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-light)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected 
          ? "var(--mantine-color-blue-light)" 
          : "transparent";
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Avatar src={photoURL} size="sm" radius="xl">
          {getUserInitial(user)}
        </Avatar>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Text size="sm" truncate>
            {displayName}
          </Text>
          {hasDisplayName && (
            <Text size="xs" c="dimmed" truncate>
              {user.email}
            </Text>
          )}
        </div>
      </Group>
    </UnstyledButton>
  );
}

/**
 * AssigneePicker component
 */
export function AssigneePicker({ value, onChange, compact = false }) {
  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);
  const { user: currentUser } = useAuth();

  // Fetch all user IDs from the users collection
  const { data: usersData, loading: usersLoading } = useCollection(collections.users, {
    realtime: true,
  });

  // Extract user IDs for the profiles hook (include current value and current user to ensure we have their profiles)
  const userIds = useMemo(() => {
    const ids = usersData.map((u) => u.id);
    if (value && !ids.includes(value)) {
      ids.push(value);
    }
    if (currentUser?.uid && !ids.includes(currentUser.uid)) {
      ids.push(currentUser.uid);
    }
    return ids;
  }, [usersData, value, currentUser?.uid]);

  // Fetch full profiles using the useUserProfiles hook
  const { profiles, loading: profilesLoading } = useUserProfiles(userIds);

  const loading = usersLoading || profilesLoading;

  // Convert profiles Map to array for filtering/display
  const users = useMemo(() => {
    return Array.from(profiles.values());
  }, [profiles]);

  // Find the currently assigned user
  const assignedUser = useMemo(() => {
    if (!value) return null;
    return profiles.get(value) || null;
  }, [value, profiles]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Focus input when popover opens
  useEffect(() => {
    if (opened && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [opened]);

  const handleSelect = (userId) => {
    onChange(userId);
    setOpened(false);
    setSearchQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  // Render the trigger button
  const renderTrigger = () => {
    const photoURL = assignedUser?.photoURL?.trim() || undefined;
    const displayName = assignedUser ? getUserDisplayName(assignedUser) : null;
    const initial = assignedUser ? getUserInitial(assignedUser) : null;

    if (compact) {
      return (
        <UnstyledButton onClick={() => setOpened(true)}>
          {assignedUser ? (
            <Avatar src={photoURL} size="sm" radius="xl">
              {initial}
            </Avatar>
          ) : (
            <Avatar size="sm" radius="xl" color="gray">
              <IconUser size={14} />
            </Avatar>
          )}
        </UnstyledButton>
      );
    }

    return (
      <UnstyledButton
        onClick={() => setOpened(true)}
        style={{
          display: "block",
          width: "100%",
          padding: "4px 8px",
          borderRadius: "4px",
          minHeight: "32px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-light)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Group gap="xs" wrap="nowrap" justify="space-between">
          {assignedUser ? (
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, overflow: "hidden" }}>
              <Avatar src={photoURL} size="sm" radius="xl">
                {initial}
              </Avatar>
              <Text size="sm" truncate>
                {displayName}
              </Text>
            </Group>
          ) : (
            <Group gap="xs" wrap="nowrap">
              <Avatar size="sm" radius="xl" color="gray">
                <IconUser size={14} />
              </Avatar>
              <Text size="sm" c="dimmed">
                Unassigned
              </Text>
            </Group>
          )}
          {assignedUser && (
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={handleClear}
              style={{ flexShrink: 0 }}
            >
              <IconX size={12} />
            </ActionIcon>
          )}
        </Group>
      </UnstyledButton>
    );
  };

  return (
    <Popover
      opened={opened}
      onClose={() => {
        setOpened(false);
        setSearchQuery("");
      }}
      position="bottom-start"
      width={280}
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        {renderTrigger()}
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <Stack gap="xs">
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            size="sm"
          />

          <ScrollArea.Autosize mah={200}>
            {loading ? (
              <Text size="sm" c="dimmed" ta="center" py="sm">
                Loading users...
              </Text>
            ) : filteredUsers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="sm">
                No users found
              </Text>
            ) : (
              <Stack gap={4}>
                {/* Assign to Me option */}
                {currentUser && (
                  <UnstyledButton
                    onClick={() => handleSelect(currentUser.uid)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      backgroundColor: value === currentUser.uid ? "var(--mantine-color-blue-light)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (value !== currentUser.uid) {
                        e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-light)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = value === currentUser.uid 
                        ? "var(--mantine-color-blue-light)" 
                        : "transparent";
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar src={currentUser.photoURL || undefined} size="sm" radius="xl" color="blue">
                        {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || "?"}
                      </Avatar>
                      <Text size="sm" fw={500}>
                        Assign to Me
                      </Text>
                    </Group>
                  </UnstyledButton>
                )}

                {/* Unassign option */}
                <UnstyledButton
                  onClick={() => handleSelect(null)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    backgroundColor: value === null ? "var(--mantine-color-blue-light)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (value !== null) {
                      e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-light)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = value === null 
                      ? "var(--mantine-color-blue-light)" 
                      : "transparent";
                  }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Avatar size="sm" radius="xl" color="gray">
                      <IconX size={14} />
                    </Avatar>
                    <Text size="sm" c="dimmed">
                      Unassigned
                    </Text>
                  </Group>
                </UnstyledButton>

                {/* User options */}
                {filteredUsers.map((user) => (
                  <UserOption
                    key={user.id}
                    user={user}
                    onClick={() => handleSelect(user.id)}
                    isSelected={value === user.id}
                  />
                ))}
              </Stack>
            )}
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

