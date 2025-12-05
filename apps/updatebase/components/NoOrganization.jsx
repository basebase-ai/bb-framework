/**
 * NoOrganization - Shown when user has no organization membership
 * Allows user to create a new organization or request an invite
 */

import React, { useState } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Divider,
  Alert,
} from "@mantine/core";
import { IconRocket, IconMail, IconPlus } from "@tabler/icons-react";
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
  const [orgDescription, setOrgDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      setError("Please enter a company/startup name");
      return;
    }

    if (!user?.email || !user?.uid) {
      setError("User not available");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create slug from name
      const slug = orgName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Create the organization
      const orgId = await addOrg({
        name: orgName.trim(),
        slug,
        description: orgDescription.trim() || null,
        logoURL: null,
        websiteURL: null,
        followerCount: 0,
        updateCount: 0,
        subscriberCount: 0,
        createdBy: user.uid,
      });

      // Create the owner membership with composite ID: {orgId}_{email}
      const email = user.email.toLowerCase();
      const memberId = `${orgId}_${email}`;
      await setDoc(doc(db, collections.members, memberId), {
        orgId,
        email,
        userId: user.uid,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
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
          <IconRocket size={64} stroke={1.5} color="var(--mantine-color-blue-6)" />

          <Title order={2} ta="center">
            Welcome to UpdateBase
          </Title>

          <Text c="dimmed" ta="center" maw={400}>
            Share your startup's progress with investors and stakeholders. You're not currently
            managing any organization. Create one to get started, or request an invite from an
            existing team.
          </Text>

          <Divider w="100%" label="Options" labelPosition="center" />

          {/* Request Invite Section */}
          <Paper withBorder p="md" w="100%" bg="gray.0">
            <Group gap="md">
              <IconMail size={24} color="var(--mantine-color-gray-6)" />
              <div style={{ flex: 1 }}>
                <Text fw={500}>Join an Existing Team</Text>
                <Text size="sm" c="dimmed">
                  Ask your team's owner to invite{" "}
                  <Text span fw={500}>
                    {user?.email}
                  </Text>{" "}
                  to their organization.
                </Text>
              </div>
            </Group>
          </Paper>

          <Divider w="100%" label="or" labelPosition="center" />

          {/* Create Organization Section */}
          {!showCreateForm ? (
            <Button
              variant="filled"
              size="lg"
              leftSection={<IconPlus size={18} />}
              onClick={() => setShowCreateForm(true)}
            >
              Create Your Startup Profile
            </Button>
          ) : (
            <Paper withBorder p="md" w="100%">
              <Stack gap="md">
                <Text fw={500}>Create Your Startup Profile</Text>

                <TextInput
                  label="Company/Startup Name"
                  placeholder="e.g., Acme Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  leftSection={<IconRocket size={16} />}
                  disabled={creating}
                  required
                />

                <Textarea
                  label="Description"
                  placeholder="What does your startup do? (optional)"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  disabled={creating}
                  minRows={2}
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
                      setOrgDescription("");
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
