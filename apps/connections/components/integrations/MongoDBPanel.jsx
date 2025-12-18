/**
 * MongoDB Integration Panel
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
  TextInput,
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
import { SiMongodb } from "react-icons/si";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} MongoDBPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {MongoDBPanelProps} props
 */
export function MongoDBPanel({ user, onConnectionChange }) {
  // Functions
  const { call: credentialManager, loading: credLoading } = useFunction("credentialManager");
  const { call: mongodbData, loading: queryLoading } = useFunction("mongodbData");

  // Credential helpers
  const saveCreds = (creds) => credentialManager({ action: "save", serviceName: "mongodb", credentials: creds });
  const getCreds = () => credentialManager({ action: "get", serviceName: "mongodb" });
  const deleteCreds = () => credentialManager({ action: "delete", serviceName: "mongodb" });
  const savingCreds = credLoading;
  const deletingCreds = credLoading;

  // Connection state
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [connected, setConnected] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [connectionString, setConnectionString] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [databaseName, setDatabaseName] = useState("");

  // Data state
  /** @type {[{name: string, type: string}[], React.Dispatch<React.SetStateAction<{name: string, type: string}[]>>]} */
  const [collections, setCollections] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedCollection, setSelectedCollection] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [fields, setFields] = useState([]);
  /** @type {[Record<string, unknown>[], React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>]} */
  const [documents, setDocuments] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [listingCollections, setListingCollections] = useState(false);
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
    if (!connectionString || !databaseName) {
      notifications.show({
        title: "Missing Fields",
        message: "Please enter both connection string and database name",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      const result = await saveCreds({
        connectionString,
        databaseName,
      });

      if (result.success) {
        setConnected(true);
        setConnectionString(""); // Clear from state for security
        notifications.show({
          title: "Connected!",
          message: "MongoDB credentials saved successfully",
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
      setDatabaseName("");
      setCollections([]);
      setSelectedCollection(null);
      setFields([]);
      setDocuments([]);
      notifications.show({
        title: "Disconnected",
        message: "MongoDB credentials removed",
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

  const handleListCollections = async () => {
    try {
      setError(null);
      setListingCollections(true);
      const result = await mongodbData({ action: "listCollections" });

      if (result.success && result.collections) {
        setCollections(result.collections);
        notifications.show({
          title: "Collections Loaded",
          message: `Found ${result.collections.length} collections`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list collections");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list collections";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setListingCollections(false);
    }
  };

  const handleFetchData = async () => {
    if (!selectedCollection) {
      notifications.show({
        title: "Select a Collection",
        message: "Please select a collection first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setFields([]);
      setDocuments([]);
      setFetchingData(true);

      const result = await mongodbData({
        action: "query",
        collectionName: selectedCollection,
        limit: 100,
      });

      if (result.success) {
        setFields(result.fields || []);
        setDocuments(result.documents || []);
        notifications.show({
          title: "Data Loaded",
          message: `Loaded ${result.documentCount || 0} documents`,
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

  /**
   * Format a MongoDB value for display
   * @param {unknown} value
   * @returns {string}
   */
  const formatValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") {
      // Handle ObjectId and Date
      if (value && typeof value === "object" && "$oid" in value) {
        return String(value.$oid).substring(0, 8) + "...";
      }
      if (value && typeof value === "object" && "$date" in value) {
        return new Date(value.$date).toLocaleDateString();
      }
      return JSON.stringify(value).substring(0, 50);
    }
    return String(value);
  };

  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ThemeIcon size={44} radius="md" variant="light" color="gray">
              <SiMongodb size={24} color="#47A248" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                MongoDB Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect to your MongoDB database
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
              placeholder="mongodb+srv://user:password@cluster.mongodb.net/"
              description="Your MongoDB connection URL"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              leftSection={<IconKey size={16} />}
            />
            <TextInput
              label="Database Name"
              placeholder="myDatabase"
              description="The database to connect to"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              leftSection={<IconDatabase size={16} />}
            />
            <Button
              onClick={handleConnect}
              loading={savingCreds}
              color="green"
              leftSection={<IconDatabase size={16} />}
            >
              Connect MongoDB
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
                onClick={handleListCollections}
                loading={listingCollections}
                variant="light"
              >
                {collections.length > 0 ? "Refresh" : "Load Collections"}
              </Button>
            </Group>

            {collections.length > 0 && (
              <>
                <Select
                  label="Select a collection"
                  placeholder="Choose a collection..."
                  data={collections.map((col) => ({
                    value: col.name,
                    label: col.name,
                  }))}
                  value={selectedCollection}
                  onChange={setSelectedCollection}
                  searchable
                  leftSection={<IconTable size={16} />}
                />

                <Button
                  onClick={handleFetchData}
                  loading={fetchingData}
                  disabled={!selectedCollection}
                  leftSection={<IconTable size={16} />}
                  color="green"
                >
                  Load Documents
                </Button>
              </>
            )}

            {listingCollections && (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}

            {!listingCollections && collections.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                Click "Load Collections" to see your MongoDB collections
              </Text>
            )}

            {fetchingData && (
              <Card withBorder>
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <Loader size="md" />
                    <Text size="sm" c="dimmed">
                      Loading documents...
                    </Text>
                  </Stack>
                </Center>
              </Card>
            )}

            {documents.length > 0 && !fetchingData && (
              <Card withBorder p={0}>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        {fields.slice(0, 8).map((field, idx) => (
                          <Table.Th key={idx}>{field}</Table.Th>
                        ))}
                        {fields.length > 8 && <Table.Th>...</Table.Th>}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {documents.slice(0, 50).map((doc, rowIdx) => (
                        <Table.Tr key={rowIdx}>
                          {fields.slice(0, 8).map((field, colIdx) => (
                            <Table.Td key={colIdx}>{formatValue(doc[field])}</Table.Td>
                          ))}
                          {fields.length > 8 && <Table.Td>...</Table.Td>}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                {documents.length > 50 && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    Showing 50 of {documents.length} documents
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

export default MongoDBPanel;
