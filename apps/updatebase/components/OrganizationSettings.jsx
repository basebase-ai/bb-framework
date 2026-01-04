/**
 * OrganizationSettings - Manage organization details and team members
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
  Alert,
  Table,
  Badge,
  ActionIcon,
  Divider,
  Avatar,
  Popover,
  ScrollArea,
  UnstyledButton,
  Menu,
  Tabs,
} from "@mantine/core";
import {
  IconUserPlus,
  IconTrash,
  IconMail,
  IconBuilding,
  IconSearch,
  IconCrown,
  IconShield,
  IconUser,
  IconDots,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, MEMBER_ROLE_OPTIONS } from "../schema.js";

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string | null} description
 * @property {string | null} slug
 * @property {string} createdBy
 */

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} orgId
 * @property {string} email
 * @property {string | null} userId
 * @property {string | null} displayName
 * @property {string | null} photoURL
 * @property {'owner' | 'admin' | 'member'} role
 * @property {'invited' | 'active'} status
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string | undefined} displayName
 * @property {string | undefined} photoURL
 */

/**
 * Gets display name for a user, with fallback to email
 * @param {{ displayName?: string | null, email?: string | null }} user
 * @returns {string}
 */
function getUserDisplayName(user) {
  return user.displayName?.trim() || user.email || "Unknown";
}

/**
 * Gets the avatar initial for a user
 * @param {{ displayName?: string | null, email?: string | null }} user
 * @returns {string}
 */
function getUserInitial(user) {
  const name = user.displayName?.trim() || user.email || "";
  return name.charAt(0).toUpperCase() || "?";
}

/**
 * Get role icon
 * @param {'owner' | 'admin' | 'member'} role
 */
function getRoleIcon(role) {
  switch (role) {
    case "owner":
      return <IconCrown size={14} />;
    case "admin":
      return <IconShield size={14} />;
    default:
      return <IconUser size={14} />;
  }
}

/**
 * Get role color
 * @param {'owner' | 'admin' | 'member'} role
 */
function getRoleColor(role) {
  switch (role) {
    case "owner":
      return "yellow";
    case "admin":
      return "blue";
    default:
      return "gray";
  }
}

/**
 * User search popover for adding team members
 */
function UserSearchPopover({ onSelect, existingEmails, orgId }) {
  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);
  const { user: currentUser } = useAuth();

  // Fetch all users
  const { data: usersData, loading: usersLoading } = useCollection(collections.users, {
    realtime: true,
  });

  // Get user profiles
  const userIds = useMemo(() => usersData.map((u) => u.id), [usersData]);
  const { profiles, loading: profilesLoading } = useUserProfiles(userIds);

  const loading = usersLoading || profilesLoading;

  /** @type {User[]} */
  const users = useMemo(() => Array.from(profiles.values()), [profiles]);

  // Filter users
  /** @type {User[]} */
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return users
      .filter((user) => {
        // Exclude current user
        if (user.id === currentUser?.uid) return false;
        // Exclude already added members
        if (existingEmails.has(user.email?.toLowerCase())) return false;

        if (!query) return true;

        return (
          user.displayName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
        );
      })
      .slice(0, 10);
  }, [users, searchQuery, currentUser?.uid, existingEmails]);

  useEffect(() => {
    if (opened && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [opened]);

  const handleSelect = (user) => {
    onSelect(user);
    setOpened(false);
    setSearchQuery("");
  };

  return (
    <Popover
      opened={opened}
      onClose={() => {
        setOpened(false);
        setSearchQuery("");
      }}
      position="bottom-start"
      width={350}
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setOpened(true)}>
          Add Team Member
        </Button>
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <Stack gap="xs">
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            leftSection={<IconSearch size={16} />}
            size="sm"
          />

          <ScrollArea.Autosize mah={250}>
            {loading ? (
              <Text size="sm" c="dimmed" ta="center" py="sm">
                Loading...
              </Text>
            ) : filteredUsers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="sm">
                {searchQuery ? "No users found" : "No users available"}
              </Text>
            ) : (
              <Stack gap={4}>
                {filteredUsers.map((user) => (
                  <UnstyledButton
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-light)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar src={user.photoURL} size="sm" radius="xl">
                        {getUserInitial(user)}
                      </Avatar>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <Text size="sm" truncate>
                          {getUserDisplayName(user)}
                        </Text>
                        {user.displayName && (
                          <Text size="xs" c="dimmed" truncate>
                            {user.email}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            )}
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * @param {{ opened: boolean, onClose: () => void, organization: Organization, isOwner: boolean }} props
 */
export function OrganizationSettings({ opened, onClose, organization, isOwner }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [success, setSuccess] = useState(/** @type {string | null} */ (null));

  const { update: updateOrg } = useCollection(collections.organizations);

  // Get members for this organization
  const membersQuery = useMemo(
    () => (organization ? { where: [["orgId", "==", organization.id]] } : undefined),
    [organization?.id]
  );
  const { data: members } = useCollection(collections.members, membersQuery);

  // Get user profiles for members
  const memberUserIds = useMemo(
    () => members?.filter((m) => m.userId).map((m) => m.userId) || [],
    [members]
  );
  const { profiles } = useUserProfiles(memberUserIds);

  // Set of existing member emails
  const existingEmails = useMemo(
    () => new Set(members?.map((m) => m.email.toLowerCase()) || []),
    [members]
  );

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
      setOrgDescription(organization.description || "");
    }
  }, [organization]);

  const handleSaveDetails = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateOrg(organization.id, {
        name: orgName.trim(),
        description: orgDescription.trim() || null,
      });
      setSuccess("Organization updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating organization:", err);
      setError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (/** @type {User} */ selectedUser) => {
    if (!organization || !user) return;

    try {
      const email = selectedUser.email.toLowerCase();
      const memberId = `${organization.id}_${email}`;

      await setDoc(doc(db, collections.members, memberId), {
        orgId: organization.id,
        email,
        userId: selectedUser.id,
        displayName: selectedUser.displayName || null,
        photoURL: selectedUser.photoURL || null,
        role: "member",
        status: "active",
        invitedAt: serverTimestamp(),
        invitedBy: user.uid,
        joinedAt: serverTimestamp(),
      });

      setSuccess(`Added ${selectedUser.displayName || email} to the team`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding member:", err);
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const handleChangeRole = async (/** @type {Member} */ member, /** @type {'admin' | 'member'} */ newRole) => {
    try {
      await setDoc(
        doc(db, collections.members, member.id),
        { role: newRole },
        { merge: true }
      );
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemoveMember = async (/** @type {Member} */ member) => {
    if (member.role === "owner") {
      setError("Cannot remove the organization owner");
      return;
    }

    if (!confirm(`Remove ${member.displayName || member.email} from the team?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, collections.members, member.id));
    } catch (err) {
      console.error("Error removing member:", err);
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  // Sort members: owner first, then by role, then by name
  const sortedMembers = useMemo(() => {
    return [...(members || [])].sort((a, b) => {
      const roleOrder = { owner: 0, admin: 1, member: 2 };
      const aOrder = roleOrder[a.role] ?? 3;
      const bOrder = roleOrder[b.role] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "");
    });
  }, [members]);

  if (!organization) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Organization Settings"
      size="lg"
      zIndex={10000}
    >
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || "details")}>
        <Tabs.List mb="md">
          <Tabs.Tab value="details" leftSection={<IconSettings size={16} />}>
            Details
          </Tabs.Tab>
          <Tabs.Tab value="team" leftSection={<IconUsers size={16} />}>
            Team ({members?.length || 0})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="details">
          <Stack gap="md">
            <TextInput
              label="Organization Name"
              placeholder="Your startup name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              leftSection={<IconBuilding size={16} />}
              disabled={!isOwner || saving}
              required
            />

            <Textarea
              label="Description"
              placeholder="What does your startup do?"
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              disabled={!isOwner || saving}
              minRows={3}
            />

            {success && (
              <Alert color="green" withCloseButton onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {error && (
              <Alert color="red" withCloseButton onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {isOwner && (
              <Group justify="flex-end">
                <Button onClick={handleSaveDetails} loading={saving}>
                  Save Changes
                </Button>
              </Group>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="team">
          <Stack gap="md">
            {isOwner && (
              <Group justify="flex-end">
                <UserSearchPopover
                  onSelect={handleAddMember}
                  existingEmails={existingEmails}
                  orgId={organization.id}
                />
              </Group>
            )}

            {success && (
              <Alert color="green" withCloseButton onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {error && (
              <Alert color="red" withCloseButton onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Member</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  {isOwner && <Table.Th w={60}></Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedMembers.map((member) => {
                  const memberProfile = member.userId ? profiles.get(member.userId) : null;
                  const displayName = memberProfile?.displayName || member.displayName;
                  const photoURL = memberProfile?.photoURL || member.photoURL;

                  return (
                    <Table.Tr key={member.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar src={photoURL} size="sm" radius="xl">
                            {getUserInitial({ displayName, email: member.email })}
                          </Avatar>
                          <Text size="sm" fw={500}>
                            {displayName || member.email?.split("@")[0]}
                            {member.userId === user?.uid && (
                              <Text span size="xs" c="dimmed" ml={4}>
                                (you)
                              </Text>
                            )}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{member.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getRoleColor(member.role)}
                          size="sm"
                          variant="light"
                          leftSection={getRoleIcon(member.role)}
                        >
                          {member.role}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={member.status === "active" ? "green" : "yellow"}
                          size="sm"
                          variant="light"
                        >
                          {member.status}
                        </Badge>
                      </Table.Td>
                      {isOwner && (
                        <Table.Td>
                          {member.role !== "owner" && (
                            <Menu position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Label>Change Role</Menu.Label>
                                <Menu.Item
                                  leftSection={<IconShield size={14} />}
                                  onClick={() => handleChangeRole(member, "admin")}
                                  disabled={member.role === "admin"}
                                >
                                  Make Admin
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconUser size={14} />}
                                  onClick={() => handleChangeRole(member, "member")}
                                  disabled={member.role === "member"}
                                >
                                  Make Member
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  Remove from Team
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          )}
                        </Table.Td>
                      )}
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Divider my="md" />

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
}


