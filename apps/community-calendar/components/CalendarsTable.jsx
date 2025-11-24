import React, { useState } from "react";
import {
  Container,
  Table,
  Text,
  Badge,
  Loader,
  Center,
  Stack,
  Title,
  Paper,
  ActionIcon,
  Tooltip,
  Button,
  Group,
} from "@mantine/core";
import { IconRefresh, IconPlus, IconFileText } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections, APP_ID } from "../schema.js";
import { CalendarModal } from "./CalendarModal.jsx";
import { AddCalendarModal } from "./AddCalendarModal.jsx";

export function CalendarsTable() {
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [scrapingCalendarId, setScrapingCalendarId] = useState(null);

  const { data: calendars, loading, error } = useCollection(collections.calendars, {
    orderBy: ["name", "asc"],
    realtime: true,
  });

  const { call: scrapeCalendar } = useFunction("scrapeWebCalendars");
  const { call: scrapeEvents, loading: scrapingEvents } = useFunction("scrapeEventPages");

  const handleRowClick = (calendar) => {
    setSelectedCalendar(calendar);
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setSelectedCalendar(null);
  };

  const handleScrape = async (e, calendar) => {
    e.stopPropagation(); // Prevent row click
    
    setScrapingCalendarId(calendar.id);
    
    try {
      const result = await scrapeCalendar(
        {
          calendarsCollection: "calendars", // Server context will namespace this
          eventsCollection: "events",        // Server context will namespace this
          calendarIds: [calendar.id],
          forceRescrape: true,
        },
        { appId: APP_ID } // Pass appId for automatic namespacing
      );

      if (result.success) {
        notifications.show({
          title: "Scraping Complete",
          message: `Found ${result.totalEventsFound} events (${result.totalEventsNew} new, ${result.totalEventsDuplicate} duplicates)`,
          color: "green",
        });
      } else {
        throw new Error("Scraping failed");
      }
    } catch (err) {
      console.error("Scraping error:", err);
      
      notifications.show({
        title: "Scraping Failed",
        message: err?.message || "An error occurred while scraping",
        color: "red",
        autoClose: false, // Keep it open so user can read the error
      });
    } finally {
      setScrapingCalendarId(null);
    }
  };

  const handleScrapeEvents = async () => {
    try {
      const result = await scrapeEvents(
        {
          eventsCollection: "events", // Server context will namespace this
          maxEvents: 50, // Limit to 50 events per run to avoid timeouts
        },
        { appId: APP_ID }
      );

      if (result.success) {
        notifications.show({
          title: "Event Scraping Complete",
          message: `Processed ${result.eventsProcessed} events (${result.eventsScraped} scraped, ${result.eventsFailed} failed)`,
          color: "green",
        });
      } else {
        throw new Error("Event scraping failed");
      }
    } catch (err) {
      console.error("Event scraping error:", err);
      
      notifications.show({
        title: "Event Scraping Failed",
        message: err?.message || "An error occurred while scraping events",
        color: "red",
        autoClose: false,
      });
    }
  };

  // Only show loading spinner on initial load (when we have no data yet)
  if (loading && !calendars) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center py="xl">
        <Text c="red">Error loading calendars: {error.message}</Text>
      </Center>
    );
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Never";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    if (!status) return <Badge color="gray">Unknown</Badge>;
    
    const statusColors = {
      success: "green",
      error: "red",
      pending: "yellow",
    };

    return (
      <Badge color={statusColors[status] || "gray"}>
        {status}
      </Badge>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2} mb="xs">
              Calendar Management
            </Title>
            <Text c="dimmed">
              Manage scraping calendars. Click on a row to edit.
            </Text>
          </div>
          <Group>
            <Button
              leftSection={<IconFileText size={16} />}
              onClick={handleScrapeEvents}
              loading={scrapingEvents}
              variant="light"
            >
              Scrape Events
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setAddModalOpened(true)}
            >
              Add Calendar
            </Button>
          </Group>
        </Group>

        <Paper withBorder>
          <Table.ScrollContainer minWidth={800}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>URL</Table.Th>
                  <Table.Th>Last Scraped</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Count</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {calendars && calendars.length > 0 ? (
                  calendars.map((calendar) => (
                    <Table.Tr
                      key={calendar.id}
                      onClick={() => handleRowClick(calendar)}
                      style={{ cursor: "pointer" }}
                    >
                      <Table.Td>
                        <Text fw={500}>{calendar.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" lineClamp={1}>
                          {calendar.url}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {formatTimestamp(calendar.scrapedAt)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {getStatusBadge(calendar.lastScrapeStatus)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {calendar.lastScrapeCount !== undefined ? (
                            <>
                              {calendar.lastScrapeCount}
                              {calendar.lastScrapeNew !== undefined && (
                                <Text size="xs" c="dimmed" component="span">
                                  {" "}({calendar.lastScrapeNew} new)
                                </Text>
                              )}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </Text>
                      </Table.Td>
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Tooltip label="Scrape now">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            loading={scrapingCalendarId === calendar.id}
                            onClick={(e) => handleScrape(e, calendar)}
                          >
                            <IconRefresh size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Center py="xl">
                        <Text c="dimmed">No calendars found</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>

      <CalendarModal
        calendar={selectedCalendar}
        opened={modalOpened}
        onClose={handleCloseModal}
      />

      <AddCalendarModal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
      />
    </Container>
  );
}

