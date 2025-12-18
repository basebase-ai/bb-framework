/**
 * Coda Integration Panel
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
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconTable,
  IconFolder,
} from "@tabler/icons-react";
import { SiCoda } from "react-icons/si";
import { useNangoOAuth } from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} CodaDoc
 * @property {string} id
 * @property {string} name
 * @property {string} href
 * @property {string} browserLink
 * @property {string} [icon]
 * @property {string} [updatedAt]
 * @property {string} [folderName]
 */

/**
 * @typedef {Object} CodaTable
 * @property {string} id
 * @property {string} name
 * @property {string} href
 * @property {string} browserLink
 * @property {string} [tableType]
 * @property {number} [rowCount]
 */

/**
 * @typedef {Object} CodaPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {CodaPanelProps} props
 */
export function CodaPanel({ user, onConnectionChange }) {
  // OAuth - use "coda" as the Nango integration ID
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth("coda");

  // Functions
  const { call: fetchDocs, loading: fetchingDocs } = useFunction("fetchCodaDocs");

  // State
  /** @type {[CodaDoc[], React.Dispatch<React.SetStateAction<CodaDoc[]>>]} */
  const [docs, setDocs] = useState([]);
  /** @type {[CodaTable[], React.Dispatch<React.SetStateAction<CodaTable[]>>]} */
  const [tables, setTables] = useState([]);
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
        message: "Coda connected successfully",
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
      setDocs([]);
      setTables([]);
      notifications.show({
        title: "Disconnected",
        message: "Coda has been disconnected",
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

  const handleFetchDocs = async () => {
    try {
      setError(null);
      const result = await fetchDocs({});
      if (result.success) {
        setDocs(result.docs || []);
        setTables(result.tables || []);
        notifications.show({
          title: "Content Loaded",
          message: `Found ${result.docs?.length || 0} docs and ${result.tables?.length || 0} tables`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch docs");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch docs";
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
            <ThemeIcon size={44} radius="md" variant="light" color="gray">
              <SiCoda size={24} color="#F46A54" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Coda Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect your Coda workspace to view docs and tables
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
              {isConnected ? "Disconnect" : "Connect Coda"}
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
                onClick={handleFetchDocs}
                loading={fetchingDocs}
              >
                {docs.length > 0 || tables.length > 0 ? "Refresh" : "Load Content"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {fetchingDocs ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : (
              <>
                {docs.length > 0 && (
                  <>
                    <Group gap="xs">
                      <IconFolder size={18} />
                      <Text fw={500}>Docs ({docs.length})</Text>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Folder</Table.Th>
                          <Table.Th>Last Updated</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {docs.map((doc) => (
                          <Table.Tr key={doc.id}>
                            <Table.Td>
                              <a href={doc.browserLink} target="_blank" rel="noopener noreferrer">
                                {doc.icon || "📄"} {doc.name || "Untitled"}
                              </a>
                            </Table.Td>
                            <Table.Td>{doc.folderName || "-"}</Table.Td>
                            <Table.Td>
                              {doc.updatedAt
                                ? new Date(doc.updatedAt).toLocaleDateString()
                                : "-"}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}

                {tables.length > 0 && (
                  <>
                    <Group gap="xs">
                      <IconTable size={18} />
                      <Text fw={500}>Tables ({tables.length})</Text>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Rows</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {tables.map((table) => (
                          <Table.Tr key={table.id}>
                            <Table.Td>
                              <a href={table.browserLink} target="_blank" rel="noopener noreferrer">
                                📊 {table.name || "Untitled"}
                              </a>
                            </Table.Td>
                            <Table.Td>{table.tableType || "-"}</Table.Td>
                            <Table.Td>{table.rowCount ?? "-"}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}

                {docs.length === 0 && tables.length === 0 && (
                  <Text c="dimmed" ta="center" py="xl">
                    No content loaded. Click "Load Content" to fetch from Coda.
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

export default CodaPanel;
