/**
 * Apps list component - displays all apps in a table
 */

import React, { useMemo, useState } from "react";
import { Table, Container, Title, Text, Badge, Button, Group, Paper, Stack, Modal, TextInput } from "@mantine/core";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";

export function AppsList() {
  const { user, loading: authLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [appId, setAppId] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Memoize the where conditions to prevent re-renders
  const whereConditions = useMemo(() => {
    if (!user?.uid) return [["owner", "==", "___no_user___"]];
    return [["owner", "==", user.uid]];
  }, [user?.uid]);
  
  const { data: apps, loading, error } = useCollection("apps", {
    where: whereConditions,
    realtime: true,
    // Note: orderBy with where on different fields requires a composite index
    // For now, we'll sort client-side
  });

  // Auto-generate app ID from name
  const handleNameChange = (value) => {
    setAppName(value);
    // Generate kebab-case ID from name
    const generatedId = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setAppId(generatedId);
  };

  const handleCreateApp = async () => {
    if (!appName.trim() || !appId.trim()) {
      alert("Please enter both name and ID");
      return;
    }

    setCreating(true);
    try {
      // Use setDoc with custom ID instead of auto-generated
      const appRef = doc(db, "apps", appId);
      await setDoc(appRef, {
        name: appName,
        description: description || "",
        status: "draft",
        version: "0.1.0",
        owner: user.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      
      // Close modal and reset form
      setModalOpen(false);
      setAppName("");
      setAppId("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create app:", err);
      alert(`Failed to create app: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Container size="xl" py="xl">
        <Text>Loading apps...</Text>
      </Container>
    );
  }
  
  if (!user) {
    return (
      <Container size="xl" py="xl">
        <Text>Please sign in to view apps.</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Text c="red">Error loading apps: {error.message}</Text>
      </Container>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "green";
      case "draft":
        return "blue";
      case "archived":
        return "gray";
      default:
        return "gray";
    }
  };

  // Sort apps client-side by createdAt (newest first)
  const sortedApps = [...apps].sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(0);
    const bTime = b.createdAt?.toDate?.() || new Date(0);
    return bTime - aTime;
  });

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Apps</Title>
            <Text c="dimmed" size="sm">
              Manage your Basebase applications
            </Text>
          </div>
          <Button onClick={() => setModalOpen(true)}>Create New App</Button>
        </Group>

        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create New App"
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="App Name"
              placeholder="My Awesome App"
              value={appName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
            
            <TextInput
              label="App ID"
              placeholder="my-awesome-app"
              description="This will be the document ID in Firestore (kebab-case recommended)"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              required
            />
            
            <TextInput
              label="Description (optional)"
              placeholder="A brief description of your app"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateApp} loading={creating}>
                Create App
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Paper withBorder shadow="sm" radius="md" p="md">
          {apps.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No apps yet. Click "Add Sample App" to create one!
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Version</Table.Th>
                  <Table.Th>Created</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedApps.map((app) => (
                  <Table.Tr key={app.id}>
                    <Table.Td>
                      <Text fw={500}>{app.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {app.description || "No description"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(app.status)} variant="light">
                        {app.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {app.version || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {app.createdAt?.toDate
                          ? new Date(app.createdAt.toDate()).toLocaleDateString()
                          : "—"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        <Text size="xs" c="dimmed" ta="center">
          Showing {sortedApps.length} app{sortedApps.length !== 1 ? "s" : ""}
        </Text>
      </Stack>
    </Container>
  );
}

