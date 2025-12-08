/**
 * NoOrganization - Shown when user has no organization membership
 * Allows user to request an invite or create a new organization
 */

import React, { useState } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  Divider,
  Alert,
  Card,
  Badge,
} from "@mantine/core";
import { IconBuilding, IconMail, IconPlus, IconCheck } from "@tabler/icons-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} OrganizationMember
 * @property {string} id
 * @property {string} orgId
 * @property {string} email
 * @property {string | null} userId
 * @property {'owner' | 'member'} role
 * @property {'invited' | 'active'} status
 */

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string} createdBy
 */

/**
 * @typedef {Object} NoOrganizationProps
 * @property {() => void} onOrganizationCreated - Callback when org is created
 * @property {OrganizationMember[]} [pendingInvitations] - Pending invitations
 * @property {Organization[]} [pendingOrganizations] - Organizations for pending invitations
 * @property {(invitation: OrganizationMember) => void} [onAcceptInvitation] - Callback to accept invitation
 */

/**
 * @param {NoOrganizationProps} props
 */
export function NoOrganization({ 
  onOrganizationCreated, 
  pendingInvitations = [], 
  pendingOrganizations = [],
  onAcceptInvitation 
}) {
  const { user } = useAuth();
  const { add: addOrg } = useCollection(collections.organizations);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      setError("Please enter an organization name");
      return;
    }

    if (!user?.email || !user?.uid) {
      setError("User not available");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create the organization
      const orgId = await addOrg({
        name: orgName.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      // Create the owner membership with composite ID: {orgId}_{email}
      const email = user.email.toLowerCase();
      const memberId = `${orgId}_${email}`;
      await setDoc(doc(db, collections.members, memberId), {
        orgId,
        email,
        userId: user.uid,
        role: "owner",
        status: "active",
        invitedAt: serverTimestamp(),
        invitedBy: user.uid,
        joinedAt: serverTimestamp(),
      });

      // Notify parent
      onOrganizationCreated?.();
    } catch (err) {
      console.error("Error creating organization:", err);
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="lg" align="center">
          <IconBuilding size={64} stroke={1.5} color="var(--mantine-color-blue-6)" />
          
          <Title order={2} ta="center">
            Welcome to Sales CRM
          </Title>

          <Text c="dimmed" ta="center" maw={400}>
            You're not currently a member of any organization. Please contact your
            administrator to request an invite, or create a new organization.
          </Text>

          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <>
              <Divider w="100%" label="Pending Invitations" labelPosition="center" />
              
              <Stack w="100%" gap="sm">
                {pendingInvitations.map((invitation) => {
                  const org = pendingOrganizations.find((o) => o.id === invitation.orgId);
                  return (
                    <Card key={invitation.id} withBorder padding="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm">
                          <IconBuilding size={24} color="var(--mantine-color-blue-6)" />
                          <div>
                            <Text fw={500}>{org?.name || "Unknown Organization"}</Text>
                            <Badge size="xs" color="yellow" variant="light">
                              Invitation pending
                            </Badge>
                          </div>
                        </Group>
                        <Button
                          size="sm"
                          leftSection={<IconCheck size={16} />}
                          onClick={() => onAcceptInvitation?.(invitation)}
                        >
                          Accept
                        </Button>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            </>
          )}

          <Divider w="100%" label="Options" labelPosition="center" />

          {/* Request Invite Section */}
          <Paper withBorder p="md" w="100%" bg="gray.0">
            <Group gap="md">
              <IconMail size={24} color="var(--mantine-color-gray-6)" />
              <div style={{ flex: 1 }}>
                <Text fw={500}>Request an Invite</Text>
                <Text size="sm" c="dimmed">
                  Contact your organization's administrator and ask them to invite{" "}
                  <Text span fw={500}>{user?.email}</Text> to the organization.
                </Text>
              </div>
            </Group>
          </Paper>

          <Divider w="100%" label="or" labelPosition="center" />

          {/* Create Organization Section */}
          {!showCreateForm ? (
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreateForm(true)}
            >
              Create New Organization
            </Button>
          ) : (
            <Paper withBorder p="md" w="100%">
              <Stack gap="md">
                <Text fw={500}>Create New Organization</Text>
                
                <TextInput
                  label="Organization Name"
                  placeholder="e.g., Acme Corporation"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  leftSection={<IconBuilding size={16} />}
                  disabled={creating}
                />

                {error && (
                  <Alert color="red" title="Error">
                    {error}
                  </Alert>
                )}

                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowCreateForm(false);
                      setOrgName("");
                      setError(null);
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateOrganization}
                    loading={creating}
                    leftSection={<IconPlus size={16} />}
                  >
                    Create Organization
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
