/**
 * Stripe Integration Panel
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
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconUsers,
  IconCreditCard,
  IconCash,
} from "@tabler/icons-react";
import { SiStripe } from "react-icons/si";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} StripeCustomer
 * @property {string} id
 * @property {string} [email]
 * @property {string} [name]
 * @property {string} created
 * @property {number} balance
 */

/**
 * @typedef {Object} StripePayment
 * @property {string} id
 * @property {number} amount
 * @property {string} currency
 * @property {string} status
 * @property {string} [description]
 * @property {string} [customerEmail]
 * @property {string} created
 * @property {boolean} paid
 */

/**
 * @typedef {Object} StripeBalance
 * @property {{amount: number, currency: string}[]} available
 * @property {{amount: number, currency: string}[]} pending
 */

/**
 * @typedef {Object} StripePanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {StripePanelProps} props
 */
export function StripePanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.stripe);

  // Functions
  const { call: fetchData, loading: fetchingData } = useFunction("fetchStripeData");

  // State
  /** @type {[StripeBalance | null, React.Dispatch<React.SetStateAction<StripeBalance | null>>]} */
  const [balance, setBalance] = useState(null);
  /** @type {[StripeCustomer[], React.Dispatch<React.SetStateAction<StripeCustomer[]>>]} */
  const [customers, setCustomers] = useState([]);
  /** @type {[StripePayment[], React.Dispatch<React.SetStateAction<StripePayment[]>>]} */
  const [payments, setPayments] = useState([]);
  /** @type {["customers" | "payments", React.Dispatch<React.SetStateAction<"customers" | "payments">>]} */
  const [view, setView] = useState("payments");
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
        message: "Stripe connected successfully",
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
      setBalance(null);
      setCustomers([]);
      setPayments([]);
      notifications.show({
        title: "Disconnected",
        message: "Stripe has been disconnected",
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
      const result = await fetchData({
        action: view === "customers" ? "listCustomers" : "listPayments",
      });

      if (result.success) {
        if (result.balance) setBalance(result.balance);
        if (result.customers) setCustomers(result.customers);
        if (result.payments) setPayments(result.payments);
        notifications.show({
          title: "Data Loaded",
          message: view === "customers"
            ? `Found ${result.customers?.length || 0} customers`
            : `Found ${result.payments?.length || 0} payments`,
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

  /**
   * @param {number} amount
   * @param {string} currency
   */
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ThemeIcon size={44} radius="md" variant="light" color="gray">
              <SiStripe size={24} color="#635BFF" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Stripe Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect your Stripe account to view payments and customers
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
              {isConnected ? "Disconnect" : "Connect Stripe"}
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
            {balance && (
              <Card withBorder>
                <Group justify="space-around">
                  <Stack align="center" gap={4}>
                    <Text size="sm" c="dimmed">
                      Available Balance
                    </Text>
                    <Group gap="xs">
                      <IconCash size={20} color="green" />
                      <Text fw={600} size="lg">
                        {balance.available
                          .map((b) => formatCurrency(b.amount, b.currency))
                          .join(" + ")}
                      </Text>
                    </Group>
                  </Stack>
                  <Stack align="center" gap={4}>
                    <Text size="sm" c="dimmed">
                      Pending Balance
                    </Text>
                    <Text fw={600} size="lg">
                      {balance.pending
                        .map((b) => formatCurrency(b.amount, b.currency))
                        .join(" + ")}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            )}

            <Group justify="space-between">
              <Tabs value={view} onChange={(v) => setView(v || "payments")}>
                <Tabs.List>
                  <Tabs.Tab value="payments" leftSection={<IconCreditCard size={16} />}>
                    Payments
                  </Tabs.Tab>
                  <Tabs.Tab value="customers" leftSection={<IconUsers size={16} />}>
                    Customers
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchData}
                loading={fetchingData}
              >
                {view === "payments"
                  ? payments.length > 0
                    ? "Refresh"
                    : "Load Payments"
                  : customers.length > 0
                    ? "Refresh"
                    : "Load Customers"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {view === "payments" ? (
              fetchingData ? (
                <Center py="xl">
                  <Loader size="lg" />
                </Center>
              ) : payments.length > 0 ? (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {payments.map((payment) => (
                      <Table.Tr key={payment.id}>
                        <Table.Td>
                          <Text fw={500}>{formatCurrency(payment.amount, payment.currency)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              payment.status === "succeeded"
                                ? "green"
                                : payment.status === "pending"
                                  ? "yellow"
                                  : "red"
                            }
                            size="sm"
                          >
                            {payment.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{payment.customerEmail || "-"}</Table.Td>
                        <Table.Td>{payment.description || "-"}</Table.Td>
                        <Table.Td>
                          {new Date(payment.created).toLocaleDateString()}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No payments loaded. Click "Load Payments" to fetch from Stripe.
                </Text>
              )
            ) : fetchingData ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : customers.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Balance</Table.Th>
                    <Table.Th>Created</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {customers.map((customer) => (
                    <Table.Tr key={customer.id}>
                      <Table.Td>{customer.name || "-"}</Table.Td>
                      <Table.Td>{customer.email || "-"}</Table.Td>
                      <Table.Td>{formatCurrency(customer.balance, "usd")}</Table.Td>
                      <Table.Td>
                        {new Date(customer.created).toLocaleDateString()}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No customers loaded. Click "Load Customers" to fetch from Stripe.
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default StripePanel;
