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
  Card,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconMailOpened,
} from "@tabler/icons-react";
import { SiGmail } from "react-icons/si";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} GmailPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

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
  const { call: scanGmail, loading: scanning } = useFunction("scanGmail");

  // State
  /** @type {[number | null, React.Dispatch<React.SetStateAction<number | null>>]} */
  const [count, setCount] = useState(null);
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
      setCount(null);
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
      // Pass the userId explicitly so the function knows which user to scan for
      const result = await scanGmail({ userId: user?.uid });
      console.log("scanGmail result:", result);
      if (result.success && typeof result.importantCount === "number") {
        setCount(result.importantCount);
        notifications.show({
          title: "Scan Complete",
          message: `Found ${result.importantCount} important emails`,
          color: "green",
        });
      } else if (result.success) {
        // Success but no importantCount - show message from result
        setCount(0);
        notifications.show({
          title: "Scan Complete",
          message: result.message || "No important emails found",
          color: "blue",
        });
      } else {
        throw new Error(result.error || "Failed to scan inbox");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan";
      console.error("scanGmail error:", err);
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
            ) : count !== null ? (
              <Card withBorder>
                <Center py="lg">
                  <Stack align="center" gap="sm">
                    <IconMailOpened size={48} color="#EA4335" />
                    <Text size="xl" fw={600}>
                      {count} important emails
                    </Text>
                    <Text size="sm" c="dimmed">
                      Found in your inbox
                    </Text>
                  </Stack>
                </Center>
              </Card>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Click "Scan Inbox" to check for important emails
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default GmailPanel;
