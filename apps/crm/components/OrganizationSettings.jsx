/**
 * OrganizationSettings - Manage organization members
 */

import React, { useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Alert,
  Table,
  Badge,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { IconUserPlus, IconTrash, IconMail } from "@tabler/icons-react";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { where } from "firebase/firestore";

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string} createdBy
 */

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} orgId
 * @property {string} email
 * @property {string | null} userId
 * @property {'owner' | 'member'} role
 * @property {'invited' | 'active'} status
 */

/**
 * @typedef {Object} OrganizationSettingsProps
 * @property {boolean} opened
 * @property {() => void} onClose
 * @property {Organization} organization
 * @property {boolean} isOwner
 */

/**
 * @param {OrganizationSettingsProps} props
 */
export function OrganizationSettings({ opened, onClose, organization, isOwner }) {
  const { user } = useAuth();
  
  // Get all members (both active and invited)
  const { data: members } = useCollection(
    collections.members,
    organization ? [where("orgId", "==", organization.id)] : undefined
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [success, setSuccess] = useState(/** @type {string | null} */ (null));

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    // Prevent inviting yourself
    if (email === user?.email?.toLowerCase()) {
      setError("You cannot invite yourself");
      return;
    }

    // Check if already a member (active or invited)
    const existingMember = members?.find(
      (m) => m.email.toLowerCase() === email
    );
    if (existingMember) {
      setError(existingMember.status === "active" 
        ? "This email is already a member" 
        : "This email has already been invited");
      return;
    }

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      // Create member with composite ID: {orgId}_{email}
      const memberId = `${organization.id}_${email}`;
      await setDoc(doc(db, collections.members, memberId), {
        orgId: organization.id,
        email,
        userId: null,
        role: "member",
        status: "invited",
        invitedAt: serverTimestamp(),
        invitedBy: user?.uid,
        joinedAt: null,
      });

      setSuccess(`Invitation sent to ${email}`);
      setInviteEmail("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error inviting member:", err);
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (/** @type {Member} */ member) => {
    if (member.role === "owner") {
      setError("Cannot remove the organization owner");
      return;
    }

    const action = member.status === "invited" ? "cancel invitation for" : "remove";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.email}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, collections.members, member.id));
    } catch (err) {
      console.error("Error removing member:", err);
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  // Sort members: owner first, then active, then invited, then by email
  const sortedMembers = [...(members || [])].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return a.email.localeCompare(b.email);
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Organization Settings"
      size="lg"
      zIndex={10000}
    >
      <Stack gap="lg">
        {/* Organization Info */}
        <div>
          <Text size="sm" c="dimmed">Organization Name</Text>
          <Text fw={500} size="lg">{organization?.name}</Text>
        </div>

        <Divider />

        {/* Invite Member (Owner only) */}
        {isOwner && (
          <>
            <Text fw={500}>Invite New Member</Text>
            <Group align="flex-end">
              <TextInput
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                leftSection={<IconMail size={16} />}
                style={{ flex: 1 }}
                disabled={inviting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInvite();
                  }
                }}
              />
              <Button
                onClick={handleInvite}
                loading={inviting}
                leftSection={<IconUserPlus size={16} />}
              >
                Invite
              </Button>
            </Group>

            {success && (
              <Alert color="green" title="Success">
                {success}
              </Alert>
            )}

            {error && (
              <Alert color="red" title="Error" withCloseButton onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Divider />
          </>
        )}

        {/* Members List */}
        <Text fw={500}>Members ({members?.length || 0})</Text>
        
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              {isOwner && <Table.Th w={60}></Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedMembers.map((member) => (
              <Table.Tr key={member.id}>
                <Table.Td>
                  <Text size="sm">{member.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={member.role === "owner" ? "blue" : "gray"}
                    variant="light"
                    size="sm"
                  >
                    {member.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={member.status === "active" ? "green" : "yellow"}
                    variant="light"
                    size="sm"
                  >
                    {member.status}
                  </Badge>
                </Table.Td>
                {isOwner && (
                  <Table.Td>
                    {member.role !== "owner" && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleRemoveMember(member)}
                        title={member.status === "invited" ? "Cancel invitation" : "Remove member"}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {/* Close Button */}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
