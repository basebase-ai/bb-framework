/**
 * Notion Integration Panel
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
  Table,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandNotion,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconFile,
  IconLayoutGrid,
} from "@tabler/icons-react";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} NotionPage
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} [icon]
 * @property {string} [lastEdited]
 */

/**
 * @typedef {Object} NotionDatabase
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} [icon]
 * @property {string} [lastEdited]
 */

/**
 * @typedef {Object} NotionPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {NotionPanelProps} props
 */
export function NotionPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.notion);

  // Functions
  const { call: fetchPages, loading: fetchingPages } = useFunction("fetchNotionPages");

  // State
  /** @type {[NotionPage[], React.Dispatch<React.SetStateAction<NotionPage[]>>]} */
  const [pages, setPages] = useState([]);
  /** @type {[NotionDatabase[], React.Dispatch<React.SetStateAction<NotionDatabase[]>>]} */
  const [databases, setDatabases] = useState([]);
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
        message: "Notion connected successfully",
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
      setPages([]);
      setDatabases([]);
      notifications.show({
        title: "Disconnected",
        message: "Notion has been disconnected",
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

  const handleFetchPages = async () => {
    try {
      setError(null);
      const result = await fetchPages({});
      if (result.success) {
        setPages(result.pages || []);
        setDatabases(result.databases || []);
        notifications.show({
          title: "Content Loaded",
          message: `Found ${result.pages?.length || 0} pages and ${result.databases?.length || 0} databases`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch pages");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch pages";
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
            <IconBrandNotion size={40} color="#000" />
            <div>
              <Text fw={500} size="lg">
                Notion Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect your Notion workspace to view pages and databases
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
              color={isConnected ? "gray" : "dark"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect Notion"}
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
              <Title order={4}>Workspace Content</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchPages}
                loading={fetchingPages}
              >
                {pages.length > 0 || databases.length > 0 ? "Refresh" : "Load Content"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {fetchingPages ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : (
              <>
                {databases.length > 0 && (
                  <>
                    <Group gap="xs">
                      <IconLayoutGrid size={18} />
                      <Text fw={500}>Databases ({databases.length})</Text>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Last Edited</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {databases.map((db) => (
                          <Table.Tr key={db.id}>
                            <Table.Td>
                              <a href={db.url} target="_blank" rel="noopener noreferrer">
                                {db.icon || "📊"} {db.title || "Untitled"}
                              </a>
                            </Table.Td>
                            <Table.Td>
                              {db.lastEdited
                                ? new Date(db.lastEdited).toLocaleDateString()
                                : "-"}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}

                {pages.length > 0 && (
                  <>
                    <Group gap="xs">
                      <IconFile size={18} />
                      <Text fw={500}>Pages ({pages.length})</Text>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Last Edited</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {pages.map((page) => (
                          <Table.Tr key={page.id}>
                            <Table.Td>
                              <a href={page.url} target="_blank" rel="noopener noreferrer">
                                {page.icon || "📄"} {page.title || "Untitled"}
                              </a>
                            </Table.Td>
                            <Table.Td>
                              {page.lastEdited
                                ? new Date(page.lastEdited).toLocaleDateString()
                                : "-"}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}

                {pages.length === 0 && databases.length === 0 && (
                  <Text c="dimmed" ta="center" py="xl">
                    No content loaded. Click "Load Content" to fetch from Notion.
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default NotionPanel;
