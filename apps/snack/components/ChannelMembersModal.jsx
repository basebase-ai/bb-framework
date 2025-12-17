/**
 * ChannelMembersModal - Manage channel members
 */

import React, { useState, useMemo } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Avatar,
  Paper,
  ActionIcon,
  Badge,
  Loader,
  Center,
  Alert,
  Divider,
} from "@mantine/core";
import {
  IconSearch,
  IconUserPlus,
  IconTrash,
  IconCrown,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { collections } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} channelId
 * @property {string} userId
 * @property {string | undefined} displayName
 * @property {string | undefined} photoURL
 * @property {'owner' | 'admin' | 'member'} role
 * @property {Object | null} joinedAt
 */

export function ChannelMembersModal() {
  const { user } = useAuth();
  const { membersModalOpen, closeMembersModal, selectedChannelId } =
    useAppStore();
  const [searchEmail, setSearchEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  // Fetch channel
  const { data: allChannels, update: updateChannel } = useCollection(
    collections.channels
  );
  const channel = useMemo(() => {
    return allChannels.find((c) => c.id === selectedChannelId);
  }, [allChannels, selectedChannelId]);

  // Fetch members
  const membersWhere = useMemo(() => {
    return selectedChannelId
      ? [["channelId", "==", selectedChannelId]]
      : [["channelId", "==", "__none__"]];
  }, [selectedChannelId]);

  const {
    data: membersData,
    loading,
    add: addMember,
    remove: removeMember,
  } = useCollection(collections.members, {
    where: membersWhere,
  });

  // Get user profiles for members
  const memberUserIds = useMemo(() => {
    return membersData.map((m) => m.userId);
  }, [membersData]);

  const { profiles } = useUserProfiles(memberUserIds);

  // Check if current user is owner/admin
  const currentUserMembership = useMemo(() => {
    return membersData.find((m) => m.userId === user?.uid);
  }, [membersData, user?.uid]);

  const canManageMembers =
    currentUserMembership?.role === "owner" ||
    currentUserMembership?.role === "admin";

  // Sort members: owner first, then admin, then member
  /** @type {Member[]} */
  const sortedMembers = useMemo(() => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return [...membersData].sort((a, b) => {
      return (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2);
    });
  }, [membersData]);

  // Fetch all users for invite search
  const { data: allUsers } = useCollection("users");

  // Filter users for invite (not already members)
  const availableUsers = useMemo(() => {
    const memberIds = new Set(membersData.map((m) => m.userId));
    const search = searchEmail.toLowerCase();
    return allUsers
      .filter((u) => !memberIds.has(u.id))
      .filter(
        (u) =>
          u.email?.toLowerCase().includes(search) ||
          u.displayName?.toLowerCase().includes(search)
      )
      .slice(0, 5);
  }, [allUsers, membersData, searchEmail]);

  const handleInvite = async (/** @type {{ id: string, email?: string, displayName?: string, photoURL?: string }} */ inviteUser) => {
    if (!channel) return;

    setInviting(true);
    setError(null);

    try {
      await addMember({
        channelId: channel.id,
        userId: inviteUser.id,
        displayName: inviteUser.displayName || inviteUser.email || "User",
        photoURL: inviteUser.photoURL || null,
        role: "member",
      });

      // Update channel member count
      await updateChannel(channel.id, {
        memberCount: (channel.memberCount || 0) + 1,
      });

      setSearchEmail("");
    } catch (err) {
      console.error("Failed to invite member:", err);
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (/** @type {Member} */ member) => {
    if (!channel || !canManageMembers) return;
    if (member.role === "owner") {
      setError("Cannot remove the channel owner");
      return;
    }

    if (!confirm(`Remove ${member.displayName || "this member"} from the channel?`))
      return;

    try {
      await removeMember(member.id);

      // Update channel member count
      await updateChannel(channel.id, {
        memberCount: Math.max((channel.memberCount || 1) - 1, 0),
      });
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleClose = () => {
    setSearchEmail("");
    setError(null);
    closeMembersModal();
  };

  const getRoleBadge = (/** @type {string} */ role) => {
    switch (role) {
      case "owner":
        return (
          <Badge color="yellow" size="xs" leftSection={<IconCrown size={10} />}>
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge color="blue" size="xs">
            Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      opened={membersModalOpen}
      onClose={handleClose}
      title={channel ? `#${channel.name} Members` : "Channel Members"}
      size="md"
      zIndex={10000}
    >
      <Stack gap="md">
        {/* Invite Section */}
        {canManageMembers && (
          <>
            <div>
              <Text size="sm" fw={500} mb={4}>
                Invite members
              </Text>
              <TextInput
                placeholder="Search by name or email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                leftSection={<IconSearch size={16} />}
              />
            </div>

            {/* Search Results */}
            {searchEmail && availableUsers.length > 0 && (
              <Stack gap="xs">
                {availableUsers.map((u) => (
                  <Paper key={u.id} p="xs" withBorder>
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar
                          src={u.photoURL}
                          alt={u.displayName || u.email}
                          size="sm"
                          radius="xl"
                        />
                        <div>
                          <Text size="sm" fw={500}>
                            {u.displayName || "User"}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {u.email}
                          </Text>
                        </div>
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconUserPlus size={14} />}
                        onClick={() => handleInvite(u)}
                        loading={inviting}
                      >
                        Invite
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}

            {searchEmail && availableUsers.length === 0 && (
              <Text size="sm" c="dimmed" ta="center">
                No users found
              </Text>
            )}

            <Divider />
          </>
        )}

        {/* Members List */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Members ({sortedMembers.length})
          </Text>

          {loading ? (
            <Center py="md">
              <Loader size="sm" />
            </Center>
          ) : (
            <Stack gap="xs">
              {sortedMembers.map((member) => {
                const memberProfile = profiles.get(member.userId);
                const displayName =
                  memberProfile?.displayName ||
                  member.displayName ||
                  "Anonymous";
                const photoURL =
                  memberProfile?.photoURL || member.photoURL || null;

                return (
                  <Paper key={member.id} p="xs" withBorder>
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar
                          src={photoURL}
                          alt={displayName}
                          size="sm"
                          radius="xl"
                        />
                        <div>
                          <Group gap="xs">
                            <Text size="sm" fw={500}>
                              {displayName}
                            </Text>
                            {getRoleBadge(member.role)}
                          </Group>
                          <Text size="xs" c="dimmed">
                            Joined{" "}
                            {member.joinedAt?.toDate
                              ? new Date(
                                  member.joinedAt.toDate()
                                ).toLocaleDateString()
                              : "recently"}
                          </Text>
                        </div>
                      </Group>
                      {canManageMembers && member.role !== "owner" && (
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleRemoveMember(member)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
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

        {/* Close Button */}
        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


