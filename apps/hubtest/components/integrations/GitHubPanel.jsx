/**
 * GitHub Integration Panel
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
  Avatar,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandGithub,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconStar,
  IconGitFork,
  IconLock,
} from "@tabler/icons-react";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} GithubUser
 * @property {string} login
 * @property {string} [name]
 * @property {string} [avatarUrl]
 * @property {number} publicRepos
 * @property {number} followers
 * @property {number} following
 */

/**
 * @typedef {Object} GithubRepo
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} private
 * @property {string} htmlUrl
 * @property {string} [language]
 * @property {number} stargazersCount
 * @property {number} forksCount
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} GitHubPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {GitHubPanelProps} props
 */
export function GitHubPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.github);

  // Functions
  const { call: fetchRepos, loading: fetchingRepos } = useFunction("fetchGithubRepos");

  // State
  /** @type {[GithubUser | null, React.Dispatch<React.SetStateAction<GithubUser | null>>]} */
  const [githubUser, setGithubUser] = useState(null);
  /** @type {[GithubRepo[], React.Dispatch<React.SetStateAction<GithubRepo[]>>]} */
  const [repos, setRepos] = useState([]);
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
        message: "GitHub connected successfully",
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
      setGithubUser(null);
      setRepos([]);
      notifications.show({
        title: "Disconnected",
        message: "GitHub has been disconnected",
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

  const handleFetchRepos = async () => {
    try {
      setError(null);
      const result = await fetchRepos({});
      if (result.success) {
        setGithubUser(result.user || null);
        setRepos(result.repos || []);
        notifications.show({
          title: "Repos Loaded",
          message: `Found ${result.repos?.length || 0} repositories`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch repos");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch repos";
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
            <IconBrandGithub size={40} color="#333" />
            <div>
              <Text fw={500} size="lg">
                GitHub Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect your GitHub account to view repositories
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
              color={isConnected ? "gray" : "dark"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect GitHub"}
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
              <Group gap="md">
                {githubUser && (
                  <>
                    <Avatar src={githubUser.avatarUrl} size="md" />
                    <div>
                      <Text fw={500}>{githubUser.name || githubUser.login}</Text>
                      <Text size="sm" c="dimmed">
                        @{githubUser.login}
                      </Text>
                    </div>
                  </>
                )}
              </Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchRepos}
                loading={fetchingRepos}
              >
                {repos.length > 0 ? "Refresh" : "Load Repos"}
              </Button>
            </Group>

            {githubUser && (
              <Group gap="lg">
                <Text size="sm">
                  <strong>{githubUser.publicRepos}</strong> repos
                </Text>
                <Text size="sm">
                  <strong>{githubUser.followers}</strong> followers
                </Text>
                <Text size="sm">
                  <strong>{githubUser.following}</strong> following
                </Text>
              </Group>
            )}

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {fetchingRepos ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : repos.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Repository</Table.Th>
                    <Table.Th>Language</Table.Th>
                    <Table.Th>Stars</Table.Th>
                    <Table.Th>Forks</Table.Th>
                    <Table.Th>Updated</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {repos.map((repo) => (
                    <Table.Tr key={repo.id}>
                      <Table.Td>
                        <Group gap="xs">
                          {repo.private && <IconLock size={14} color="gray" />}
                          <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit" }}
                          >
                            {repo.name}
                          </a>
                        </Group>
                        {repo.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {repo.description}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {repo.language ? (
                          <Badge size="sm" variant="light">
                            {repo.language}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <IconStar size={14} />
                          {repo.stargazersCount}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <IconGitFork size={14} />
                          {repo.forksCount}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : "-"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No repositories loaded. Click "Load Repos" to fetch from GitHub.
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default GitHubPanel;
