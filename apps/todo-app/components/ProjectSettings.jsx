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
  Autocomplete,
  Loader,
  Alert,
} from "@mantine/core";
import { IconTrash, IconUserPlus, IconAlertCircle, IconLogout } from "@tabler/icons-react";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { collections } from "../schema.js";
import { InvitationModal } from "./InvitationModal.jsx";
import { CustomFieldsManager } from "./CustomFieldsManager.jsx";

export function ProjectSettings({ projectId, opened, onClose }) {
  const { user } = useAuth();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [invitationModalOpened, setInvitationModalOpened] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Get project data
  const {
    data: project,
    loading: projectLoading,
    update: updateProject,
    remove: deleteProject,
  } = useDocument(collections.projects, projectId);

  // Get all users to look up emails (for searching and adding new members)
  const usersWhereClause = useMemo(() => [["email", "!=", ""]], []);
  const { data: allUsers } = useCollection(collections.users, {
    where: usersWhereClause,
  });

  // Use profiles hook to get detailed member data with avatars
  const { profiles: memberProfiles } = useUserProfiles(project?.memberIds || []);
  
  // Get current user's profile for invitation message
  const currentUserProfile = memberProfiles.get(user?.uid);

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

  // Create autocomplete data for user search
  const userAutocompleteData = useMemo(() => {
    if (!allUsers) return [];
    
    // Filter out members and deduplicate by email
    const seenEmails = new Set();
    return allUsers
      .filter((u) => !project?.memberIds?.includes(u.id))
      .filter((u) => {
        if (seenEmails.has(u.email)) {
          return false;
        }
        seenEmails.add(u.email);
        return true;
      })
      .map((u) => ({
        value: u.email,
        label: u.displayName ? `${u.displayName} (${u.email})` : u.email,
        userId: u.id,
      }));
  }, [allUsers, project?.memberIds]);

  // Initialize project name when project loads
  React.useEffect(() => {
    if (project?.name && !projectName) {
      setProjectName(project.name);
    }
  }, [project?.name]);

  const handleUpdateCustomFields = async (newCustomFields) => {
    await updateProject({ customFields: newCustomFields });
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !project) return;

    setAddingMember(true);

    try {
      // Find user by email
      const userToAdd = allUsers.find(
        (u) => u.email.toLowerCase() === newMemberEmail.toLowerCase().trim()
      );

      if (userToAdd) {
        // User exists - add them to the project
        if (project.memberIds?.includes(userToAdd.id)) {
          alert("User is already a member of this project.");
          setNewMemberEmail("");
          setAddingMember(false);
          return;
        }

        await updateProject({
          memberIds: [...(project.memberIds || []), userToAdd.id],
        });

        setNewMemberEmail("");
      } else {
        // User doesn't exist - create a placeholder user doc and send invitation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newMemberEmail.trim())) {
          alert("Please enter a valid email address.");
          setAddingMember(false);
          return;
        }

        // Create a user document with a deterministic ID based on email
        const newUserId = `pending_${newMemberEmail.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        
        // Check if this pending user already exists
        const existingPendingUser = allUsers.find(u => u.id === newUserId);
        
        if (existingPendingUser) {
          if (project.memberIds?.includes(existingPendingUser.id)) {
            alert("This user has already been invited to the project.");
            setNewMemberEmail("");
            setAddingMember(false);
            return;
          }
          
          // Add existing pending user to project
          await updateProject({
            memberIds: [...(project.memberIds || []), existingPendingUser.id],
          });
        } else {
          // Create new pending user document
          const userRef = doc(db, collections.users, newUserId);
          await setDoc(userRef, {
            email: newMemberEmail.toLowerCase().trim(),
            displayName: "",
            photoURL: "",
            role: "user",
            status: "pending_invitation",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Add to project
          await updateProject({
            memberIds: [...(project.memberIds || []), newUserId],
          });

          // Show invitation modal
          setInvitationDetails({
            projectName: project.name,
            inviterName: currentUserProfile?.displayName || currentUserProfile?.email || user.email,
            inviteeEmail: newMemberEmail.toLowerCase().trim(),
          });
          setInvitationModalOpened(true);
        }

        setNewMemberEmail("");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
      alert(`Failed to add member: ${error.message}`);
    } finally {
      setAddingMember(false);
    }
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

  const handleLeaveProject = async () => {
    if (!project || !user?.uid) return;

    if (!confirm(`Are you sure you want to leave "${project.name}"? You'll need to be re-invited to access it again.`)) {
      return;
    }

    await updateProject({
      memberIds: (project.memberIds || []).filter((id) => id !== user.uid),
    });

    onClose();
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    const confirmText = `Are you sure you want to DELETE "${project.name}"? This will permanently delete the project and all its tasks. This action cannot be undone.`;
    
    if (!confirm(confirmText)) {
      return;
    }

    // Double confirmation for safety
    const doubleConfirm = prompt(`Type "${project.name}" to confirm deletion:`);
    if (doubleConfirm !== project.name) {
      alert("Project name doesn't match. Deletion cancelled.");
      return;
    }

    setDeletingProject(true);
    try {
      await deleteProject();
      onClose();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert(`Failed to delete project: ${error.message}`);
    } finally {
      setDeletingProject(false);
    }
  };

  if (!project || projectLoading) {
    return (
      <Modal opened={opened} onClose={onClose} title="Project Settings" size="md">
        <Text c="dimmed">Loading...</Text>
      </Modal>
    );
  }

  const isOwner = user?.uid === project.owner;
  const ownerProfile = memberProfiles.get(project.owner);
  const ownerName = ownerProfile?.displayName || ownerProfile?.email || "the project owner";

  return (
    <>
      {/* Invitation Modal */}
      {invitationDetails && (
        <InvitationModal
          opened={invitationModalOpened}
          onClose={() => {
            setInvitationModalOpened(false);
            setInvitationDetails(null);
          }}
          projectName={invitationDetails.projectName}
          inviterName={invitationDetails.inviterName}
          inviteeEmail={invitationDetails.inviteeEmail}
        />
      )}

      <Modal opened={opened} onClose={onClose} title="Project Settings" size="md">
        <Stack gap="lg">
          {/* Non-owner warning */}
          {!isOwner && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="View Only"
              color="yellow"
              variant="light"
            >
              You are not the owner of this project. Please contact {ownerName} to make changes to the project settings or member list.
            </Alert>
          )}
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

        {/* Custom Fields */}
        {isOwner && (
          <>
            <CustomFieldsManager
              customFields={project.customFields || []}
              onChange={handleUpdateCustomFields}
            />
            <Divider />
          </>
        )}

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
              <Group gap="xs" align="flex-start">
                <Autocomplete
                  placeholder="Search by name or email, or enter new email"
                  value={newMemberEmail}
                  onChange={setNewMemberEmail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMember();
                  }}
                  data={userAutocompleteData}
                  limit={5}
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={addingMember ? <Loader size={16} /> : <IconUserPlus size={16} />}
                  onClick={handleAddMember}
                  disabled={!newMemberEmail.trim() || addingMember}
                  loading={addingMember}
                >
                  Add
                </Button>
              </Group>
              <Stack gap="xs" mt="xs">
                <Text size="xs" c="dimmed">
                  • Search for existing users by name or email
                </Text>
                <Text size="xs" c="dimmed">
                  • Or enter a new email to send an invitation
                </Text>
              </Stack>
            </div>
          </>
        )}

        <Divider />

        {/* Danger Zone */}
        <div>
          <Text size="sm" fw={500} mb="xs" c="red">
            Danger Zone
          </Text>
          {isOwner ? (
            <Button
              fullWidth
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={handleDeleteProject}
              loading={deletingProject}
            >
              Delete Project
            </Button>
          ) : (
            <Button
              fullWidth
              color="orange"
              variant="light"
              leftSection={<IconLogout size={16} />}
              onClick={handleLeaveProject}
            >
              Leave Project
            </Button>
          )}
        </div>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
      </Modal>
    </>
  );
}

