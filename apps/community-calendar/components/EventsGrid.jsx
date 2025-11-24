import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  Autocomplete,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconSearch, IconCalendar, IconMapPin, IconX } from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import { collection, query as firestoreQuery, where, orderBy as firestoreOrderBy, limit as firestoreLimit, getDocs } from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { db } from "../../../framework/core/firebase-init.js";
import { collections } from "../schema.js";
import { EventCard } from "./EventCard.jsx";

import "@mantine/dates/styles.css";

const RADIUS_MILES = 10;
const MILES_TO_KM = 1.60934;

export function EventsGrid() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [debouncedLocationQuery] = useDebouncedValue(locationQuery, 500);
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch location suggestions from Nominatim API
  useEffect(() => {
    if (!debouncedLocationQuery || debouncedLocationQuery.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        // San Francisco coordinates for biasing results
        const SF_LAT = 37.7749;
        const SF_LON = -122.4194;
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedLocationQuery)}&limit=5&countrycodes=us&viewbox=${SF_LON - 1},${SF_LAT + 1},${SF_LON + 1},${SF_LAT - 1}&bounded=0`
        );
        const data = await response.json();
        
        const suggestions = data.map((place) => ({
          value: place.display_name,
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon),
        }));
        
        setLocationSuggestions(suggestions);
      } catch (err) {
        console.error("Error fetching location suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedLocationQuery]);

  // Handle location selection
  const handleLocationSelect = (value) => {
    const suggestion = locationSuggestions.find((s) => s.value === value);
    if (suggestion) {
      setSelectedLocation({
        name: value,
        lat: suggestion.lat,
        lon: suggestion.lon,
      });
      setLocationQuery(value);
    }
  };

  // Clear location selection
  const handleClearLocation = () => {
    setSelectedLocation(null);
    setLocationQuery("");
  };

  // Fetch events based on filters
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        // Helper to get midnight Pacific time for a given date
        const getPacificMidnight = (date) => {
          const pacificDateString = date.toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          
          const [month, day, year] = pacificDateString.split('/');
          const testDate = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
          const jan = new Date(Number(year), 0, 1);
          const jul = new Date(Number(year), 6, 1);
          const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
          const isDST = testDate.getTimezoneOffset() < stdOffset;
          const pacificOffset = isDST ? 7 : 8;
          
          return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), pacificOffset, 0, 0));
        };

        const startOfDayPacific = selectedDate 
          ? getPacificMidnight(selectedDate)
          : getPacificMidnight(new Date());

        let eventsData = [];

        if (selectedLocation) {
          // Geospatial query using geohash
          const center = [selectedLocation.lat, selectedLocation.lon];
          const radiusInKm = RADIUS_MILES * MILES_TO_KM;
          const radiusInM = radiusInKm * 1000;
          
          // Get geohash query bounds
          const bounds = geohashQueryBounds(center, radiusInM);
          
          // Query each geohash range
          const promises = bounds.map(async (b) => {
            const q = firestoreQuery(
              collection(db, collections.events),
              where("geohash", ">=", b[0]),
              where("geohash", "<=", b[1]),
              where("start", ">=", startOfDayPacific),
              firestoreOrderBy("geohash"),
              firestoreOrderBy("start"),
              firestoreLimit(100)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          });

          const results = await Promise.all(promises);
          eventsData = results.flat();

          // Filter by actual distance (geohash gives approximate results)
          eventsData = eventsData.filter((event) => {
            if (!event.coordinates) return false;
            
            const lat = event.coordinates.latitude || event.coordinates._lat;
            const lon = event.coordinates.longitude || event.coordinates._long;
            
            if (lat === undefined || lon === undefined) return false;
            
            const distanceInKm = distanceBetween([lat, lon], center);
            return distanceInKm <= radiusInKm;
          });

          // Remove duplicates (geohash ranges can overlap)
          const uniqueEvents = new Map();
          eventsData.forEach(event => {
            if (!uniqueEvents.has(event.id)) {
              uniqueEvents.set(event.id, event);
            }
          });
          eventsData = Array.from(uniqueEvents.values());

          // Sort by distance
          eventsData.sort((a, b) => {
            const latA = a.coordinates.latitude || a.coordinates._lat;
            const lonA = a.coordinates.longitude || a.coordinates._long;
            const latB = b.coordinates.latitude || b.coordinates._lat;
            const lonB = b.coordinates.longitude || b.coordinates._long;
            
            const distA = distanceBetween([latA, lonA], center);
            const distB = distanceBetween([latB, lonB], center);
            
            return distA - distB;
          });

          // Limit to 100 results
          eventsData = eventsData.slice(0, 100);
        } else {
          // Regular time-based query (no geospatial filter)
          const q = firestoreQuery(
            collection(db, collections.events),
            where("start", ">=", startOfDayPacific),
            firestoreOrderBy("start", "asc"),
            firestoreLimit(100)
          );

          const snapshot = await getDocs(q);
          eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        setEvents(eventsData);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedDate, selectedLocation]);

  // Local filtering for search query only
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

    return filtered;
  }, [events, searchQuery]);

  if (loading && events.length === 0) {
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

            <Autocomplete
              placeholder="Enter location..."
              leftSection={<IconMapPin size={16} />}
              rightSection={
                selectedLocation ? (
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={handleClearLocation}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              value={locationQuery}
              onChange={setLocationQuery}
              onOptionSubmit={handleLocationSelect}
              data={locationSuggestions.map((s) => s.value)}
              style={{ minWidth: 300 }}
              size="md"
              limit={5}
            />
          </Group>

          <Text size="sm" c="dimmed" mt="md">
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
            {selectedLocation && ` within ${RADIUS_MILES} miles of ${selectedLocation.name}`}
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
