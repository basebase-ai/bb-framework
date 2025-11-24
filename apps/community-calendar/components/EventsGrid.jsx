import React, { useState, useMemo } from "react";
import {
  Container,
  SimpleGrid,
  TextInput,
  Group,
  Stack,
  Text,
  Loader,
  Center,
  Box,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconSearch, IconCalendar, IconMapPin } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";
import { EventCard } from "./EventCard.jsx";

import "@mantine/dates/styles.css";

export function EventsGrid() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");

  // Build query based on selected date
  const query = useMemo(() => {
    if (selectedDate) {
      // Query for events starting on or after the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      return {
        where: [["start", ">=", startOfDay]],
        orderBy: ["start", "asc"],
        limit: 100,
      };
    }
    
    // Default query - get upcoming events
    return {
      where: [["start", ">=", new Date()]],
      orderBy: ["start", "asc"],
      limit: 100,
    };
  }, [selectedDate]);

  const { data: events, loading, error } = useCollection(collections.events, query);

  // Local filtering for search and location
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let filtered = [...events];

    // Filter by search query (title, description, calendar name)
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        return (
          event.title?.toLowerCase().includes(lowerQuery) ||
          event.description?.toLowerCase().includes(lowerQuery) ||
          event.calendarName?.toLowerCase().includes(lowerQuery)
        );
      });
    }

    // Filter by location
    if (locationQuery.trim()) {
      const lowerLocation = locationQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        return event.location?.toLowerCase().includes(lowerLocation);
      });
    }

    return filtered;
  }, [events, searchQuery, locationQuery]);

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center py="xl">
        <Text c="red">Error loading events: {error.message}</Text>
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Search and Filter Controls */}
        <Box>
          <Group gap="md" align="flex-end" wrap="wrap">
            <TextInput
              placeholder="Search events..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 250 }}
              size="md"
            />

            <DatePickerInput
              placeholder="Select date"
              leftSection={<IconCalendar size={16} />}
              value={selectedDate}
              onChange={setSelectedDate}
              clearable
              minDate={new Date()}
              size="md"
              style={{ minWidth: 200 }}
            />

            <TextInput
              placeholder="Filter by location..."
              leftSection={<IconMapPin size={16} />}
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.currentTarget.value)}
              style={{ minWidth: 250 }}
              size="md"
            />
          </Group>

          <Text size="sm" c="dimmed" mt="md">
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </Text>
        </Box>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed" size="lg">
              No events found. Try adjusting your filters.
            </Text>
          </Center>
        ) : (
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
            spacing="lg"
          >
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}

