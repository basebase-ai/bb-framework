/**
 * Google Sheets Integration Panel
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
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconTable,
} from "@tabler/icons-react";
import { SiGooglesheets } from "react-icons/si";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} GoogleSheet
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} SheetsPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {SheetsPanelProps} props
 */
export function SheetsPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.googleSheets);

  // Functions
  const { call: listSheets, loading: listingSheets } = useFunction("listGoogleSheets");
  const { call: fetchSheet, loading: fetchingSheet } = useFunction("fetchGoogleSheet");

  // State
  /** @type {[GoogleSheet[], React.Dispatch<React.SetStateAction<GoogleSheet[]>>]} */
  const [sheets, setSheets] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedSheet, setSelectedSheet] = useState(null);
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [headers, setHeaders] = useState([]);
  /** @type {[Record<string, string>[], React.Dispatch<React.SetStateAction<Record<string, string>[]>>]} */
  const [data, setData] = useState([]);
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
        message: "Google Sheets connected successfully",
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
      setSheets([]);
      setSelectedSheet(null);
      setHeaders([]);
      setData([]);
      notifications.show({
        title: "Disconnected",
        message: "Google Sheets has been disconnected",
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

  const handleListSheets = async () => {
    try {
      setError(null);
      const result = await listSheets({});
      if (result.success && result.spreadsheets) {
        setSheets(result.spreadsheets);
        notifications.show({
          title: "Spreadsheets Loaded",
          message: `Found ${result.spreadsheets.length} spreadsheets`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list spreadsheets");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list spreadsheets";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchSheet = async () => {
    if (!selectedSheet) {
      notifications.show({
        title: "Select a Spreadsheet",
        message: "Please select a spreadsheet first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setHeaders([]);
      setData([]);

      const result = await fetchSheet({ spreadsheetId: selectedSheet });
      if (result.success) {
        setHeaders(result.headers || []);
        setData(result.rows || []);
        notifications.show({
          title: "Data Loaded",
          message: `Loaded ${result.rows?.length || 0} rows`,
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
              <SiGooglesheets size={24} color="#0F9D58" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Google Sheets Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect to read data from your spreadsheets
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
              color={isConnected ? "gray" : "green"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect Google Sheets"}
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
              <Title order={4}>Spreadsheet Viewer</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleListSheets}
                loading={listingSheets}
                variant="light"
              >
                {sheets.length > 0 ? "Refresh" : "Load Spreadsheets"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {sheets.length > 0 && (
              <>
                <Select
                  label="Select a spreadsheet"
                  placeholder="Choose a spreadsheet..."
                  data={sheets.map((sheet) => ({
                    value: sheet.id,
                    label: sheet.name,
                  }))}
                  value={selectedSheet}
                  onChange={setSelectedSheet}
                  searchable
                  leftSection={<IconTable size={16} />}
                />

                <Button
                  onClick={handleFetchSheet}
                  loading={fetchingSheet}
                  disabled={!selectedSheet}
                  leftSection={<IconTable size={16} />}
                  color="green"
                >
                  Load Data
                </Button>
              </>
            )}

            {listingSheets && (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}

            {!listingSheets && sheets.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                Click "Load Spreadsheets" to see your Google Sheets
              </Text>
            )}

            {fetchingSheet && (
              <Card withBorder>
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <Loader size="md" />
                    <Text size="sm" c="dimmed">
                      Loading spreadsheet data...
                    </Text>
                  </Stack>
                </Center>
              </Card>
            )}

            {data.length > 0 && !fetchingSheet && (
              <Card withBorder p={0}>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        {headers.map((header, idx) => (
                          <Table.Th key={idx}>{header}</Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.slice(0, 50).map((row, rowIdx) => (
                        <Table.Tr key={rowIdx}>
                          {headers.map((header, colIdx) => (
                            <Table.Td key={colIdx}>{row[header] || "-"}</Table.Td>
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

export default SheetsPanel;
