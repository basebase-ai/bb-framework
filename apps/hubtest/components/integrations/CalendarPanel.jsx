/**
 * Google Calendar Integration Panel
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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { SiGooglecalendar } from "react-icons/si";
import {
  useNangoOAuth,
  NangoIntegrations,
} from "../../../../framework/hooks/useNangoOAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} summary
 * @property {string} [description]
 * @property {string} [location]
 * @property {string} start
 * @property {string} end
 * @property {boolean} allDay
 * @property {string} [htmlLink]
 */

/**
 * @typedef {Object} CalendarPanelProps
 * @property {import("firebase/auth").User | null} user
 * @property {(connected: boolean) => void} [onConnectionChange]
 */

/**
 * @param {CalendarPanelProps} props
 */
export function CalendarPanel({ user, onConnectionChange }) {
  // OAuth
  const {
    isConnected,
    connect,
    disconnect,
    loading: oauthLoading,
    error: oauthError,
  } = useNangoOAuth(NangoIntegrations.googleCalendar);

  // Functions
  const { call: fetchEvents, loading: fetchingEvents } = useFunction("fetchGoogleCalendarEvents");

  // State
  /** @type {[CalendarEvent[], React.Dispatch<React.SetStateAction<CalendarEvent[]>>]} */
  const [events, setEvents] = useState([]);
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
        message: "Google Calendar connected successfully",
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
      setEvents([]);
      notifications.show({
        title: "Disconnected",
        message: "Google Calendar has been disconnected",
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

  const handleFetchEvents = async () => {
    try {
      setError(null);
      const result = await fetchEvents({});
      if (result.success && result.events) {
        setEvents(result.events);
        notifications.show({
          title: "Events Loaded",
          message: `Found ${result.events.length} upcoming events`,
          color: "green",
        });
      } else {
        throw new Error(result.error || "Failed to fetch events");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch events";
      setError(message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  /**
   * @param {string} dateStr
   */
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Stack gap="lg">
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ThemeIcon size={44} radius="md" variant="light" color="gray">
              <SiGooglecalendar size={24} color="#4285F4" />
            </ThemeIcon>
            <div>
              <Text fw={500} size="lg">
                Google Calendar Connection
              </Text>
              <Text size="sm" c="dimmed">
                Connect to view your upcoming events
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
              {isConnected ? "Disconnect" : "Connect Calendar"}
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
              <Title order={4}>Upcoming Events</Title>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleFetchEvents}
                loading={fetchingEvents}
              >
                {events.length > 0 ? "Refresh" : "Load Events"}
              </Button>
            </Group>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}

            {fetchingEvents ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : events.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Event</Table.Th>
                    <Table.Th>Start</Table.Th>
                    <Table.Th>End</Table.Th>
                    <Table.Th>Location</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {events.map((event) => (
                    <Table.Tr key={event.id}>
                      <Table.Td>
                        <Group gap="xs">
                          <IconCalendarEvent size={16} color="#4285F4" />
                          {event.htmlLink ? (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "inherit" }}
                            >
                              {event.summary || "No title"}
                            </a>
                          ) : (
                            event.summary || "No title"
                          )}
                        </Group>
                        {event.allDay && (
                          <Badge size="xs" variant="light" ml="xs">
                            All day
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>{formatDateTime(event.start)}</Table.Td>
                      <Table.Td>{formatDateTime(event.end)}</Table.Td>
                      <Table.Td>{event.location || "-"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No events loaded. Click "Load Events" to fetch from Google Calendar.
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default CalendarPanel;
