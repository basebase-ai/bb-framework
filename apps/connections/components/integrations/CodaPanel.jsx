/**
 * Coda Integration Panel
 * Uses API key authentication (not OAuth)
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
  PasswordInput,
  Anchor,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconTable,
  IconFolder,
  IconKey,
} from "@tabler/icons-react";
import { SiCoda } from "react-icons/si";
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
  // Functions
  const { call: credentialManager, loading: credLoading } = useFunction("credentialManager");
  const { call: fetchDocs, loading: fetchingDocs } = useFunction("fetchCodaDocs");

  // Credential helpers
  const saveCreds = (/** @type {Record<string, string>} */ creds) =>
    credentialManager({ action: "save", serviceName: "coda", credentials: creds });
  const getCreds = () => credentialManager({ action: "get", serviceName: "coda" });
  const deleteCreds = () => credentialManager({ action: "delete", serviceName: "coda" });

  // Connection state
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [connected, setConnected] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [apiToken, setApiToken] = useState("");

  // Data state
  /** @type {[CodaDoc[], React.Dispatch<React.SetStateAction<CodaDoc[]>>]} */
  const [docs, setDocs] = useState([]);
  /** @type {[CodaTable[], React.Dispatch<React.SetStateAction<CodaTable[]>>]} */
  const [tables, setTables] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);

  // Check connection on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await getCreds();
        if (result.success && result.hasCredentials) {
          setConnected(true);
          onConnectionChange?.(true);
        }
      } catch (err) {
        // No credentials saved - that's OK
      }
    };
    if (user) {
      checkConnection();
    }
  }, [user]);

  // Notify parent of connection changes
  React.useEffect(() => {
    onConnectionChange?.(connected);
  }, [connected, onConnectionChange]);

  const handleConnect = async () => {
    if (!apiToken) {
      notifications.show({
        title: "Missing API Token",
        message: "Please enter your Coda API token",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      const result = await saveCreds({
        apiToken: apiToken,
      });

      if (result.success) {
        setConnected(true);
        setApiToken(""); // Clear token from state for security
        notifications.show({
          title: "Connected!",
          message: "Coda API token saved successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      } else {
        throw new Error(result.error || "Failed to save credentials");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setError(message);
      notifications.show({
        title: "Connection Failed",
        message,
        color: "red",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await deleteCreds();
      setConnected(false);
      setApiToken("");
      setDocs([]);
      setTables([]);
      notifications.show({
        title: "Disconnected",
        message: "Coda credentials removed",
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

          {connected && (
            <Group gap="sm">
              <Badge color="green" size="lg" leftSection={<IconCheck size={14} />}>
                Connected
              </Badge>
              <Button
                onClick={handleDisconnect}
                loading={credLoading}
                color="gray"
                variant="light"
              >
                Disconnect
              </Button>
            </Group>
          )}
        </Group>

        {!connected && (
          <Stack gap="md" mt="lg">
            <PasswordInput
              label="API Token"
              description={
                <Text size="xs">
                  Get your API token from{" "}
                  <Anchor href="https://coda.io/account" target="_blank" rel="noopener noreferrer">
                    coda.io/account
                  </Anchor>
                </Text>
              }
              placeholder="Enter your Coda API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              leftSection={<IconKey size={16} />}
            />
            <Button
              onClick={handleConnect}
              loading={credLoading}
              color="orange"
              leftSection={<SiCoda size={16} />}
            >
              Connect Coda
            </Button>
          </Stack>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mt="md">
            {error}
          </Alert>
        )}
      </Paper>

      {connected && (
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
                              <Anchor href={doc.browserLink} target="_blank" rel="noopener noreferrer">
                                {doc.icon || "📄"} {doc.name || "Untitled"}
                              </Anchor>
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
                              <Anchor href={table.browserLink} target="_blank" rel="noopener noreferrer">
                                📊 {table.name || "Untitled"}
                              </Anchor>
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
