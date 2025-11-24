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
} from "@mantine/core";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";
import { CalendarModal } from "./CalendarModal.jsx";

export function CalendarsTable() {
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);

  const { data: calendars, loading, error } = useCollection(collections.calendars, {
    orderBy: ["name", "asc"],
    realtime: true,
  });

  const handleRowClick = (calendar) => {
    setSelectedCalendar(calendar);
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setSelectedCalendar(null);
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
        <div>
          <Title order={2} mb="xs">
            Calendar Management
          </Title>
          <Text c="dimmed">
            Manage scraping calendars. Click on a row to edit.
          </Text>
        </div>

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
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
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
    </Container>
  );
}

