/**
 * HubSpot Integration Panel
 */

import React, { useState } from "react";
import {
  Stack,
  Paper,
  Group,
  Text,
  Button,
  Badge,
  Alert,
  Loader,
  Center,
  Title,
  Table,
  ScrollArea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAddressBook,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
} from "@tabler/icons-react";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

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

/**
 * @typedef {Object} HubSpotPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {HubSpotPanelProps} props
 */
export function HubSpotPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.hubspot);

  // Functions
  const { call: fetchContacts, loading: fetching } = useFunction("fetchHubspotContacts");

  // State
  /** @type {[HubSpotContact[], React.Dispatch<React.SetStateAction<HubSpotContact[]>>]} */
  const [contacts, setContacts] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);

  // Notify parent of connection changes
  React.useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

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
      setError(null);
      const result = await fetchContacts({});
      if (result.success && result.contacts) {
        setContacts(result.contacts);
        notifications.show({
          title: "Contacts Loaded",
          message: `Found ${result.contacts.length} contacts`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch contacts");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch contacts";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  return (
    <Stack gap="lg">
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
          <Alert icon={<IconAlertCircle size={16} />} color="red" mt="md">
            {oauthError.message}
          </Alert>
        )}
      </Paper>

      {isConnected && (
        <Paper shadow="sm" p="lg" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>Contacts</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchContacts}
                loading={fetching}
              >
                {contacts.length > 0 ? "Refresh" : "Load Contacts"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {fetching ? (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <Loader size="lg" />
                  <Text size="sm" c="dimmed">
                    Loading contacts...
                  </Text>
                </Stack>
              </Center>
            ) : contacts.length > 0 ? (
              <ScrollArea>
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
                    {contacts.slice(0, 50).map((contact) => (
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
              </ScrollArea>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Click "Load Contacts" to view your HubSpot contacts
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default HubSpotPanel;
