/**
 * FlightDetails - Full flight information with pilot, aircraft, and booking
 */

import React, { useMemo, useState } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Badge,
  Button,
  Box,
  SimpleGrid,
  Divider,
  Loader,
  Center,
  ThemeIcon,
  Avatar,
  Image,
  Paper,
  NumberInput,
  Textarea,
  Rating,
  Breadcrumbs,
  Anchor,
  Modal,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { notifications } from "@mantine/notifications";
import {
  IconPlane,
  IconPlaneDeparture,
  IconPlaneArrival,
  IconCalendar,
  IconClock,
  IconUsers,
  IconStar,
  IconPaw,
  IconArrowLeft,
  IconCheck,
  IconShieldCheck,
  IconCertificate,
  IconMapPin,
} from "@tabler/icons-react";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

// Import carousel styles
import "@mantine/carousel/styles.css";

/**
 * @param {{ flightId: string, onBack: () => void }} props
 */
export function FlightDetails({ flightId, onBack }) {
  const { user } = useAuth();
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Fetch flight data
  const { data: flight, loading: flightLoading } = useDocument(collections.flights, flightId);

  // Fetch related data
  const { data: airports } = useCollection(collections.airports);
  const { data: allAircraft } = useCollection(collections.aircraft);
  const { data: pilots } = useCollection(collections.pilots);

  // Get specific related data
  const aircraft = useMemo(() => {
    return allAircraft.find((a) => a.id === flight?.aircraft_id) || null;
  }, [allAircraft, flight?.aircraft_id]);

  const pilot = useMemo(() => {
    return pilots.find((p) => p.id === flight?.pilot_id) || null;
  }, [pilots, flight?.pilot_id]);

  const { profile: pilotProfile } = useUserProfile(pilot?.user_id);

  const originAirport = useMemo(() => {
    return airports.find((a) => a.code === flight?.origin_code || a.id === flight?.origin_code) || null;
  }, [airports, flight?.origin_code]);

  const destAirport = useMemo(() => {
    return airports.find((a) => a.code === flight?.destination_code || a.id === flight?.destination_code) || null;
  }, [airports, flight?.destination_code]);

  // Booking collection for adding new bookings
  const { add: addBooking } = useCollection(collections.bookings);

  // Format helpers
  /** @type {(date: Date) => string} */
  const formatTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
  };

  /** @type {(date: Date) => string} */
  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-IE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  const departureDate = flight?.departure ? new Date(flight.departure) : null;
  const arrivalDate = flight?.arrival ? new Date(flight.arrival) : null;
  const totalPrice = (flight?.price || 0) * seatsToBook;

  /** @type {() => Promise<void>} */
  const handleBooking = async () => {
    if (!user || !flight) return;

    setIsBooking(true);
    try {
      await addBooking({
        flight_id: flightId,
        user_id: user.uid,
        seats: seatsToBook,
        price: totalPrice,
        passengers: [],
        status: "pending",
        notes: bookingNotes,
      });

      notifications.show({
        title: "Booking Requested!",
        message: "Your booking request has been submitted. You'll receive confirmation shortly.",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      setBookingModalOpen(false);
      setSeatsToBook(1);
      setBookingNotes("");
    } catch (error) {
      notifications.show({
        title: "Booking Failed",
        message: "There was an error processing your booking. Please try again.",
        color: "red",
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (flightLoading) {
    return (
      <Center py="xl" style={{ minHeight: 400 }}>
        <Loader color="green" size="lg" />
      </Center>
    );
  }

  if (!flight) {
    return (
      <Container size="lg" py="xl">
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={60} radius="xl" variant="light" color="gray">
              <IconPlane size={30} />
            </ThemeIcon>
            <Text c="dimmed">Flight not found</Text>
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
              Back to Search
            </Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      {/* Breadcrumbs */}
      <Breadcrumbs mb="lg">
        <Anchor onClick={onBack} style={{ cursor: "pointer" }}>
          Flights
        </Anchor>
        <Text c="dimmed">
          {flight.origin_code} → {flight.destination_code}
        </Text>
      </Breadcrumbs>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="xl">
        {/* Main Content */}
        <Box style={{ gridColumn: "span 2" }}>
          {/* Flight Route Card */}
          <Card shadow="sm" padding="xl" radius="md" withBorder mb="lg">
            <Group justify="space-between" mb="lg">
              <Badge size="lg" color="green" variant="light">
                {flight.status}
              </Badge>
              {aircraft?.pet_friendly && (
                <Badge size="lg" variant="light" color="pink" leftSection={<IconPaw size={14} />}>
                  Pet Friendly
                </Badge>
              )}
            </Group>

            {/* Route Display */}
            <Group justify="space-between" align="flex-start" mb="xl">
              <Stack gap="xs" style={{ flex: 1 }}>
                <Group gap="xs">
                  <IconPlaneDeparture size={20} color="#22c55e" />
                  <Text fw={700} size="xl">{flight.origin_code}</Text>
                </Group>
                <Text size="lg">{originAirport?.name || flight.origin_code}</Text>
                <Text c="dimmed">{originAirport?.country}</Text>
                <Text fw={600} size="lg" mt="xs">{formatTime(departureDate)}</Text>
                <Text size="sm" c="dimmed">{formatDate(departureDate)}</Text>
              </Stack>

              <Stack align="center" gap="xs" px="xl">
                <IconPlane size={24} color="#22c55e" />
                <Text size="sm" c="dimmed">{getDuration(departureDate, arrivalDate)}</Text>
                <Box
                  style={{
                    width: 100,
                    height: 2,
                    background: "#22c55e",
                    borderRadius: 1,
                  }}
                />
                <Text size="xs" c="dimmed">Direct</Text>
              </Stack>

              <Stack gap="xs" style={{ flex: 1 }} align="flex-end">
                <Group gap="xs">
                  <Text fw={700} size="xl">{flight.destination_code}</Text>
                  <IconPlaneArrival size={20} color="#22c55e" />
                </Group>
                <Text size="lg">{destAirport?.name || flight.destination_code}</Text>
                <Text c="dimmed">{destAirport?.country}</Text>
                <Text fw={600} size="lg" mt="xs">{formatTime(arrivalDate)}</Text>
                <Text size="sm" c="dimmed">{formatDate(arrivalDate)}</Text>
              </Stack>
            </Group>

            {flight.description && (
              <>
                <Divider my="md" />
                <Text size="sm" c="dimmed">{flight.description}</Text>
              </>
            )}
          </Card>

          {/* Aircraft Section */}
          {aircraft && (
            <Card shadow="sm" padding="xl" radius="md" withBorder mb="lg">
              <Title order={4} mb="lg">Aircraft</Title>

              {/* Aircraft Images Carousel */}
              {aircraft.images && aircraft.images.length > 0 && (
                <Box mb="lg">
                  <Carousel
                    withIndicators
                    height={300}
                    slideSize="100%"
                    slideGap="md"
                    loop
                    align="start"
                  >
                    {aircraft.images.map((imgUrl, idx) => (
                      <Carousel.Slide key={idx}>
                        <Image
                          src={imgUrl}
                          height={300}
                          fit="cover"
                          radius="md"
                          alt={`${aircraft.manufacturer} ${aircraft.model}`}
                        />
                      </Carousel.Slide>
                    ))}
                  </Carousel>
                </Box>
              )}

              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Text fw={600} size="lg">
                    {aircraft.manufacturer} {aircraft.model}
                  </Text>
                  <Text c="dimmed">Registration: {aircraft.registration}</Text>
                  <Group gap="lg" mt="xs">
                    <Group gap="xs">
                      <IconCalendar size={16} color="#868e96" />
                      <Text size="sm" c="dimmed">Year: {aircraft.year}</Text>
                    </Group>
                    <Group gap="xs">
                      <IconUsers size={16} color="#868e96" />
                      <Text size="sm" c="dimmed">Capacity: {aircraft.capacity} seats</Text>
                    </Group>
                    {aircraft.pet_friendly && (
                      <Group gap="xs">
                        <IconPaw size={16} color="#ec4899" />
                        <Text size="sm" c="pink">Pet Friendly</Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              </Group>

              {aircraft.description && (
                <>
                  <Divider my="md" />
                  <Text size="sm" c="dimmed" lh={1.6}>{aircraft.description}</Text>
                </>
              )}
            </Card>
          )}

          {/* Pilot Section */}
          {pilot && (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Title order={4} mb="lg">Your Pilot</Title>

              <Group align="flex-start" gap="xl">
                <Avatar
                  src={pilotProfile?.photoURL}
                  size={100}
                  radius="xl"
                >
                  {pilotProfile?.displayName?.[0] || "P"}
                </Avatar>

                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text fw={600} size="lg">
                    {pilotProfile?.displayName || "Pilot"}
                  </Text>

                  {pilot.rating && (
                    <Group gap="xs">
                      <Rating value={pilot.rating} fractions={2} readOnly size="sm" />
                      <Text size="sm" c="dimmed">({pilot.rating.toFixed(1)})</Text>
                    </Group>
                  )}

                  <Group gap="lg" mt="xs">
                    <Group gap="xs">
                      <IconCertificate size={16} color="#22c55e" />
                      <Text size="sm" c="dimmed">License: {pilot.license_number}</Text>
                    </Group>
                    <Group gap="xs">
                      <IconClock size={16} color="#868e96" />
                      <Text size="sm" c="dimmed">{pilot.experience_years} years experience</Text>
                    </Group>
                    <Group gap="xs">
                      <IconPlane size={16} color="#868e96" />
                      <Text size="sm" c="dimmed">{pilot.total_flights?.toLocaleString()} flights</Text>
                    </Group>
                  </Group>

                  <Group gap="xs" mt="sm">
                    <ThemeIcon size="sm" variant="light" color="green" radius="xl">
                      <IconShieldCheck size={12} />
                    </ThemeIcon>
                    <Text size="sm" c="green">Verified Commercial Pilot</Text>
                  </Group>

                  {pilotProfile?.bio && (
                    <>
                      <Divider my="sm" />
                      <Text size="sm" c="dimmed" lh={1.6}>{pilotProfile.bio}</Text>
                    </>
                  )}
                </Stack>
              </Group>
            </Card>
          )}
        </Box>

        {/* Booking Sidebar */}
        <Box>
          <Paper shadow="sm" p="xl" radius="md" withBorder pos="sticky" top={80}>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Price per seat</Text>
                <Text fw={700} size="xl" c="green">€{flight.price}</Text>
              </Group>

              <Divider />

              <Group justify="space-between">
                <Text size="sm" c="dimmed">Available seats</Text>
                <Badge color={flight.seats_available > 0 ? "green" : "red"} size="lg">
                  {flight.seats_available}
                </Badge>
              </Group>

              <Divider />

              {flight.seats_available > 0 && user && (
                <>
                  <NumberInput
                    label="Number of seats"
                    value={seatsToBook}
                    onChange={(val) => setSeatsToBook(typeof val === "number" ? val : 1)}
                    min={1}
                    max={flight.seats_available}
                    leftSection={<IconUsers size={16} />}
                  />

                  <Divider />

                  <Group justify="space-between">
                    <Text fw={500}>Total</Text>
                    <Text fw={700} size="xl">€{totalPrice}</Text>
                  </Group>

                  <Button
                    fullWidth
                    size="lg"
                    color="green"
                    onClick={() => setBookingModalOpen(true)}
                    leftSection={<IconCheck size={18} />}
                  >
                    Book Now
                  </Button>
                </>
              )}

              {!user && (
                <Text size="sm" c="dimmed" ta="center">
                  Sign in to book this flight
                </Text>
              )}

              {flight.seats_available === 0 && (
                <Text size="sm" c="red" ta="center" fw={500}>
                  This flight is fully booked
                </Text>
              )}

              <Button
                variant="light"
                color="gray"
                fullWidth
                leftSection={<IconArrowLeft size={16} />}
                onClick={onBack}
              >
                Back to Search
              </Button>
            </Stack>
          </Paper>
        </Box>
      </SimpleGrid>

      {/* Booking Confirmation Modal */}
      <Modal
        opened={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title="Confirm Your Booking"
        size="md"
      >
        <Stack gap="md">
          <Paper p="md" bg="gray.0" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500}>{flight.origin_code} → {flight.destination_code}</Text>
              <Text size="sm" c="dimmed">{formatDate(departureDate)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{seatsToBook} seat{seatsToBook !== 1 ? "s" : ""}</Text>
              <Text fw={600}>€{totalPrice}</Text>
            </Group>
          </Paper>

          <Textarea
            label="Special requests (optional)"
            placeholder="Any special requirements or notes for your booking..."
            value={bookingNotes}
            onChange={(e) => setBookingNotes(e.currentTarget.value)}
            rows={3}
          />

          <Text size="xs" c="dimmed">
            By booking, you agree to our terms of service. You will receive confirmation
            once the pilot approves your booking request.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="light" color="gray" onClick={() => setBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleBooking}
              loading={isBooking}
              leftSection={<IconCheck size={16} />}
            >
              Confirm Booking
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default FlightDetails;

