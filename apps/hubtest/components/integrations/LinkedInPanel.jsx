/**
 * LinkedIn (via Airtop) Integration Panel
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
  Tabs,
  Card,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandLinkedin,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconUsers,
  IconNews,
  IconWorld,
  IconPlugConnected,
} from "@tabler/icons-react";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} LinkedInConnection
 * @property {string} name
 * @property {string} [headline]
 * @property {string} [profileUrl]
 * @property {string} [connectedDate]
 */

/**
 * @typedef {Object} LinkedInPost
 * @property {string} authorName
 * @property {string} content
 * @property {string} [timestamp]
 * @property {number} [likes]
 * @property {number} [comments]
 */

/**
 * @typedef {Object} LinkedInPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {LinkedInPanelProps} props
 */
export function LinkedInPanel({ user, onConnectionChange }) {
  // Functions (Airtop-based)
  const { call: airtopSession, loading: sessionLoading } = useFunction("airtopSession");
  const { call: airtopLinkedIn, loading: linkedInLoading } = useFunction("airtopLinkedIn");

  // State
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [connected, setConnected] = useState(false);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [liveViewUrl, setLiveViewUrl] = useState(null);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [sessionId, setSessionId] = useState(null);
  /** @type {[LinkedInConnection[], React.Dispatch<React.SetStateAction<LinkedInConnection[]>>]} */
  const [connections, setConnections] = useState([]);
  /** @type {[LinkedInPost[], React.Dispatch<React.SetStateAction<LinkedInPost[]>>]} */
  const [feed, setFeed] = useState([]);
  /** @type {["connections" | "feed", React.Dispatch<React.SetStateAction<"connections" | "feed">>]} */
  const [view, setView] = useState("connections");
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);

  // Check profile on mount
  React.useEffect(() => {
    const checkProfile = async () => {
      try {
        const result = await airtopSession({
          action: "checkProfile",
          profileName: "linkedin",
        });
        if (result.success && result.hasProfile) {
          setConnected(true);
          onConnectionChange?.(true);
        }
      } catch (err) {
        // No profile saved
      }
    };
    if (user) {
      checkProfile();
    }
  }, [user]);

  // Notify parent of connection changes
  React.useEffect(() => {
    onConnectionChange?.(connected);
  }, [connected, onConnectionChange]);

  const handleStartSession = async () => {
    try {
      setError(null);
      const result = await airtopSession({
        action: "create",
        profileName: "linkedin",
      });

      if (result.success && result.liveViewUrl) {
        setSessionId(result.sessionId);
        setLiveViewUrl(result.liveViewUrl);
        notifications.show({
          title: "Session Started",
          message: "Please login to LinkedIn in the browser window",
          color: "blue",
        });
      } else {
        throw new Error(result.error || "Failed to start session");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start session";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!sessionId) return;

    try {
      setError(null);
      const result = await airtopSession({
        action: "saveProfile",
        sessionId,
        profileName: "linkedin",
      });

      if (result.success) {
        setConnected(true);
        setLiveViewUrl(null);
        setSessionId(null);
        notifications.show({
          title: "Profile Saved",
          message: "LinkedIn login saved successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      } else {
        throw new Error(result.error || "Failed to save profile");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await airtopSession({
        action: "deleteProfile",
        profileName: "linkedin",
      });
      setConnected(false);
      setConnections([]);
      setFeed([]);
      notifications.show({
        title: "Disconnected",
        message: "LinkedIn profile removed",
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

  const handleFetchData = async () => {
    try {
      setError(null);
      const result = await airtopLinkedIn({
        action: view === "connections" ? "getConnections" : "getFeed",
        profileName: "linkedin",
      });

      if (result.success) {
        if (view === "connections" && result.connections) {
          setConnections(result.connections);
          notifications.show({
            title: "Connections Loaded",
            message: `Found ${result.connections.length} connections`,
            color: "green",
          });
        } else if (view === "feed" && result.posts) {
          setFeed(result.posts);
          notifications.show({
            title: "Feed Loaded",
            message: `Found ${result.posts.length} posts`,
            color: "green",
          });
        }
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
            <IconBrandLinkedin size={40} color="#0A66C2" />
            <div>
              <Text fw={500} size="lg">
                LinkedIn Connection (via Airtop)
              </Text>
              <Text size="sm" c="dimmed">
                Connect via browser automation to access LinkedIn data
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            {connected && (
              <>
                <Badge color="green" size="lg" leftSection={<IconCheck size={14} />}>
                  Connected
                </Badge>
                <Button
                  onClick={handleDisconnect}
                  loading={sessionLoading}
                  color="gray"
                  variant="light"
                >
                  Disconnect
                </Button>
              </>
            )}
          </Group>
        </Group>

        {!connected && !liveViewUrl && (
          <Stack gap="md" mt="lg">
            <Alert icon={<IconWorld size={16} />} color="blue">
              LinkedIn requires browser-based authentication via Airtop. Click below to start a
              session and login to your LinkedIn account.
            </Alert>
            <Button
              onClick={handleStartSession}
              loading={sessionLoading}
              color="blue"
              leftSection={<IconPlugConnected size={16} />}
            >
              Start Browser Session
            </Button>
          </Stack>
        )}

        {liveViewUrl && !connected && (
          <Stack gap="md" mt="lg">
            <Alert icon={<IconWorld size={16} />} color="yellow">
              Browser session is active. Login to LinkedIn in the window below, then click "Save
              Profile" when done.
            </Alert>
            <Card withBorder p={0}>
              <iframe
                src={liveViewUrl}
                style={{ width: "100%", height: "500px", border: "none" }}
                title="LinkedIn Login"
              />
            </Card>
            <Button onClick={handleSaveProfile} loading={sessionLoading} color="green">
              Save Profile
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
              <Tabs value={view} onChange={(v) => setView(v || "connections")}>
                <Tabs.List>
                  <Tabs.Tab value="connections" leftSection={<IconUsers size={16} />}>
                    Connections
                  </Tabs.Tab>
                  <Tabs.Tab value="feed" leftSection={<IconNews size={16} />}>
                    Feed
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchData}
                loading={linkedInLoading}
              >
                {view === "connections"
                  ? connections.length > 0
                    ? "Refresh"
                    : "Load Connections"
                  : feed.length > 0
                    ? "Refresh"
                    : "Load Feed"}
              </Button>
            </Group>

            {linkedInLoading ? (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <Loader size="lg" />
                  <Text size="sm" c="dimmed">
                    Fetching from LinkedIn...
                  </Text>
                </Stack>
              </Center>
            ) : view === "connections" ? (
              connections.length > 0 ? (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Headline</Table.Th>
                      <Table.Th>Connected</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {connections.map((conn, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          {conn.profileUrl ? (
                            <a
                              href={conn.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {conn.name}
                            </a>
                          ) : (
                            conn.name
                          )}
                        </Table.Td>
                        <Table.Td>{conn.headline || "-"}</Table.Td>
                        <Table.Td>{conn.connectedDate || "-"}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No connections loaded. Click "Load Connections" to fetch.
                </Text>
              )
            ) : feed.length > 0 ? (
              <Stack gap="md">
                {feed.map((post, idx) => (
                  <Card key={idx} withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text fw={500}>{post.authorName}</Text>
                      <Text size="xs" c="dimmed">
                        {post.timestamp || ""}
                      </Text>
                    </Group>
                    <Text size="sm" lineClamp={4}>
                      {post.content}
                    </Text>
                    <Group gap="lg" mt="sm">
                      <Text size="xs" c="dimmed">
                        👍 {post.likes || 0}
                      </Text>
                      <Text size="xs" c="dimmed">
                        💬 {post.comments || 0}
                      </Text>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No posts loaded. Click "Load Feed" to fetch.
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default LinkedInPanel;
