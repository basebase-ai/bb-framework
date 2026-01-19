/**
 * Apify Integration Panel
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
  Textarea,
  Anchor,
  Code,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconRobot,
  IconKey,
  IconBrandLinkedin,
  IconSearch,
  IconApi,
} from "@tabler/icons-react";
import { useFunction } from "../../../../framework/hooks/useFunction.js";
import { LinkedInProfileCard } from "./LinkedInProfileCard.jsx";

/**
 * @typedef {Object} ApifyActor
 * @property {string} id
 * @property {string} name
 * @property {string} [title]
 * @property {string} [username]
 * @property {string} [description]
 * @property {string} [createdAt]
 * @property {string} [modifiedAt]
 */

/**
 * @typedef {Object} LinkedInProfile
 * @property {string} [profileUrl]
 * @property {string} [fullName]
 * @property {string} [headline]
 * @property {string} [location]
 * @property {string} [about]
 * @property {string} [company]
 * @property {string} [profilePicture]
 */

/**
 * @typedef {Object} ApifyPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {ApifyPanelProps} props
 */
export function ApifyPanel({ user, onConnectionChange }) {
  // Functions
  const { call: credentialManager, loading: credLoading } = useFunction("credentialManager");
  const { call: fetchActors, loading: fetchingActors } = useFunction("fetchApifyActors");
  const { call: runActor, loading: runningActor } = useFunction("runApifyActor");

  // Credential helpers
  const saveCreds = (/** @type {Record<string, string>} */ creds) =>
    credentialManager({ action: "save", serviceName: "apify", credentials: creds });
  const getCreds = () => credentialManager({ action: "get", serviceName: "apify" });
  const deleteCreds = () => credentialManager({ action: "delete", serviceName: "apify" });

  // Connection state
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [connected, setConnected] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [apiToken, setApiToken] = useState("");

  // Data state
  /** @type {[ApifyActor[], React.Dispatch<React.SetStateAction<ApifyActor[]>>]} */
  const [actors, setActors] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);

  // LinkedIn scraper state
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [profileUrls, setProfileUrls] = useState("https://www.linkedin.com/in/williamhgates\nhttps://www.linkedin.com/in/grenager");
  /** @type {[LinkedInProfile[], React.Dispatch<React.SetStateAction<LinkedInProfile[]>>]} */
  const [scrapedProfiles, setScrapedProfiles] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [scrapeError, setScrapeError] = useState(null);

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
        message: "Please enter your Apify API token",
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
          message: "Apify API token saved successfully",
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
      setActors([]);
      setScrapedProfiles([]);
      notifications.show({
        title: "Disconnected",
        message: "Apify credentials removed",
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

  const handleFetchActors = async () => {
    try {
      setError(null);
      const result = await fetchActors({});
      if (result.success) {
        setActors(result.actors || []);
        notifications.show({
          title: "Actors Loaded",
          message: `Found ${result.actors?.length || 0} actors`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch actors");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch actors";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleScrapeProfiles = async () => {
    const urls = profileUrls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && url.includes("linkedin.com"));

    if (urls.length === 0) {
      notifications.show({
        title: "No URLs",
        message: "Please enter at least one LinkedIn profile URL",
        color: "yellow",
      });
      return;
    }

    try {
      setScrapeError(null);
      const result = await runActor({
        actorId: "dev_fusion/Linkedin-Profile-Scraper",
        input: { profileUrls: urls },
      });
      if (result.success) {
        setScrapedProfiles(result.items || []);
        notifications.show({
          title: "Scraping Complete",
          message: `Scraped ${result.items?.length || 0} profiles`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to scrape profiles");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scrape profiles";
      setScrapeError(message);
      notifications.show({
        title: "Scrape Failed",
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
              <IconApi size={24} color="#00D4AA" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Apify Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect your Apify account to run actors and scrapers
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
                  <Anchor href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer">
                    Apify Console → Settings → Integrations
                  </Anchor>
                </Text>
              }
              placeholder="Enter your Apify API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              leftSection={<IconKey size={16} />}
            />
            <Button
              onClick={handleConnect}
              loading={credLoading}
              color="teal"
              leftSection={<IconApi size={16} />}
            >
              Connect Apify
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
              <Title order={4}>Your Actors</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchActors}
                loading={fetchingActors}
              >
                {actors.length > 0 ? "Refresh" : "Load Actors"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {fetchingActors ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : (
              <>
                {actors.length > 0 && (
                  <>
                    <Group gap="xs">
                      <IconRobot size={18} />
                      <Text fw={500}>Actors ({actors.length})</Text>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Title</Table.Th>
                          <Table.Th>Last Modified</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {actors.map((actor) => (
                          <Table.Tr key={actor.id}>
                            <Table.Td>
                              <Anchor
                                href={`https://console.apify.com/actors/${actor.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                🤖 {actor.name || "Untitled"}
                              </Anchor>
                            </Table.Td>
                            <Table.Td>{actor.title || "-"}</Table.Td>
                            <Table.Td>
                              {actor.modifiedAt
                                ? new Date(actor.modifiedAt).toLocaleDateString()
                                : "-"}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}

                {actors.length === 0 && (
                  <Text c="dimmed" ta="center" py="xl">
                    No actors loaded. Click "Load Actors" to fetch from Apify.
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Paper>
      )}

      {connected && (
        <Paper shadow="sm" p="lg" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconBrandLinkedin size={22} color="#0A66C2" />
              <Title order={4}>LinkedIn Profile Scraper</Title>
            </Group>

            <Text size="sm" c="dimmed">
              Uses the <Code>dev_fusion/Linkedin-Profile-Scraper</Code> actor to extract profile data.
            </Text>

            <Textarea
              label="LinkedIn Profile URLs"
              description="Enter one URL per line"
              placeholder="https://www.linkedin.com/in/username"
              value={profileUrls}
              onChange={(e) => setProfileUrls(e.target.value)}
              minRows={3}
              maxRows={6}
              autosize
            />

            <Button
              leftSection={<IconSearch size={16} />}
              onClick={handleScrapeProfiles}
              loading={runningActor}
              color="blue"
            >
              Scrape Profiles
            </Button>

            {scrapeError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {scrapeError}
              </Alert>
            )}

            {scrapedProfiles.length > 0 && (
              <Stack gap="md">
                <Text fw={500}>Results ({scrapedProfiles.length} profiles)</Text>
                {scrapedProfiles.map((profile, index) => (
                  <LinkedInProfileCard key={index} profile={profile} />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default ApifyPanel;
