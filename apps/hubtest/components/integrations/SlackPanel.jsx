/**
 * Slack Integration Panel
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
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandSlack,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconMessage,
  IconSparkles,
} from "@tabler/icons-react";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} SlackChannel
 * @property {string} id
 * @property {string} name
 * @property {boolean} isPrivate
 * @property {number} memberCount
 */

/**
 * @typedef {Object} SlackPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {SlackPanelProps} props
 */
export function SlackPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.slack);

  // Functions
  const { call: fetchChannels, loading: fetchingChannels } = useFunction("fetchSlackChannels");
  const { call: summarizeChannel, loading: summarizing } = useFunction("summarizeSlackChannel");

  // State
  /** @type {[SlackChannel[], React.Dispatch<React.SetStateAction<SlackChannel[]>>]} */
  const [channels, setChannels] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedChannel, setSelectedChannel] = useState(null);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [summary, setSummary] = useState(null);
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
        message: "Slack connected successfully",
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
      setChannels([]);
      setSelectedChannel(null);
      setSummary(null);
      notifications.show({
        title: "Disconnected",
        message: "Slack has been disconnected",
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

  const handleFetchChannels = async () => {
    try {
      setError(null);
      const result = await fetchChannels({});
      if (result.success && result.channels) {
        setChannels(result.channels);
        notifications.show({
          title: "Channels Loaded",
          message: `Found ${result.channels.length} channels`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch channels");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch channels";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleSummarize = async () => {
    if (!selectedChannel) {
      notifications.show({
        title: "Select a Channel",
        message: "Please select a channel first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setSummary(null);
      const result = await summarizeChannel({ channelId: selectedChannel });
      if (result.success && result.summary) {
        setSummary(result.summary);
        notifications.show({
          title: "Summary Generated",
          message: "Channel summary is ready",
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to generate summary");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to summarize";
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
            <IconBrandSlack size={40} color="#4A154B" />
            <div>
              <Text fw={500} size="lg">
                Slack Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect Slack to summarize channel conversations
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
              color={isConnected ? "gray" : "violet"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect Slack"}
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
              <Title order={4}>Channel Summarizer</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchChannels}
                loading={fetchingChannels}
                variant="light"
              >
                {channels.length > 0 ? "Refresh" : "Load Channels"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {channels.length > 0 && (
              <>
                <Select
                  label="Select a channel to summarize"
                  placeholder="Choose a channel..."
                  data={channels.map((ch) => ({
                    value: ch.id,
                    label: `#${ch.name}${ch.isPrivate ? " 🔒" : ""} (${ch.memberCount} members)`,
                  }))}
                  value={selectedChannel}
                  onChange={setSelectedChannel}
                  searchable
                  leftSection={<IconMessage size={16} />}
                />

                <Button
                  onClick={handleSummarize}
                  loading={summarizing}
                  disabled={!selectedChannel}
                  leftSection={<IconSparkles size={16} />}
                  color="violet"
                >
                  Generate Summary
                </Button>
              </>
            )}

            {fetchingChannels && (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            )}

            {!fetchingChannels && channels.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                Click "Load Channels" to see your Slack channels
              </Text>
            )}

            {summarizing && (
              <Card withBorder>
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <Loader size="md" />
                    <Text size="sm" c="dimmed">
                      Analyzing messages and generating summary...
                    </Text>
                  </Stack>
                </Center>
              </Card>
            )}

            {summary && !summarizing && (
              <Card withBorder>
                <Stack gap="sm">
                  <Group gap="xs">
                    <IconSparkles size={18} color="#7c3aed" />
                    <Text fw={500}>Channel Summary</Text>
                  </Group>
                  <Textarea
                    value={summary}
                    readOnly
                    autosize
                    minRows={4}
                    maxRows={15}
                    styles={{
                      input: {
                        backgroundColor: "#f8f9fa",
                        border: "none",
                      },
                    }}
                  />
                </Stack>
              </Card>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default SlackPanel;
