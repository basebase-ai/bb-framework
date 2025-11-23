/**
 * ProjectSettings - Modal for managing project settings and members
 */

import React, { useState, useMemo } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Paper,
  ActionIcon,
  Badge,
  Divider,
  Avatar,
} from "@mantine/core";
import { IconTrash, IconUserPlus } from "@tabler/icons-react";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { collections } from "../schema.js";

export function ProjectSettings({ projectId, opened, onClose }) {
  const { user } = useAuth();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // Get project data
  const {
    data: project,
    loading: projectLoading,
    update: updateProject,
  } = useDocument(collections.projects, projectId);

  // Get all users to look up emails (still needed for adding new members)
  const { data: allUsers } = useCollection(collections.users, {
    where: [["email", "!=", ""]],
  });

  // Use profiles hook to get detailed member data with avatars
  const { profiles: memberProfiles } = useUserProfiles(project?.memberIds || []);

  // Get member details with profile data
  const members = useMemo(() => {
    if (!project?.memberIds) return [];
    return project.memberIds
      .map((memberId) => {
        const profile = memberProfiles.get(memberId);
        return {
          id: memberId,
          email: profile?.email || "Unknown",
          displayName: profile?.displayName,
          photoURL: profile?.photoURL,
        };
      })
      .filter((m) => m.email !== "Unknown");
  }, [project?.memberIds, memberProfiles]);

  // Initialize project name when project loads
  React.useEffect(() => {
    if (project?.name && !projectName) {
      setProjectName(project.name);
    }
  }, [project?.name]);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !project) return;

    // Find user by email
    const userToAdd = allUsers.find(
      (u) => u.email.toLowerCase() === newMemberEmail.toLowerCase().trim()
    );

    if (!userToAdd) {
      alert("User not found. They need to sign up first.");
      return;
    }

    if (project.memberIds?.includes(userToAdd.id)) {
      alert("User is already a member of this project.");
      setNewMemberEmail("");
      return;
    }

    // Add user to memberIds
    await updateProject({
      memberIds: [...(project.memberIds || []), userToAdd.id],
    });

    setNewMemberEmail("");
  };

  const handleRemoveMember = async (memberId) => {
    if (!project) return;

    // Don't allow removing the owner
    if (memberId === project.owner) {
      alert("Cannot remove the project owner.");
      return;
    }

    // Don't allow removing yourself if you're not the owner
    if (memberId === user?.uid && user?.uid !== project.owner) {
      if (!confirm("Are you sure you want to leave this project?")) {
        return;
      }
    }

    await updateProject({
      memberIds: (project.memberIds || []).filter((id) => id !== memberId),
    });

    // If user removed themselves, close the modal
    if (memberId === user?.uid) {
      onClose();
    }
  };

  const handleSaveProjectName = async () => {
    if (!projectName.trim() || projectName === project?.name) {
      setProjectName(project?.name || "");
      setIsEditingName(false);
      return;
    }

    await updateProject({ name: projectName.trim() });
    setIsEditingName(false);
  };

  if (!project || projectLoading) {
    return (
      <Modal opened={opened} onClose={onClose} title="Project Settings" size="md">
        <Text c="dimmed">Loading...</Text>
      </Modal>
    );
  }

  const isOwner = user?.uid === project.owner;

  return (
    <Modal opened={opened} onClose={onClose} title="Project Settings" size="md">
      <Stack gap="lg">
        {/* Project Name */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Project Name
          </Text>
          {isEditingName ? (
            <Group gap="xs">
              <TextInput
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveProjectName();
                  if (e.key === "Escape") {
                    setProjectName(project.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <Button size="xs" onClick={handleSaveProjectName}>
                Save
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  setProjectName(project.name);
                  setIsEditingName(false);
                }}
              >
                Cancel
              </Button>
            </Group>
          ) : (
            <Group gap="xs">
              <Text size="lg">{project.name}</Text>
              {isOwner && (
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => setIsEditingName(true)}
                >
                  Edit
                </Button>
              )}
            </Group>
          )}
        </div>

        <Divider />

        {/* Members List */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Members ({members.length})
          </Text>
          <Stack gap="xs">
            {members.map((member) => (
              <Paper key={member.id} p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="sm">
                    <Avatar 
                      src={member.photoURL} 
                      alt={member.displayName || member.email}
                      size="md"
                      radius="xl"
                    />
                    <div>
                      <Group gap="xs">
                        <Text size="sm">
                          {member.displayName || member.email}
                        </Text>
                        {member.id === project.owner && (
                          <Badge size="xs" color="blue">
                            Owner
                          </Badge>
                        )}
                        {member.id === user?.uid && (
                          <Badge size="xs" color="gray" variant="light">
                            You
                          </Badge>
                        )}
                      </Group>
                      {member.displayName && (
                        <Text size="xs" c="dimmed">
                          {member.email}
                        </Text>
                      )}
                    </div>
                  </Group>
                  {(isOwner || member.id === user?.uid) &&
                    member.id !== project.owner && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveMember(member.id)}
                        title={
                          member.id === user?.uid
                            ? "Leave project"
                            : "Remove member"
                        }
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                </Group>
              </Paper>
            ))}
          </Stack>
        </div>

        {/* Add Member */}
        {isOwner && (
          <>
            <Divider />
            <div>
              <Text size="sm" fw={500} mb="xs">
                Add Member
              </Text>
              <Group gap="xs">
                <TextInput
                  placeholder="Enter email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMember();
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={<IconUserPlus size={16} />}
                  onClick={handleAddMember}
                  disabled={!newMemberEmail.trim()}
                >
                  Add
                </Button>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                User must have a Basebase account to be added.
              </Text>
            </div>
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

