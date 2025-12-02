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
} from "@mantine/core";
import { IconBuilding, IconMail, IconPlus } from "@tabler/icons-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} NoOrganizationProps
 * @property {() => void} onOrganizationCreated - Callback when org is created
 */

/**
 * @param {NoOrganizationProps} props
 */
export function NoOrganization({ onOrganizationCreated }) {
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
