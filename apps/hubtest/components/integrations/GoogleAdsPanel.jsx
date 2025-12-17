/**
 * Google Ads Integration Panel
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
  Tabs,
  SimpleGrid,
  NumberFormatter,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconChartBar,
  IconAd,
  IconCash,
  IconClick,
  IconEye,
} from "@tabler/icons-react";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} GoogleAdsAccount
 * @property {string} id
 * @property {string} name
 * @property {string} currencyCode
 */

/**
 * @typedef {Object} GoogleAdsCampaign
 * @property {string} id
 * @property {string} name
 * @property {string} status
 * @property {number} impressions
 * @property {number} clicks
 * @property {number} cost
 * @property {number} conversions
 * @property {number} ctr
 */

/**
 * @typedef {Object} GoogleAdsAdGroup
 * @property {string} id
 * @property {string} name
 * @property {string} campaignName
 * @property {string} status
 * @property {number} impressions
 * @property {number} clicks
 * @property {number} cost
 */

/**
 * @typedef {Object} GoogleAdsPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * Google Ads icon component
 * @param {{ size?: number, color?: string }} props
 */
function GoogleAdsIcon({ size = 40, color = "#4285F4" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 18.5L9.5 6.5L15 14.5L9 26.5L3.5 18.5Z"
        fill="#FBBC04"
        transform="scale(0.85) translate(1, -2)"
      />
      <path
        d="M15 6.5L21 18.5L15 26.5L9 14.5L15 6.5Z"
        fill="#4285F4"
        transform="scale(0.85) translate(1, -2)"
      />
      <circle cx="17" cy="17" r="3" fill="#34A853" />
    </svg>
  );
}

/**
 * @param {GoogleAdsPanelProps} props
 */
export function GoogleAdsPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.googleAds);

  // Functions
  const { call: fetchGoogleAds, loading: fetchingData } = useFunction("fetchGoogleAds");

  // State
  /** @type {[GoogleAdsAccount[], React.Dispatch<React.SetStateAction<GoogleAdsAccount[]>>]} */
  const [accounts, setAccounts] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedAccount, setSelectedAccount] = useState(null);
  /** @type {[GoogleAdsCampaign[], React.Dispatch<React.SetStateAction<GoogleAdsCampaign[]>>]} */
  const [campaigns, setCampaigns] = useState([]);
  /** @type {[GoogleAdsAdGroup[], React.Dispatch<React.SetStateAction<GoogleAdsAdGroup[]>>]} */
  const [adGroups, setAdGroups] = useState([]);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [error, setError] = useState(null);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [activeTab, setActiveTab] = useState("campaigns");

  // Notify parent of connection changes
  React.useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  const handleConnect = async () => {
    try {
      await connect();
      notifications.show({
        title: "Connected!",
        message: "Google Ads connected successfully",
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
      setAccounts([]);
      setSelectedAccount(null);
      setCampaigns([]);
      setAdGroups([]);
      notifications.show({
        title: "Disconnected",
        message: "Google Ads has been disconnected",
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

  const handleFetchAccounts = async () => {
    try {
      setError(null);
      const result = await fetchGoogleAds({ action: "listAccounts" });
      if (result.success && result.accounts) {
        setAccounts(result.accounts);
        notifications.show({
          title: "Accounts Loaded",
          message: `Found ${result.accounts.length} Google Ads accounts`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to list accounts");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list accounts";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchCampaigns = async () => {
    if (!selectedAccount) {
      notifications.show({
        title: "Select an Account",
        message: "Please select a Google Ads account first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setCampaigns([]);

      const result = await fetchGoogleAds({
        action: "getCampaigns",
        accountId: selectedAccount,
      });

      if (result.success) {
        setCampaigns(result.campaigns || []);
        notifications.show({
          title: "Campaigns Loaded",
          message: `Found ${result.campaigns?.length || 0} campaigns`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch campaigns");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch campaigns";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchAdGroups = async () => {
    if (!selectedAccount) {
      notifications.show({
        title: "Select an Account",
        message: "Please select a Google Ads account first",
        color: "yellow",
      });
      return;
    }

    try {
      setError(null);
      setAdGroups([]);

      const result = await fetchGoogleAds({
        action: "getAdGroups",
        accountId: selectedAccount,
      });

      if (result.success) {
        setAdGroups(result.adGroups || []);
        notifications.show({
          title: "Ad Groups Loaded",
          message: `Found ${result.adGroups?.length || 0} ad groups`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch ad groups");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch ad groups";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  // Calculate summary metrics
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalCost = campaigns.reduce((sum, c) => sum + (c.cost || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);

  /**
   * Get status color for badge
   * @param {string} status
   * @returns {string}
   */
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ENABLED":
        return "green";
      case "PAUSED":
        return "yellow";
      case "REMOVED":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <GoogleAdsIcon size={40} />
            <div>
              <Text fw={500} size="lg">
                Google Ads Connection
              </Text>
              <Text size="sm" c="dimmed">
                Import your ads and performance data
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
              color={isConnected ? "gray" : "blue"}
              variant={isConnected ? "light" : "filled"}
            >
              {isConnected ? "Disconnect" : "Connect Google Ads"}
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
        <>
          <Paper shadow="sm" p="lg" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Account Selection</Title>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleFetchAccounts}
                  loading={fetchingData}
                  variant="light"
                >
                  {accounts.length > 0 ? "Refresh" : "Load Accounts"}
                </Button>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">
                  {error}
                </Alert>
              )}

              {accounts.length > 0 && (
                <Select
                  label="Select a Google Ads account"
                  placeholder="Choose an account..."
                  data={accounts.map((account) => ({
                    value: account.id,
                    label: `${account.name} (${account.id})`,
                  }))}
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                  searchable
                  leftSection={<IconAd size={16} />}
                />
              )}

              {!fetchingData && accounts.length === 0 && (
                <Text c="dimmed" ta="center" py="md">
                  Click "Load Accounts" to see your Google Ads accounts
                </Text>
              )}
            </Stack>
          </Paper>

          {selectedAccount && (
            <Paper shadow="sm" p="lg" withBorder>
              <Stack gap="md">
                <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "campaigns")}>
                  <Tabs.List>
                    <Tabs.Tab value="campaigns" leftSection={<IconChartBar size={16} />}>
                      Campaigns
                    </Tabs.Tab>
                    <Tabs.Tab value="adgroups" leftSection={<IconAd size={16} />}>
                      Ad Groups
                    </Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="campaigns" pt="md">
                    <Stack gap="md">
                      <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={handleFetchCampaigns}
                        loading={fetchingData}
                        variant="light"
                        color="blue"
                      >
                        {campaigns.length > 0 ? "Refresh Campaigns" : "Load Campaigns"}
                      </Button>

                      {campaigns.length > 0 && (
                        <>
                          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                            <Card withBorder p="md">
                              <Group gap="xs">
                                <IconEye size={20} color="#4285F4" />
                                <Text size="xs" c="dimmed">
                                  Impressions
                                </Text>
                              </Group>
                              <Text size="xl" fw={700}>
                                <NumberFormatter value={totalImpressions} thousandSeparator />
                              </Text>
                            </Card>
                            <Card withBorder p="md">
                              <Group gap="xs">
                                <IconClick size={20} color="#34A853" />
                                <Text size="xs" c="dimmed">
                                  Clicks
                                </Text>
                              </Group>
                              <Text size="xl" fw={700}>
                                <NumberFormatter value={totalClicks} thousandSeparator />
                              </Text>
                            </Card>
                            <Card withBorder p="md">
                              <Group gap="xs">
                                <IconCash size={20} color="#FBBC04" />
                                <Text size="xs" c="dimmed">
                                  Cost
                                </Text>
                              </Group>
                              <Text size="xl" fw={700}>
                                <NumberFormatter
                                  value={totalCost / 1000000}
                                  prefix="$"
                                  decimalScale={2}
                                  thousandSeparator
                                />
                              </Text>
                            </Card>
                            <Card withBorder p="md">
                              <Group gap="xs">
                                <IconChartBar size={20} color="#EA4335" />
                                <Text size="xs" c="dimmed">
                                  Conversions
                                </Text>
                              </Group>
                              <Text size="xl" fw={700}>
                                <NumberFormatter
                                  value={totalConversions}
                                  decimalScale={1}
                                  thousandSeparator
                                />
                              </Text>
                            </Card>
                          </SimpleGrid>

                          <Card withBorder p={0}>
                            <ScrollArea>
                              <Table striped highlightOnHover>
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th>Campaign</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: "right" }}>
                                      Impressions
                                    </Table.Th>
                                    <Table.Th style={{ textAlign: "right" }}>Clicks</Table.Th>
                                    <Table.Th style={{ textAlign: "right" }}>CTR</Table.Th>
                                    <Table.Th style={{ textAlign: "right" }}>Cost</Table.Th>
                                    <Table.Th style={{ textAlign: "right" }}>
                                      Conversions
                                    </Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {campaigns.map((campaign) => (
                                    <Table.Tr key={campaign.id}>
                                      <Table.Td>
                                        <Text size="sm" fw={500}>
                                          {campaign.name}
                                        </Text>
                                      </Table.Td>
                                      <Table.Td>
                                        <Badge
                                          size="sm"
                                          color={getStatusColor(campaign.status)}
                                          variant="light"
                                        >
                                          {campaign.status}
                                        </Badge>
                                      </Table.Td>
                                      <Table.Td style={{ textAlign: "right" }}>
                                        <NumberFormatter
                                          value={campaign.impressions || 0}
                                          thousandSeparator
                                        />
                                      </Table.Td>
                                      <Table.Td style={{ textAlign: "right" }}>
                                        <NumberFormatter
                                          value={campaign.clicks || 0}
                                          thousandSeparator
                                        />
                                      </Table.Td>
                                      <Table.Td style={{ textAlign: "right" }}>
                                        {((campaign.ctr || 0) * 100).toFixed(2)}%
                                      </Table.Td>
                                      <Table.Td style={{ textAlign: "right" }}>
                                        <NumberFormatter
                                          value={(campaign.cost || 0) / 1000000}
                                          prefix="$"
                                          decimalScale={2}
                                          thousandSeparator
                                        />
                                      </Table.Td>
                                      <Table.Td style={{ textAlign: "right" }}>
                                        <NumberFormatter
                                          value={campaign.conversions || 0}
                                          decimalScale={1}
                                        />
                                      </Table.Td>
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </ScrollArea>
                          </Card>
                        </>
                      )}

                      {fetchingData && (
                        <Center py="xl">
                          <Stack align="center" gap="sm">
                            <Loader size="md" />
                            <Text size="sm" c="dimmed">
                              Loading campaigns...
                            </Text>
                          </Stack>
                        </Center>
                      )}

                      {!fetchingData && campaigns.length === 0 && (
                        <Text c="dimmed" ta="center" py="md">
                          Click "Load Campaigns" to see your campaign data
                        </Text>
                      )}
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="adgroups" pt="md">
                    <Stack gap="md">
                      <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={handleFetchAdGroups}
                        loading={fetchingData}
                        variant="light"
                        color="blue"
                      >
                        {adGroups.length > 0 ? "Refresh Ad Groups" : "Load Ad Groups"}
                      </Button>

                      {adGroups.length > 0 && (
                        <Card withBorder p={0}>
                          <ScrollArea>
                            <Table striped highlightOnHover>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>Ad Group</Table.Th>
                                  <Table.Th>Campaign</Table.Th>
                                  <Table.Th>Status</Table.Th>
                                  <Table.Th style={{ textAlign: "right" }}>
                                    Impressions
                                  </Table.Th>
                                  <Table.Th style={{ textAlign: "right" }}>Clicks</Table.Th>
                                  <Table.Th style={{ textAlign: "right" }}>Cost</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {adGroups.map((adGroup) => (
                                  <Table.Tr key={adGroup.id}>
                                    <Table.Td>
                                      <Text size="sm" fw={500}>
                                        {adGroup.name}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm" c="dimmed">
                                        {adGroup.campaignName}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Badge
                                        size="sm"
                                        color={getStatusColor(adGroup.status)}
                                        variant="light"
                                      >
                                        {adGroup.status}
                                      </Badge>
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: "right" }}>
                                      <NumberFormatter
                                        value={adGroup.impressions || 0}
                                        thousandSeparator
                                      />
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: "right" }}>
                                      <NumberFormatter
                                        value={adGroup.clicks || 0}
                                        thousandSeparator
                                      />
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: "right" }}>
                                      <NumberFormatter
                                        value={(adGroup.cost || 0) / 1000000}
                                        prefix="$"
                                        decimalScale={2}
                                        thousandSeparator
                                      />
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </ScrollArea>
                        </Card>
                      )}

                      {fetchingData && (
                        <Center py="xl">
                          <Stack align="center" gap="sm">
                            <Loader size="md" />
                            <Text size="sm" c="dimmed">
                              Loading ad groups...
                            </Text>
                          </Stack>
                        </Center>
                      )}

                      {!fetchingData && adGroups.length === 0 && (
                        <Text c="dimmed" ta="center" py="md">
                          Click "Load Ad Groups" to see your ad group data
                        </Text>
                      )}
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}

export default GoogleAdsPanel;
