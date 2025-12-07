/**
 * FlightSearch - Main flight listing with search and filters
 */

import React, { useState, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  TextInput,
  NumberInput,
  Card,
  Group,
  Stack,
  Badge,
  Button,
  Box,
  SimpleGrid,
  Select,
  Paper,
  Divider,
  Loader,
  Center,
  ThemeIcon,
  Avatar,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconSearch,
  IconPlane,
  IconPlaneDeparture,
  IconPlaneArrival,
  IconCalendar,
  IconUsers,
  IconClock,
  IconStar,
  IconPaw,
  IconArrowRight,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { collections } from "../schema.js";

// Import date styles
import "@mantine/dates/styles.css";

/**
 * @typedef {Object} Flight
 * @property {string} id
 * @property {string} origin_code
 * @property {string} destination_code
 * @property {string} departure
 * @property {string} arrival
 * @property {number} price
 * @property {number} seats_available
 * @property {string} pilot_id
 * @property {string} aircraft_id
 * @property {string} status
 * @property {string} [description]
 */

/**
 * @typedef {Object} FlightCardProps
 * @property {Flight} flight
 * @property {Object|null} aircraft
 * @property {Object|null} pilot
 * @property {Object|null} pilotProfile
 * @property {Object|null} originAirport
 * @property {Object|null} destAirport
 * @property {() => void} onSelect
 */

/**
 * @param {FlightCardProps} props
 */
function FlightCard({ flight, aircraft, pilot, pilotProfile, originAirport, destAirport, onSelect }) {
  const departureDate = flight.departure ? new Date(flight.departure) : null;
  const arrivalDate = flight.arrival ? new Date(flight.arrival) : null;

  /** @type {(date: Date) => string} */
  const formatTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
  };

  /** @type {(date: Date) => string} */
  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-IE", { weekday: "short", month: "short", day: "numeric" });
  };

  /** @type {(dep: Date | null, arr: Date | null) => string} */
  const getDuration = (dep, arr) => {
    if (!dep || !arr) return "";
    const diffMs = arr.getTime() - dep.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: "pointer", transition: "all 0.2s ease" }}
      onClick={onSelect}
    >
      {/* Date and Status */}
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">{formatDate(departureDate)}</Text>
        <Group gap="xs">
          {aircraft?.pet_friendly && (
            <Badge size="sm" variant="light" color="pink" leftSection={<IconPaw size={12} />}>
              Pet Friendly
            </Badge>
          )}
          <Badge
            size="sm"
            variant="light"
            color={flight.seats_available > 0 ? "green" : "red"}
          >
            {flight.seats_available} seat{flight.seats_available !== 1 ? "s" : ""} left
          </Badge>
        </Group>
      </Group>

      {/* Route */}
      <Group justify="space-between" align="flex-start" mb="md">
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs">
            <IconPlaneDeparture size={16} color="#868e96" />
            <Text fw={600} size="lg">{flight.origin_code}</Text>
          </Group>
          <Text size="sm" c="dimmed">{originAirport?.name || flight.origin_code}</Text>
          <Text fw={500}>{formatTime(departureDate)}</Text>
        </Stack>

        <Stack align="center" gap={4} px="md">
          <Text size="xs" c="dimmed">{getDuration(departureDate, arrivalDate)}</Text>
          <Box
            style={{
              width: 80,
              height: 2,
              background: "linear-gradient(90deg, #868e96 0%, #22c55e 50%, #868e96 100%)",
              borderRadius: 1,
            }}
          />
          <IconPlane size={14} color="#22c55e" />
        </Stack>

        <Stack gap={4} style={{ flex: 1 }} align="flex-end">
          <Group gap="xs">
            <Text fw={600} size="lg">{flight.destination_code}</Text>
            <IconPlaneArrival size={16} color="#868e96" />
          </Group>
          <Text size="sm" c="dimmed">{destAirport?.name || flight.destination_code}</Text>
          <Text fw={500}>{formatTime(arrivalDate)}</Text>
        </Stack>
      </Group>

      <Divider my="sm" />

      {/* Aircraft and Pilot Info */}
      <Group justify="space-between" align="center">
        <Group gap="md">
          {/* Aircraft */}
          <Group gap="xs">
            <IconPlane size={16} color="#868e96" />
            <Text size="sm" c="dimmed">
              {aircraft ? `${aircraft.manufacturer} ${aircraft.model}` : "Aircraft TBD"}
            </Text>
          </Group>

          {/* Pilot */}
          <Group gap="xs">
            <Avatar
              src={pilotProfile?.photoURL}
              size="sm"
              radius="xl"
            >
              {pilotProfile?.displayName?.[0] || "P"}
            </Avatar>
            <Stack gap={0}>
              <Text size="sm">{pilotProfile?.displayName || "Pilot"}</Text>
              {pilot?.rating && (
                <Group gap={4}>
                  <IconStar size={12} color="#fab005" fill="#fab005" />
                  <Text size="xs" c="dimmed">{pilot.rating.toFixed(1)}</Text>
                </Group>
              )}
            </Stack>
          </Group>
        </Group>

        {/* Price and CTA */}
        <Group gap="md">
          <Stack gap={0} align="flex-end">
            <Text size="xs" c="dimmed">from</Text>
            <Text fw={700} size="xl" c="green">€{flight.price}</Text>
            <Text size="xs" c="dimmed">per seat</Text>
          </Stack>
          <Button
            variant="filled"
            color="green"
            rightSection={<IconArrowRight size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            View
          </Button>
        </Group>
      </Group>
    </Card>
  );
}

/**
 * @param {{ onSelectFlight: (flightId: string) => void }} props
 */
export function FlightSearch({ onSelectFlight }) {
  // Search state
  const [fromAirport, setFromAirport] = useState("");
  const [toAirport, setToAirport] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [passengers, setPassengers] = useState(1);

  // Fetch data - no orderBy to avoid needing composite index, sort client-side
  const { data: rawFlights, loading: flightsLoading } = useCollection(collections.flights);

  // Filter scheduled flights and sort by departure client-side
  const flights = useMemo(() => {
    return rawFlights
      .filter((f) => f.status === "scheduled")
      .sort((a, b) => {
        const dateA = a.departure ? new Date(a.departure).getTime() : 0;
        const dateB = b.departure ? new Date(b.departure).getTime() : 0;
        return dateA - dateB;
      });
  }, [rawFlights]);

  const { data: airports } = useCollection(collections.airports);
  const { data: aircraft } = useCollection(collections.aircraft);
  const { data: pilots } = useCollection(collections.pilots);

  // Get pilot user IDs for profile lookup
  /** @type {string[]} */
  const pilotUserIds = useMemo(() => {
    return pilots.map((p) => p.user_id).filter(Boolean);
  }, [pilots]);

  const { profiles: pilotProfiles } = useUserProfiles(pilotUserIds);

  // Create lookup maps
  /** @type {Map<string, Object>} */
  const airportMap = useMemo(() => {
    return new Map(airports.map((a) => [a.code || a.id, a]));
  }, [airports]);

  /** @type {Map<string, Object>} */
  const aircraftMap = useMemo(() => {
    return new Map(aircraft.map((a) => [a.id, a]));
  }, [aircraft]);

  /** @type {Map<string, Object>} */
  const pilotMap = useMemo(() => {
    return new Map(pilots.map((p) => [p.id, p]));
  }, [pilots]);

  // Airport options for Select dropdowns
  /** @type {{ value: string, label: string }[]} */
  const airportOptions = useMemo(() => {
    return airports.map((a) => ({
      value: a.code || a.id,
      label: `${a.name} (${a.code || a.id})`,
    }));
  }, [airports]);

  // Filter flights
  /** @type {Flight[]} */
  const filteredFlights = useMemo(() => {
    return flights.filter((flight) => {
      // Filter by available seats
      if (flight.seats_available < passengers) return false;

      // Filter by date
      if (selectedDate) {
        const flightDate = new Date(flight.departure);
        const searchDate = new Date(selectedDate);
        if (
          flightDate.getFullYear() !== searchDate.getFullYear() ||
          flightDate.getMonth() !== searchDate.getMonth() ||
          flightDate.getDate() !== searchDate.getDate()
        ) {
          return false;
        }
      }

      // Filter by origin airport
      if (fromAirport && flight.origin_code !== fromAirport) {
        return false;
      }

      // Filter by destination airport
      if (toAirport && flight.destination_code !== toAirport) {
        return false;
      }

      return true;
    });
  }, [flights, fromAirport, toAirport, selectedDate, passengers]);

  return (
    <Container size="lg" py="xl">
      {/* Search Header */}
      <Stack gap="lg" mb="xl">
        <Title order={2}>Available Flights</Title>

        {/* Search Form */}
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
            <Select
              placeholder="From airport"
              leftSection={<IconPlaneDeparture size={16} />}
              data={airportOptions}
              value={fromAirport}
              onChange={(val) => setFromAirport(val || "")}
              clearable
              searchable
            />
            <Select
              placeholder="To airport"
              leftSection={<IconPlaneArrival size={16} />}
              data={airportOptions}
              value={toAirport}
              onChange={(val) => setToAirport(val || "")}
              clearable
              searchable
            />
            <DatePickerInput
              placeholder="Travel date"
              leftSection={<IconCalendar size={16} />}
              value={selectedDate}
              onChange={setSelectedDate}
              clearable
              minDate={new Date()}
            />
            <NumberInput
              placeholder="Passengers"
              leftSection={<IconUsers size={16} />}
              value={passengers}
              onChange={(val) => setPassengers(typeof val === "number" ? val : 1)}
              min={1}
              max={10}
            />
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setFromAirport("");
                setToAirport("");
                setSelectedDate(null);
                setPassengers(1);
              }}
            >
              Clear
            </Button>
          </SimpleGrid>
        </Paper>
      </Stack>

      {/* Results */}
      {flightsLoading ? (
        <Center py="xl">
          <Loader color="green" />
        </Center>
      ) : filteredFlights.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={60} radius="xl" variant="light" color="gray">
              <IconPlane size={30} />
            </ThemeIcon>
            <Text c="dimmed">No flights found matching your criteria</Text>
            <Button
              variant="light"
              onClick={() => {
                setSearchQuery("");
                setSelectedDate(null);
                setPassengers(1);
              }}
            >
              Clear Filters
            </Button>
          </Stack>
        </Center>
      ) : (
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            {filteredFlights.length} flight{filteredFlights.length !== 1 ? "s" : ""} available
          </Text>
          {filteredFlights.map((flight) => {
            const flightAircraft = aircraftMap.get(flight.aircraft_id);
            const flightPilot = pilotMap.get(flight.pilot_id);
            const pilotProfile = flightPilot ? pilotProfiles.get(flightPilot.user_id) : null;

            return (
              <FlightCard
                key={flight.id}
                flight={flight}
                aircraft={flightAircraft || null}
                pilot={flightPilot || null}
                pilotProfile={pilotProfile || null}
                originAirport={airportMap.get(flight.origin_code) || null}
                destAirport={airportMap.get(flight.destination_code) || null}
                onSelect={() => onSelectFlight(flight.id)}
              />
            );
          })}
        </Stack>
      )}
    </Container>
  );
}

export default FlightSearch;

