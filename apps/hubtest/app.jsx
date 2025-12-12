/**
 * HubSpot Test App - Display HubSpot contacts in a table
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Button,
  Stack,
  Container,
  Table,
  Paper,
  Badge,
  Alert,
  Loader,
  Center,
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import {
  IconAddressBook,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../framework/hooks/useFunction.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * @typedef {Object} HubSpotContact
 * @property {string} id
 * @property {string} [email]
 * @property {string} [firstname]
 * @property {string} [lastname]
 * @property {string} [company]
 * @property {string} [phone]
 * @property {string} createdAt
 */

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // HubSpot OAuth via Nango
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.hubspot);

  // Fetch contacts function
  const { call: fetchContacts, loading: fetchingContacts } =
    useFunction("fetchHubspotContacts");

  /** @type {[HubSpotContact[], React.Dispatch<React.SetStateAction<HubSpotContact[]>>]} */
  const [contacts, setContacts] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [fetchError, setFetchError] = useState(null);

  const handleConnect = async () => {
    try {
      await connect();
      notifications.show({
        title: "Connected!",
        message: "HubSpot connected successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Connection Failed",
        message: err instanceof Error ? err.message : "Failed to connect",
        color: "red",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setContacts([]);
      notifications.show({
        title: "Disconnected",
        message: "HubSpot has been disconnected",
        color: "gray",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to disconnect",
        color: "red",
      });
    }
  };

  const handleFetchContacts = async () => {
    try {
      setFetchError(null);
      const result = await fetchContacts({});

      if (result.success && result.contacts) {
        setContacts(result.contacts);
        notifications.show({
          title: "Contacts Loaded",
          message: `Loaded ${result.contacts.length} contacts from HubSpot`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch contacts");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch contacts";
      setFetchError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <IconAddressBook size={28} color="#ff7a59" />
            <Title order={3}>HubSpot Test</Title>
          </Group>
          {user && (
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Text size="sm" c="dimmed">
                {profile?.displayName || user.email}
              </Text>
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email || "User"}
                size="sm"
                radius="xl"
              >
                {(profile?.displayName || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Stack gap="lg">
            {/* Connection Status */}
            <Paper shadow="sm" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <IconAddressBook size={40} color="#ff7a59" />
                  <div>
                    <Text fw={500} size="lg">
                      HubSpot Connection
                    </Text>
                    <Text size="sm" c="dimmed">
                      Connect your HubSpot account to view contacts
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  {isConnected && (
                    <Badge color="green" size="lg" leftSection={<IconCheck size={14} />}>
                      Connected
                    </Badge>
                  )}
                  <Button
                    onClick={isConnected ? handleDisconnect : handleConnect}
                    loading={oauthLoading}
                    color={isConnected ? "gray" : "orange"}
                    variant={isConnected ? "light" : "filled"}
                  >
                    {isConnected ? "Disconnect" : "Connect HubSpot"}
                  </Button>
                </Group>
              </Group>

              {oauthError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  mt="md"
                >
                  {oauthError.message}
                </Alert>
              )}
            </Paper>

            {/* Contacts Section */}
            {isConnected && (
              <Paper shadow="sm" p="lg" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Contacts</Title>
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleFetchContacts}
                    loading={fetchingContacts}
                  >
                    {contacts.length > 0 ? "Refresh" : "Load Contacts"}
                  </Button>
                </Group>

                {fetchError && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    mb="md"
                  >
                    {fetchError}
                  </Alert>
                )}

                {fetchingContacts ? (
                  <Center py="xl">
                    <Loader size="lg" />
                  </Center>
                ) : contacts.length > 0 ? (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Company</Table.Th>
                        <Table.Th>Phone</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {contacts.map((contact) => (
                        <Table.Tr key={contact.id}>
                          <Table.Td>
                            {[contact.firstname, contact.lastname]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </Table.Td>
                          <Table.Td>{contact.email || "-"}</Table.Td>
                          <Table.Td>{contact.company || "-"}</Table.Td>
                          <Table.Td>{contact.phone || "-"}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    No contacts loaded. Click "Load Contacts" to fetch from
                    HubSpot.
                  </Text>
                )}
              </Paper>
            )}
          </Stack>
        </Container>
      </AppShell.Main>

      {user && (
        <ProfileModal
          opened={profileModalOpened}
          onClose={() => setProfileModalOpened(false)}
        />
      )}
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app
const container = document.getElementById("app");
/** @type {import('react-dom/client').Root | null} */
let root = null;

function render() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

render();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
