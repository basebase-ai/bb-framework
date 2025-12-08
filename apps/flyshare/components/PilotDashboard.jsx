/**
 * PilotDashboard - Pilot portal for managing aircraft, flights, and bookings
 */

import React, { useState, useMemo } from "react";
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
  Tabs,
  TextInput,
  NumberInput,
  Textarea,
  Select,
  Switch,
  Table,
  ActionIcon,
  Modal,
  Alert,
  ThemeIcon,
  Paper,
  Loader,
  Center,
  Avatar,
  Divider,
  Progress,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconPlane,
  IconUsers,
  IconCalendar,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconCertificate,
  IconShieldCheck,
  IconRocket,
  IconPaw,
  IconClock,
  IconCurrencyEuro,
  IconMapPin,
  IconEye,
  IconTicket,
  IconChevronRight,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { collections } from "../schema.js";

/**
 * Pilot Registration Card - shown when user is not a pilot
 */
function PilotRegistrationInfo() {
  return (
    <Container size="md" py="xl">
      <Card shadow="md" padding="xl" radius="lg" withBorder>
        <Stack align="center" gap="xl">
          <ThemeIcon size={80} radius="xl" variant="light" color="green">
            <IconCertificate size={40} />
          </ThemeIcon>

          <Stack align="center" gap="xs">
            <Title order={2} ta="center">Become a FlyShare Pilot</Title>
            <Text c="dimmed" ta="center" maw={500}>
              Share your passion for flying and earn money by offering seats on your flights
              to travelers across Ireland and Europe.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" w="100%">
            <Card padding="md" bg="gray.0" radius="md">
              <Stack align="center" gap="xs">
                <ThemeIcon size={40} variant="light" color="blue" radius="xl">
                  <IconShieldCheck size={20} />
                </ThemeIcon>
                <Text fw={600} ta="center">Verified Status</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Get a verified pilot badge visible to all passengers
                </Text>
              </Stack>
            </Card>
            <Card padding="md" bg="gray.0" radius="md">
              <Stack align="center" gap="xs">
                <ThemeIcon size={40} variant="light" color="green" radius="xl">
                  <IconCurrencyEuro size={20} />
                </ThemeIcon>
                <Text fw={600} ta="center">Earn Income</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Set your own prices and keep 85% of each booking
                </Text>
              </Stack>
            </Card>
            <Card padding="md" bg="gray.0" radius="md">
              <Stack align="center" gap="xs">
                <ThemeIcon size={40} variant="light" color="orange" radius="xl">
                  <IconCalendar size={20} />
                </ThemeIcon>
                <Text fw={600} ta="center">Flexible Schedule</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Create flights when it suits you, no commitments
                </Text>
              </Stack>
            </Card>
          </SimpleGrid>

          <Divider w="100%" label="Requirements" labelPosition="center" />

          <Stack gap="sm" w="100%">
            <Group gap="sm">
              <IconCheck size={18} color="#22c55e" />
              <Text size="sm">Valid Commercial Pilot License (CPL) or higher</Text>
            </Group>
            <Group gap="sm">
              <IconCheck size={18} color="#22c55e" />
              <Text size="sm">Minimum 500 flight hours logged</Text>
            </Group>
            <Group gap="sm">
              <IconCheck size={18} color="#22c55e" />
              <Text size="sm">Valid medical certificate (Class 1 or 2)</Text>
            </Group>
            <Group gap="sm">
              <IconCheck size={18} color="#22c55e" />
              <Text size="sm">Aircraft with valid insurance for passenger flights</Text>
            </Group>
          </Stack>

          <Alert color="blue" variant="light" w="100%">
            <Text size="sm">
              <strong>How to apply:</strong> Contact us at{" "}
              <a href="mailto:pilots@flyshare.ie" style={{ color: "#228be6" }}>
                pilots@flyshare.ie
              </a>{" "}
              with your license details, flight hours, and aircraft information. 
              Our team will review your application within 48 hours.
            </Text>
          </Alert>
        </Stack>
      </Card>
    </Container>
  );
}

/**
 * Aircraft Management Tab
 */
function AircraftTab({ pilotId }) {
  const { user } = useAuth();
  const { data: aircraft, loading, add, update, remove } = useCollection(collections.aircraft);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [registration, setRegistration] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(2020);
  const [capacity, setCapacity] = useState(4);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState("");
  const [petFriendly, setPetFriendly] = useState(false);

  // Filter to only this pilot's aircraft
  const myAircraft = useMemo(() => {
    return aircraft.filter((a) => a.pilot_id === pilotId);
  }, [aircraft, pilotId]);

  const resetForm = () => {
    setRegistration("");
    setManufacturer("");
    setModel("");
    setYear(2020);
    setCapacity(4);
    setDescription("");
    setImages("");
    setPetFriendly(false);
    setEditingAircraft(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (ac) => {
    setEditingAircraft(ac);
    setRegistration(ac.registration || "");
    setManufacturer(ac.manufacturer || "");
    setModel(ac.model || "");
    setYear(ac.year || 2020);
    setCapacity(ac.capacity || 4);
    setDescription(ac.description || "");
    setImages(ac.images?.join("\n") || "");
    setPetFriendly(ac.pet_friendly || false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!registration.trim() || !manufacturer.trim() || !model.trim()) {
      notifications.show({
        title: "Missing Fields",
        message: "Please fill in registration, manufacturer, and model",
        color: "red",
      });
      return;
    }

    setSaving(true);
    try {
      const data = {
        registration: registration.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        year,
        capacity,
        description: description.trim(),
        images: images.split("\n").map((s) => s.trim()).filter(Boolean),
        pet_friendly: petFriendly,
        pilot_id: pilotId,
      };

      if (editingAircraft) {
        await update(editingAircraft.id, data);
        notifications.show({ title: "Aircraft Updated", message: "Your aircraft has been updated", color: "green" });
      } else {
        await add({ ...data, id: `ac_${Date.now()}` });
        notifications.show({ title: "Aircraft Added", message: "Your aircraft has been added", color: "green" });
      }
      setModalOpen(false);
      resetForm();
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this aircraft?")) return;
    try {
      await remove(id);
      notifications.show({ title: "Aircraft Removed", message: "Aircraft has been removed", color: "green" });
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    }
  };

  if (loading) {
    return <Center py="xl"><Loader color="green" /></Center>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Your Aircraft</Title>
        <Button leftSection={<IconPlus size={16} />} color="green" onClick={openAddModal}>
          Add Aircraft
        </Button>
      </Group>

      {myAircraft.length === 0 ? (
        <Card padding="xl" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon size={60} variant="light" color="gray" radius="xl">
              <IconPlane size={30} />
            </ThemeIcon>
            <Text c="dimmed">You haven't added any aircraft yet</Text>
            <Button variant="light" onClick={openAddModal}>Add Your First Aircraft</Button>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {myAircraft.map((ac) => (
            <Card key={ac.id} padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Badge size="lg" variant="light">{ac.registration}</Badge>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => openEditModal(ac)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(ac.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
              <Text fw={600}>{ac.manufacturer} {ac.model}</Text>
              <Group gap="lg" mt="xs">
                <Text size="sm" c="dimmed">Year: {ac.year}</Text>
                <Text size="sm" c="dimmed">Capacity: {ac.capacity}</Text>
                {ac.pet_friendly && (
                  <Badge size="sm" variant="light" color="pink" leftSection={<IconPaw size={10} />}>
                    Pet Friendly
                  </Badge>
                )}
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingAircraft ? "Edit Aircraft" : "Add Aircraft"}
        size="lg"
      >
        <Stack gap="md">
          <SimpleGrid cols={2}>
            <TextInput
              label="Registration"
              placeholder="EI-XXX"
              value={registration}
              onChange={(e) => setRegistration(e.currentTarget.value)}
              required
            />
            <NumberInput
              label="Year"
              value={year}
              onChange={(val) => setYear(typeof val === "number" ? val : 2020)}
              min={1950}
              max={2030}
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <TextInput
              label="Manufacturer"
              placeholder="Cessna, Pilatus, etc."
              value={manufacturer}
              onChange={(e) => setManufacturer(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Model"
              placeholder="PC-12, Caravan, etc."
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
              required
            />
          </SimpleGrid>
          <NumberInput
            label="Passenger Capacity"
            value={capacity}
            onChange={(val) => setCapacity(typeof val === "number" ? val : 4)}
            min={1}
            max={20}
          />
          <Textarea
            label="Description"
            placeholder="Describe your aircraft, amenities, etc."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            rows={3}
          />
          <Textarea
            label="Image URLs (one per line)"
            placeholder="https://example.com/image1.jpg"
            value={images}
            onChange={(e) => setImages(e.currentTarget.value)}
            rows={3}
          />
          <Switch
            label="Pet Friendly"
            checked={petFriendly}
            onChange={(e) => setPetFriendly(e.currentTarget.checked)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" color="gray" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button color="green" onClick={handleSave} loading={saving}>
              {editingAircraft ? "Save Changes" : "Add Aircraft"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/**
 * Flights Management Tab - shows flights with total/sold seats, clickable to view details
 */
function FlightsTab({ pilotId, onSelectFlight }) {
  const { data: flights, loading, add, update, remove } = useCollection(collections.flights);
  const { data: bookings } = useCollection(collections.bookings);
  const { data: aircraft } = useCollection(collections.aircraft);
  const { data: airports } = useCollection(collections.airports);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [originCode, setOriginCode] = useState("");
  const [destCode, setDestCode] = useState("");
  const [departure, setDeparture] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(60); // Duration in minutes instead of arrival time
  const [price, setPrice] = useState(200);
  const [seatsAvailable, setSeatsAvailable] = useState(4);
  const [aircraftId, setAircraftId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("scheduled");

  // Filter to only this pilot's flights
  const myFlights = useMemo(() => {
    return flights
      .filter((f) => f.pilot_id === pilotId)
      .sort((a, b) => new Date(b.departure).getTime() - new Date(a.departure).getTime());
  }, [flights, pilotId]);

  // Calculate sold seats per flight
  const seatsSoldMap = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      if (b.status === "confirmed" || b.status === "pending") {
        const current = map.get(b.flight_id) || 0;
        map.set(b.flight_id, current + (b.seats || 0));
      }
    });
    return map;
  }, [bookings]);

  // Get aircraft capacity map
  const aircraftCapacityMap = useMemo(() => {
    return new Map(aircraft.map((a) => [a.id, a.capacity || 0]));
  }, [aircraft]);

  // Pilot's aircraft only
  const myAircraft = useMemo(() => {
    return aircraft.filter((a) => a.pilot_id === pilotId);
  }, [aircraft, pilotId]);

  const aircraftOptions = myAircraft.map((a) => ({
    value: a.id,
    label: `${a.registration} - ${a.manufacturer} ${a.model}`,
  }));

  const airportOptions = airports.map((a) => ({
    value: a.code || a.id,
    label: `${a.name} (${a.code || a.id})`,
  }));

  const resetForm = () => {
    setOriginCode("");
    setDestCode("");
    setDeparture(null);
    setDurationMinutes(60);
    setPrice(200);
    setSeatsAvailable(4);
    setAircraftId("");
    setDescription("");
    setStatus("scheduled");
    setEditingFlight(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (e, flight) => {
    e.stopPropagation();
    setEditingFlight(flight);
    setOriginCode(flight.origin_code || "");
    setDestCode(flight.destination_code || "");
    setDeparture(flight.departure ? new Date(flight.departure) : null);
    // Calculate duration from departure and arrival
    if (flight.departure && flight.arrival) {
      const depTime = new Date(flight.departure).getTime();
      const arrTime = new Date(flight.arrival).getTime();
      const durationMs = arrTime - depTime;
      setDurationMinutes(Math.round(durationMs / 60000));
    } else {
      setDurationMinutes(60);
    }
    setPrice(flight.price || 200);
    setSeatsAvailable(flight.seats_available || 4);
    setAircraftId(flight.aircraft_id || "");
    setDescription(flight.description || "");
    setStatus(flight.status || "scheduled");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!originCode || !destCode || !departure || !durationMinutes || !aircraftId) {
      notifications.show({
        title: "Missing Fields",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    // Calculate arrival from departure + duration
    const arrivalDate = new Date(departure.getTime() + durationMinutes * 60000);

    setSaving(true);
    try {
      const data = {
        origin_code: originCode,
        destination_code: destCode,
        departure: departure.toISOString(),
        arrival: arrivalDate.toISOString(),
        price,
        seats_available: seatsAvailable,
        aircraft_id: aircraftId,
        pilot_id: pilotId,
        description: description.trim(),
        status,
      };

      if (editingFlight) {
        await update(editingFlight.id, data);
        notifications.show({ title: "Flight Updated", message: "Your flight has been updated", color: "green" });
      } else {
        await add({ ...data, id: `f_${Date.now()}` });
        notifications.show({ title: "Flight Created", message: "Your flight has been created", color: "green" });
      }
      setModalOpen(false);
      resetForm();
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this flight?")) return;
    try {
      await remove(id);
      notifications.show({ title: "Flight Deleted", message: "Flight has been deleted", color: "green" });
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IE", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "scheduled": return "blue";
      case "boarding": return "orange";
      case "in_flight": return "green";
      case "completed": return "gray";
      case "cancelled": return "red";
      default: return "gray";
    }
  };

  if (loading) {
    return <Center py="xl"><Loader color="green" /></Center>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Your Flights</Title>
        <Button leftSection={<IconPlus size={16} />} color="green" onClick={openAddModal}>
          Create Flight
        </Button>
      </Group>

      {myAircraft.length === 0 ? (
        <Alert color="orange" variant="light">
          Please add an aircraft first before creating flights.
        </Alert>
      ) : myFlights.length === 0 ? (
        <Card padding="xl" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon size={60} variant="light" color="gray" radius="xl">
              <IconCalendar size={30} />
            </ThemeIcon>
            <Text c="dimmed">You haven't created any flights yet</Text>
            <Button variant="light" onClick={openAddModal}>Create Your First Flight</Button>
          </Stack>
        </Card>
      ) : (
        <Stack gap="sm">
          {myFlights.map((flight) => {
            const totalSeats = aircraftCapacityMap.get(flight.aircraft_id) || flight.seats_available || 0;
            const seatsSold = seatsSoldMap.get(flight.id) || 0;
            const seatsRemaining = flight.seats_available || 0;
            const fillPercent = totalSeats > 0 ? (seatsSold / totalSeats) * 100 : 0;

            return (
              <Card
                key={flight.id}
                padding="md"
                withBorder
                style={{ cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => onSelectFlight(flight.id)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xl" wrap="nowrap" style={{ flex: 1 }}>
                    {/* Route */}
                    <Box style={{ minWidth: 120 }}>
                      <Text fw={600} size="lg">{flight.origin_code} → {flight.destination_code}</Text>
                      <Text size="sm" c="dimmed">{formatDate(flight.departure)}</Text>
                    </Box>

                    {/* Seats Progress */}
                    <Box style={{ minWidth: 180, flex: 1 }}>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" c="dimmed">Seats</Text>
                        <Text size="sm" fw={500}>
                          {seatsSold} sold / {totalSeats} total
                        </Text>
                      </Group>
                      <Progress
                        value={fillPercent}
                        color={fillPercent >= 100 ? "green" : fillPercent >= 50 ? "yellow" : "blue"}
                        size="sm"
                        radius="xl"
                      />
                      <Text size="xs" c="dimmed" mt={2}>
                        {seatsRemaining} available
                      </Text>
                    </Box>

                    {/* Price */}
                    <Box style={{ minWidth: 80 }}>
                      <Text size="sm" c="dimmed">Price</Text>
                      <Text fw={600}>€{flight.price}</Text>
                    </Box>

                    {/* Status */}
                    <Badge color={getStatusColor(flight.status)} variant="light" size="lg">
                      {flight.status}
                    </Badge>
                  </Group>

                  {/* Actions */}
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={(e) => openEditModal(e, flight)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={(e) => handleDelete(e, flight.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="green">
                      <IconChevronRight size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingFlight ? "Edit Flight" : "Create Flight"}
        size="lg"
      >
        <Stack gap="md">
          <SimpleGrid cols={2}>
            <Select
              label="Origin Airport"
              placeholder="Select departure"
              data={airportOptions}
              value={originCode}
              onChange={(val) => setOriginCode(val || "")}
              searchable
              required
            />
            <Select
              label="Destination Airport"
              placeholder="Select arrival"
              data={airportOptions}
              value={destCode}
              onChange={(val) => setDestCode(val || "")}
              searchable
              required
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <DateTimePicker
              label="Departure"
              placeholder="Select date/time"
              value={departure}
              onChange={setDeparture}
              required
            />
            <NumberInput
              label="Flight Duration (minutes)"
              description={durationMinutes >= 60 
                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` 
                : `${durationMinutes}m`}
              value={durationMinutes}
              onChange={(val) => setDurationMinutes(typeof val === "number" ? val : 60)}
              min={15}
              max={720}
              step={5}
              leftSection={<IconClock size={16} />}
              required
            />
          </SimpleGrid>
          <Select
            label="Aircraft"
            placeholder="Select aircraft"
            data={aircraftOptions}
            value={aircraftId}
            onChange={(val) => setAircraftId(val || "")}
            required
          />
          <SimpleGrid cols={2}>
            <NumberInput
              label="Price per Seat (€)"
              value={price}
              onChange={(val) => setPrice(typeof val === "number" ? val : 200)}
              min={50}
              leftSection={<IconCurrencyEuro size={16} />}
            />
            <NumberInput
              label="Available Seats"
              value={seatsAvailable}
              onChange={(val) => setSeatsAvailable(typeof val === "number" ? val : 4)}
              min={1}
              max={20}
            />
          </SimpleGrid>
          <Textarea
            label="Flight Description"
            placeholder="Route details, special notes, etc."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            rows={2}
          />
          <Select
            label="Status"
            data={[
              { value: "scheduled", label: "Scheduled" },
              { value: "boarding", label: "Boarding" },
              { value: "in_flight", label: "In Flight" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={status}
            onChange={(val) => setStatus(val || "scheduled")}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" color="gray" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button color="green" onClick={handleSave} loading={saving}>
              {editingFlight ? "Save Changes" : "Create Flight"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/**
 * Bookings Tab - View bookings on pilot's flights
 */
function BookingsTab({ pilotId }) {
  const { data: flights } = useCollection(collections.flights);
  const { data: bookings, loading, update } = useCollection(collections.bookings);

  // Get this pilot's flight IDs
  const myFlightIds = useMemo(() => {
    return new Set(flights.filter((f) => f.pilot_id === pilotId).map((f) => f.id));
  }, [flights, pilotId]);

  // Flight lookup
  const flightMap = useMemo(() => {
    return new Map(flights.map((f) => [f.id, f]));
  }, [flights]);

  // Get bookings for this pilot's flights
  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => myFlightIds.has(b.flight_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, myFlightIds]);

  // Get user IDs for passenger lookup
  const userIds = useMemo(() => {
    return [...new Set(myBookings.map((b) => b.user_id).filter(Boolean))];
  }, [myBookings]);

  const { profiles } = useUserProfiles(userIds);

  const handleConfirm = async (bookingId) => {
    try {
      await update(bookingId, { status: "confirmed" });
      notifications.show({ title: "Booking Confirmed", message: "Booking has been confirmed", color: "green" });
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await update(bookingId, { status: "cancelled" });
      notifications.show({ title: "Booking Cancelled", message: "Booking has been cancelled", color: "orange" });
    } catch (error) {
      notifications.show({ title: "Error", message: error.message, color: "red" });
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "pending": return "yellow";
      case "confirmed": return "green";
      case "cancelled": return "red";
      case "completed": return "gray";
      default: return "gray";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <Center py="xl"><Loader color="green" /></Center>;
  }

  return (
    <Stack gap="md">
      <Title order={4}>Bookings on Your Flights</Title>

      {myBookings.length === 0 ? (
        <Card padding="xl" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon size={60} variant="light" color="gray" radius="xl">
              <IconTicket size={30} />
            </ThemeIcon>
            <Text c="dimmed">No bookings yet</Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="sm">
          {myBookings.map((booking) => {
            const flight = flightMap.get(booking.flight_id);
            const passenger = profiles.get(booking.user_id);

            return (
              <Card key={booking.id} padding="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <Avatar src={passenger?.photoURL} radius="xl">
                      {passenger?.displayName?.[0] || "?"}
                    </Avatar>
                    <Box>
                      <Text fw={500}>{passenger?.displayName || passenger?.email || "Unknown"}</Text>
                      <Text size="sm" c="dimmed">
                        {flight ? `${flight.origin_code} → ${flight.destination_code}` : "Unknown flight"}
                        {" • "}{formatDate(flight?.departure)}
                      </Text>
                    </Box>
                  </Group>
                  <Group gap="md">
                    <Stack gap={0} align="flex-end">
                      <Text size="sm">{booking.seats} seat{booking.seats !== 1 ? "s" : ""}</Text>
                      <Text fw={600}>€{booking.price}</Text>
                    </Stack>
                    <Badge color={getStatusColor(booking.status)} variant="light">
                      {booking.status}
                    </Badge>
                    {booking.status === "pending" && (
                      <Group gap="xs">
                        <ActionIcon color="green" variant="light" onClick={() => handleConfirm(booking.id)}>
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" variant="light" onClick={() => handleCancel(booking.id)}>
                          <IconX size={16} />
                        </ActionIcon>
                      </Group>
                    )}
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

/**
 * Main Pilot Dashboard Component
 * @param {{ onSelectFlight: (flightId: string) => void }} props
 */
export function PilotDashboard({ onSelectFlight }) {
  const { user } = useAuth();
  const { data: pilots, loading } = useCollection(collections.pilots);

  // Check if current user is a pilot
  const pilotRecord = useMemo(() => {
    return pilots.find((p) => p.user_id === user?.uid) || null;
  }, [pilots, user?.uid]);

  if (loading) {
    return (
      <Center py="xl" style={{ minHeight: 400 }}>
        <Loader color="green" size="lg" />
      </Center>
    );
  }

  // Not a pilot - show registration info
  if (!pilotRecord) {
    return <PilotRegistrationInfo />;
  }

  // Is a pilot - show dashboard with FLIGHTS as default tab
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={2}>Pilot Dashboard</Title>
            <Text c="dimmed">Manage your aircraft, flights, and bookings</Text>
          </div>
          <Badge size="lg" color="green" variant="light" leftSection={<IconShieldCheck size={14} />}>
            Verified Pilot
          </Badge>
        </Group>

        <Tabs defaultValue="flights" color="green">
          <Tabs.List>
            <Tabs.Tab value="flights" leftSection={<IconCalendar size={16} />}>
              Flights
            </Tabs.Tab>
            <Tabs.Tab value="aircraft" leftSection={<IconPlane size={16} />}>
              Aircraft
            </Tabs.Tab>
            <Tabs.Tab value="bookings" leftSection={<IconUsers size={16} />}>
              Bookings
            </Tabs.Tab>
          </Tabs.List>

          <Box pt="md">
            <Tabs.Panel value="flights">
              <FlightsTab pilotId={pilotRecord.id} onSelectFlight={onSelectFlight} />
            </Tabs.Panel>
            <Tabs.Panel value="aircraft">
              <AircraftTab pilotId={pilotRecord.id} />
            </Tabs.Panel>
            <Tabs.Panel value="bookings">
              <BookingsTab pilotId={pilotRecord.id} />
            </Tabs.Panel>
          </Box>
        </Tabs>
      </Stack>
    </Container>
  );
}

export default PilotDashboard;
