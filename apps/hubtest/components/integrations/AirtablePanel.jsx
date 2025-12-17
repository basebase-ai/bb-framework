/**
 * Airtable Integration Panel
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
  Card,
  Select,
  Table,
  ScrollArea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDatabase,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconTable,
} from "@tabler/icons-react";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} AirtableBase
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} AirtableTable
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} AirtablePanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {AirtablePanelProps} props
 */
export function AirtablePanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.airtable);

  // Functions
  const { call: listBases, loading: listingBases } = useFunction("listAirtableBases");
  const { call: listTables, loading: listingTables } = useFunction("listAirtableTables");
  const { call: fetchRecords, loading: fetchingRecords } = useFunction("fetchAirtableRecords");

  // State
  /** @type {[AirtableBase[], React.Dispatch<React.SetStateAction<AirtableBase[]>>]} */
  const [bases, setBases] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedBase, setSelectedBase] = useState(null);
  /** @type {[AirtableTable[], React.Dispatch<React.SetStateAction<AirtableTable[]>>]} */
  const [tables, setTables] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedTable, setSelectedTable] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [fields, setFields] = useState([]);
  /** @type {[Record<string, unknown>[], React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>]} */
  const [records, setRecords] = useState([]);
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
        message: "Airtable connected successfully",
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
      setBases([]);
      setSelectedBase(null);
      setTables([]);
      setSelectedTable(null);
      setFields([]);
      setRecords([]);
      notifications.show({
        title: "Disconnected",
        message: "Airtable has been disconnected",
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

  const handleListBases = async () => {
    try {
      setError(null);
      const result = await listBases({});
      if (result.success && result.bases) {
        setBases(result.bases);
        notifications.show({
          title: "Bases Loaded",
          message: `Found ${result.bases.length} bases`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list bases");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list bases";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleSelectBase = async (baseId) => {
    setSelectedBase(baseId);
    setTables([]);
    setSelectedTable(null);
    setRecords([]);
    setFields([]);

    if (!baseId) return;

    try {
      setError(null);
      const result = await listTables({ baseId });
      if (result.success && result.tables) {
        setTables(result.tables);
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

  const handleFetchRecords = async () => {
    if (!selectedBase || !selectedTable) {
      notifications.show({
        title: "Select a Table",
        message: "Please select a base and table first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setRecords([]);
      setFields([]);

      const result = await fetchRecords({
        baseId: selectedBase,
        tableId: selectedTable,
      });

      if (result.success) {
        setFields(result.fields || []);
        setRecords(result.records || []);
        notifications.show({
          title: "Records Loaded",
          message: `Loaded ${result.records?.length || 0} records`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch records");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch records";
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
            <IconDatabase size={40} color="#18BFFF" />
            <div>
              <Text fw={500} size="lg">
                Airtable Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect to read data from your Airtable bases
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
              color={isConnected ? "gray" : "cyan"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect Airtable"}
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
              <Title order={4}>Airtable Browser</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleListBases}
                loading={listingBases}
                variant="light"
              >
                {bases.length > 0 ? "Refresh" : "Load Bases"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {bases.length > 0 && (
              <>
                <Select
                  label="Select a base"
                  placeholder="Choose a base..."
                  data={bases.map((base) => ({
                    value: base.id,
                    label: base.name,
                  }))}
                  value={selectedBase}
                  onChange={handleSelectBase}
                  searchable
                  leftSection={<IconDatabase size={16} />}
                />

                {listingTables && (
                  <Center py="md">
                    <Loader size="sm" />
                  </Center>
                )}

                {tables.length > 0 && (
                  <>
                    <Select
                      label="Select a table"
                      placeholder="Choose a table..."
                      data={tables.map((table) => ({
                        value: table.id,
                        label: table.name,
                      }))}
                      value={selectedTable}
                      onChange={setSelectedTable}
                      searchable
                      leftSection={<IconTable size={16} />}
                    />

                    <Button
                      onClick={handleFetchRecords}
                      loading={fetchingRecords}
                      disabled={!selectedTable}
                      leftSection={<IconTable size={16} />}
                      color="cyan"
                    >
                      Load Records
                    </Button>
                  </>
                )}
              </>
            )}

            {listingBases && (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}

            {!listingBases && bases.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                Click "Load Bases" to see your Airtable bases
              </Text>
            )}

            {fetchingRecords && (
              <Card withBorder>
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <Loader size="md" />
                    <Text size="sm" c="dimmed">
                      Loading records...
                    </Text>
                  </Stack>
                </Center>
              </Card>
            )}

            {records.length > 0 && !fetchingRecords && (
              <Card withBorder p={0}>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        {fields.map((field, idx) => (
                          <Table.Th key={idx}>{field}</Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {records.slice(0, 50).map((record, rowIdx) => (
                        <Table.Tr key={record.id || rowIdx}>
                          {fields.map((field, colIdx) => (
                            <Table.Td key={colIdx}>
                              {String(record[field] ?? "-")}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                {records.length > 50 && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    Showing 50 of {records.length} records
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

export default AirtablePanel;
