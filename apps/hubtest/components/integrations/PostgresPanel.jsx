/**
 * PostgreSQL Integration Panel
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
  PasswordInput,
  Card,
  Select,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconKey,
  IconTable,
} from "@tabler/icons-react";
import { SiPostgresql } from "react-icons/si";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} PostgresPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {PostgresPanelProps} props
 */
export function PostgresPanel({ user, onConnectionChange }) {
  // Functions
  const { call: credentialManager, loading: credLoading } = useFunction("credentialManager");
  const { call: postgresData, loading: queryLoading } = useFunction("postgresData");

  // Credential helpers
  const saveCreds = (creds) => credentialManager({ action: "save", serviceName: "postgres", credentials: creds });
  const getCreds = () => credentialManager({ action: "get", serviceName: "postgres" });
  const deleteCreds = () => credentialManager({ action: "delete", serviceName: "postgres" });
  const savingCreds = credLoading;
  const deletingCreds = credLoading;

  // Connection state
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [connected, setConnected] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [connectionString, setConnectionString] = useState("");

  // Data state
  /** @type {[{name: string, schema: string}[], React.Dispatch<React.SetStateAction<{name: string, schema: string}[]>>]} */
  const [tables, setTables] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedTable, setSelectedTable] = useState(null);
  /** @type {[{name: string}[], React.Dispatch<React.SetStateAction<{name: string}[]>>]} */
  const [columns, setColumns] = useState([]);
  /** @type {[Record<string, unknown>[], React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>]} */
  const [data, setData] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [listingTables, setListingTables] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [fetchingData, setFetchingData] = useState(false);

  // Check connection on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await getCreds({});
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
    if (!connectionString) {
      notifications.show({
        title: "Missing Connection String",
        message: "Please enter a PostgreSQL connection string",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      const result = await saveCreds({
        connectionString,
      });

      if (result.success) {
        setConnected(true);
        setConnectionString(""); // Clear from state for security
        notifications.show({
          title: "Connected!",
          message: "PostgreSQL credentials saved successfully",
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
      await deleteCreds({});
      setConnected(false);
      setConnectionString("");
      setTables([]);
      setSelectedTable(null);
      setColumns([]);
      setData([]);
      notifications.show({
        title: "Disconnected",
        message: "PostgreSQL credentials removed",
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

  const handleListTables = async () => {
    try {
      setError(null);
      setListingTables(true);
      const result = await postgresData({ action: "listTables" });

      if (result.success && result.tables) {
        setTables(result.tables);
        notifications.show({
          title: "Tables Loaded",
          message: `Found ${result.tables.length} tables`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list tables");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list tables";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setListingTables(false);
    }
  };

  const handleFetchData = async () => {
    if (!selectedTable) {
      notifications.show({
        title: "Select a Table",
        message: "Please select a table first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setColumns([]);
      setData([]);
      setFetchingData(true);

      const result = await postgresData({
        action: "query",
        tableName: selectedTable,
        limit: 100,
      });

      if (result.success) {
        setColumns(result.columns || []);
        setData(result.rows || []);
        notifications.show({
          title: "Data Loaded",
          message: `Loaded ${result.rowCount || 0} rows`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch data");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setFetchingData(false);
    }
  };

  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ThemeIcon size={44} radius="md" variant="light" color="gray">
              <SiPostgresql size={24} color="#4169E1" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                PostgreSQL Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect to your PostgreSQL database
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
                loading={deletingCreds}
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
              label="Connection String"
              placeholder="postgresql://user:password@host:5432/database"
              description="Your PostgreSQL connection URL"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              leftSection={<IconKey size={16} />}
            />
            <Button
              onClick={handleConnect}
              loading={savingCreds}
              color="blue"
              leftSection={<IconDatabase size={16} />}
            >
              Connect PostgreSQL
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
              <Title order={4}>Database Browser</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleListTables}
                loading={listingTables}
                variant="light"
              >
                {tables.length > 0 ? "Refresh" : "Load Tables"}
              </Button>
            </Group>

            {tables.length > 0 && (
              <>
                <Select
                  label="Select a table"
                  placeholder="Choose a table..."
                  data={tables.map((table) => ({
                    value: table.name,
                    label: `${table.schema}.${table.name}`,
                  }))}
                  value={selectedTable}
                  onChange={setSelectedTable}
                  searchable
                  leftSection={<IconTable size={16} />}
                />

                <Button
                  onClick={handleFetchData}
                  loading={fetchingData}
                  disabled={!selectedTable}
                  leftSection={<IconTable size={16} />}
                  color="blue"
                >
                  Load Data
                </Button>
              </>
            )}

            {listingTables && (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}

            {!listingTables && tables.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                Click "Load Tables" to see your PostgreSQL tables
              </Text>
            )}

            {fetchingData && (
              <Card withBorder>
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <Loader size="md" />
                    <Text size="sm" c="dimmed">
                      Loading data...
                    </Text>
                  </Stack>
                </Center>
              </Card>
            )}

            {data.length > 0 && !fetchingData && (
              <Card withBorder p={0}>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        {columns.map((col, idx) => (
                          <Table.Th key={idx}>{col.name}</Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.slice(0, 50).map((row, rowIdx) => (
                        <Table.Tr key={rowIdx}>
                          {columns.map((col, colIdx) => (
                            <Table.Td key={colIdx}>
                              {String(row[col.name] ?? "-")}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                {data.length > 50 && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    Showing 50 of {data.length} rows
                  </Text>
                )}
              </Card>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default PostgresPanel;
