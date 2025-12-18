/**
 * Supabase Integration Panel
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
  TextInput,
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
  IconLink,
  IconKey,
  IconTable,
} from "@tabler/icons-react";
import { SiSupabase } from "react-icons/si";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} SupabasePanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {SupabasePanelProps} props
 */
export function SupabasePanel({ user, onConnectionChange }) {
  // Functions
  const { call: credentialManager, loading: credLoading } = useFunction("credentialManager");
  const { call: supabaseData, loading: dataLoading } = useFunction("supabaseData");

  // Credential helpers
  const saveCreds = (creds) => credentialManager({ action: "save", serviceName: "supabase", credentials: creds });
  const getCreds = () => credentialManager({ action: "get", serviceName: "supabase" });
  const deleteCreds = () => credentialManager({ action: "delete", serviceName: "supabase" });
  const savingCreds = credLoading;
  const deletingCreds = credLoading;

  // Data helpers
  const listTables = () => supabaseData({ action: "listTables" });
  const fetchData = (params) => supabaseData({ action: "query", ...params });
  const listingTables = dataLoading;
  const fetchingData = dataLoading;

  // Connection state
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [connected, setConnected] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [url, setUrl] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [apiKey, setApiKey] = useState("");

  // Data state
  /** @type {[{name: string}[], React.Dispatch<React.SetStateAction<{name: string}[]>>]} */
  const [tables, setTables] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedTable, setSelectedTable] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [columns, setColumns] = useState([]);
  /** @type {[Record<string, unknown>[], React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>]} */
  const [data, setData] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);

  // Check connection on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await getCreds({});
        if (result.success && result.hasCredentials) {
          setConnected(true);
          setUrl(result.projectUrl || "");
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
    if (!url || !apiKey) {
      notifications.show({
        title: "Missing Credentials",
        message: "Please enter both Project URL and API Key",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      const result = await saveCreds({
        projectUrl: url,
        apiKey: apiKey,
      });

      if (result.success) {
        setConnected(true);
        setApiKey(""); // Clear key from state for security
        notifications.show({
          title: "Connected!",
          message: "Supabase credentials saved successfully",
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
      setUrl("");
      setApiKey("");
      setTables([]);
      setSelectedTable(null);
      setColumns([]);
      setData([]);
      notifications.show({
        title: "Disconnected",
        message: "Supabase credentials removed",
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
      const result = await listTables({});

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

      const result = await fetchData({
        tableName: selectedTable,
      });

      if (result.success) {
        setColumns(result.columns || []);
        setData(result.data || []);
        notifications.show({
          title: "Data Loaded",
          message: `Loaded ${result.fetchedCount || 0} of ${result.totalCount || 0} records`,
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
    }
  };

  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ThemeIcon size={44} radius="md" variant="light" color="gray">
              <SiSupabase size={24} color="#3ECF8E" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Supabase Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect to your Supabase PostgreSQL database
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
            <TextInput
              label="Project URL"
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              leftSection={<IconLink size={16} />}
            />
            <PasswordInput
              label="API Key"
              placeholder="Your Supabase anon or service role key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              leftSection={<IconKey size={16} />}
            />
            <Button
              onClick={handleConnect}
              loading={savingCreds}
              color="green"
              leftSection={<SiSupabase size={16} />}
            >
              Connect Supabase
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
                    label: table.name,
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
                  color="green"
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
                Click "Load Tables" to see your Supabase tables
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
                          <Table.Th key={idx}>{col}</Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.slice(0, 50).map((row, rowIdx) => (
                        <Table.Tr key={rowIdx}>
                          {columns.map((col, colIdx) => (
                            <Table.Td key={colIdx}>
                              {String(row[col] ?? "-")}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                {data.length > 50 && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    Showing 50 of {data.length} records
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

export default SupabasePanel;
