/**
 * Gmail Integration Panel
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
  ThemeIcon,
  Box,
  ScrollArea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconMail,
  IconInbox,
} from "@tabler/icons-react";
import { SiGmail } from "react-icons/si";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} GmailMessage
 * @property {string} gmailMessageId
 * @property {string | null} from
 * @property {string | null} subject
 * @property {string | null} snippet
 * @property {string | null} date
 * @property {string | null} internalDate
 * @property {string[]} labelIds
 */

/**
 * @typedef {Object} GmailPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * Parse email sender to get display name
 * @param {string | null} from
 * @returns {string}
 */
function parseSender(from) {
  if (!from) return "Unknown";
  // Extract name from "Name <email>" format
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim();
  // If no name, return email without angle brackets
  return from.replace(/<|>/g, "").trim();
}

/**
 * Format date for display
 * @param {string | null} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * @param {GmailPanelProps} props
 */
export function GmailPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.googleMail);

  // Functions
  const { call: readGmail, loading: scanning } = useFunction("readGmail");

  // State
  /** @type {[GmailMessage[], React.Dispatch<React.SetStateAction<GmailMessage[]>>]} */
  const [messages, setMessages] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [hasScanned, setHasScanned] = useState(false);

  // Notify parent of connection changes
  React.useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  const handleConnect = async () => {
    try {
      await connect();
      notifications.show({
        title: "Connected!",
        message: "Gmail connected successfully",
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
      setMessages([]);
      setHasScanned(false);
      notifications.show({
        title: "Disconnected",
        message: "Gmail has been disconnected",
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

  const handleScan = async () => {
    try {
      setError(null);
      const uid = user?.uid;
      if (!uid) {
        throw new Error("No user logged in");
      }

      // Call readGmail directly - it fetches the Nango token using userId
      const result = await readGmail({
        userId: uid,
        query: "is:unread",
        maxResults: 20,
        excludeBodies: true,
      });
      console.log("readGmail result:", result);

      if (result.success) {
        setMessages(result.messages || []);
        setHasScanned(true);
        const count = result.messageCount ?? 0;
        notifications.show({
          title: "Scan Complete",
          message: `Found ${count} unread email${count !== 1 ? "s" : ""}`,
          color: "green",
        });
      } else {
        throw new Error("Failed to read inbox");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan";
      console.error("readGmail error:", err);
      setError(message);
      notifications.show({
        title: "Scan Failed",
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
              <SiGmail size={24} color="#EA4335" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Gmail Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect Gmail to scan your inbox
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
              color={isConnected ? "gray" : "red"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect Gmail"}
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
              <Title order={4}>Inbox Scanner</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleScan}
                loading={scanning}
              >
                Scan Inbox
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {scanning ? (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <Loader size="lg" />
                  <Text size="sm" c="dimmed">
                    Scanning inbox...
                  </Text>
                </Stack>
              </Center>
            ) : hasScanned ? (
              messages.length > 0 ? (
                <ScrollArea.Autosize mah={400}>
                  <Stack gap={0}>
                    {messages.map((msg) => (
                      <Box
                        key={msg.gmailMessageId}
                        p="sm"
                        style={(theme) => ({
                          borderBottom: `1px solid ${theme.colors.gray[2]}`,
                          "&:last-child": { borderBottom: "none" },
                        })}
                      >
                        <Group justify="space-between" wrap="nowrap" mb={4}>
                          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                            <IconMail size={16} color="#EA4335" style={{ flexShrink: 0 }} />
                            <Text fw={500} size="sm" truncate style={{ flex: 1 }}>
                              {parseSender(msg.from)}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                            {formatDate(msg.internalDate || msg.date)}
                          </Text>
                        </Group>
                        <Text size="sm" fw={500} truncate mb={2}>
                          {msg.subject || "(no subject)"}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {msg.snippet || ""}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              ) : (
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <IconInbox size={48} color="gray" />
                    <Text c="dimmed">No unread emails</Text>
                  </Stack>
                </Center>
              )
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Click "Scan Inbox" to check for unread emails
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default GmailPanel;
