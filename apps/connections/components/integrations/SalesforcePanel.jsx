/**
 * Salesforce Integration Panel
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
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconAddressBook,
  IconBuilding,
} from "@tabler/icons-react";
import { SiSalesforce } from "react-icons/si";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} SalesforceContact
 * @property {string} id
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [accountName]
 * @property {string} [title]
 */

/**
 * @typedef {Object} SalesforceAccount
 * @property {string} id
 * @property {string} [name]
 * @property {string} [industry]
 * @property {string} [type]
 * @property {string} [billingCity]
 * @property {string} [billingState]
 * @property {string} [website]
 */

/**
 * @typedef {Object} SalesforcePanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {SalesforcePanelProps} props
 */
export function SalesforcePanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.salesforce);

  // Functions
  const { call: fetchContacts, loading: fetchingContacts } = useFunction("fetchSalesforceContacts");
  const { call: fetchAccounts, loading: fetchingAccounts } = useFunction("fetchSalesforceAccounts");

  // State
  /** @type {[SalesforceContact[], React.Dispatch<React.SetStateAction<SalesforceContact[]>>]} */
  const [contacts, setContacts] = useState([]);
  /** @type {[SalesforceAccount[], React.Dispatch<React.SetStateAction<SalesforceAccount[]>>]} */
  const [accounts, setAccounts] = useState([]);
  /** @type {["contacts" | "accounts", React.Dispatch<React.SetStateAction<"contacts" | "accounts">>]} */
  const [view, setView] = useState("contacts");
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
        message: "Salesforce connected successfully",
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
      setContacts([]);
      setAccounts([]);
      notifications.show({
        title: "Disconnected",
        message: "Salesforce has been disconnected",
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

  const handleFetchContacts = async () => {
    try {
      setError(null);
      const result = await fetchContacts({});
      if (result.success && result.contacts) {
        setContacts(result.contacts);
        notifications.show({
          title: "Contacts Loaded",
          message: `Found ${result.contacts.length} contacts`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch contacts");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch contacts";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleFetchAccounts = async () => {
    try {
      setError(null);
      const result = await fetchAccounts({});
      if (result.success && result.accounts) {
        setAccounts(result.accounts);
        notifications.show({
          title: "Accounts Loaded",
          message: `Found ${result.accounts.length} accounts`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch accounts");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch accounts";
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
              <SiSalesforce size={24} color="#00A1E0" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Salesforce Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect your Salesforce account to view CRM data
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
              {isConnected ? "Disconnect" : "Connect Salesforce"}
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
              <Tabs value={view} onChange={(v) => setView(v || "contacts")}>
                <Tabs.List>
                  <Tabs.Tab value="contacts" leftSection={<IconAddressBook size={16} />}>
                    Contacts
                  </Tabs.Tab>
                  <Tabs.Tab value="accounts" leftSection={<IconBuilding size={16} />}>
                    Accounts
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={view === "contacts" ? handleFetchContacts : handleFetchAccounts}
                loading={view === "contacts" ? fetchingContacts : fetchingAccounts}
              >
                {view === "contacts"
                  ? contacts.length > 0
                    ? "Refresh"
                    : "Load Contacts"
                  : accounts.length > 0
                    ? "Refresh"
                    : "Load Accounts"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {view === "contacts" ? (
              fetchingContacts ? (
                <Center py="xl">
                  <Loader size="lg" />
                </Center>
              ) : contacts.length > 0 ? (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Account</Table.Th>
                      <Table.Th>Title</Table.Th>
                      <Table.Th>Phone</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {contacts.map((contact) => (
                      <Table.Tr key={contact.id}>
                        <Table.Td>
                          {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "-"}
                        </Table.Td>
                        <Table.Td>{contact.email || "-"}</Table.Td>
                        <Table.Td>{contact.accountName || "-"}</Table.Td>
                        <Table.Td>{contact.title || "-"}</Table.Td>
                        <Table.Td>{contact.phone || "-"}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No contacts loaded. Click "Load Contacts" to fetch from Salesforce.
                </Text>
              )
            ) : fetchingAccounts ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : accounts.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Industry</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Website</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {accounts.map((account) => (
                    <Table.Tr key={account.id}>
                      <Table.Td>{account.name || "-"}</Table.Td>
                      <Table.Td>{account.industry || "-"}</Table.Td>
                      <Table.Td>{account.type || "-"}</Table.Td>
                      <Table.Td>
                        {[account.billingCity, account.billingState].filter(Boolean).join(", ") ||
                          "-"}
                      </Table.Td>
                      <Table.Td>
                        {account.website ? (
                          <a href={account.website} target="_blank" rel="noopener noreferrer">
                            {account.website}
                          </a>
                        ) : (
                          "-"
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No accounts loaded. Click "Load Accounts" to fetch from Salesforce.
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default SalesforcePanel;
