/**
 * FlyShare - Private Flight Sharing App
 * Main entry point with URL-based routing
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Button,
  Box,
  Burger,
  Drawer,
  Stack,
  Divider,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useRouter } from "../../framework/hooks/useRouter.js";
import { LandingPage } from "./components/LandingPage.jsx";
import { FlightSearch } from "./components/FlightSearch.jsx";
import { FlightDetails } from "./components/FlightDetails.jsx";
import { PilotDashboard } from "./components/PilotDashboard.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";
import {
  IconPlane,
  IconUser,
  IconLogout,
  IconTicket,
  IconMoon,
  IconSun,
  IconPropeller,
} from "@tabler/icons-react";

// Note: LandingPage is passed to AuthProvider which shows it for unauthenticated users

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/carousel/styles.css";

/**
 * Parse URL path to get view and parameters
 * URL patterns:
 *   /                -> flights list
 *   /flights         -> flights list
 *   /flight/:id      -> flight details
 *   /pilots          -> pilot dashboard
 *   /pilots/flight/:id -> pilot viewing their flight
 */
function parseRoute(path) {
  // Remove leading slash and split
  const segments = path.replace(/^\//, "").split("/").filter(Boolean);

  // Default to flights
  if (segments.length === 0 || segments[0] === "flights") {
    return { view: "search", flightId: null, isPilotView: false };
  }

  // Flight details: /flight/:id
  if (segments[0] === "flight" && segments[1]) {
    return { view: "details", flightId: segments[1], isPilotView: false };
  }

  // Pilots section
  if (segments[0] === "pilots") {
    // /pilots/flight/:id - pilot viewing their own flight
    if (segments[1] === "flight" && segments[2]) {
      return { view: "details", flightId: segments[2], isPilotView: true };
    }
    // /pilots - pilot dashboard
    return { view: "pilots", flightId: null, isPilotView: false };
  }

  // Fallback
  return { view: "search", flightId: null, isPilotView: false };
}

function AppContent() {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { path, navigate, back } = useRouter();

  // Parse current route
  const route = useMemo(() => parseRoute(path), [path]);

  /** @type {(flightId: string) => void} */
  const handleSelectFlight = (flightId) => {
    navigate(`/flight/${flightId}`);
  };

  /** @type {(flightId: string) => void} */
  const handleSelectPilotFlight = (flightId) => {
    navigate(`/pilots/flight/${flightId}`);
  };

  /** @type {() => void} */
  const handleBackToSearch = () => {
    navigate("/flights");
  };

  /** @type {() => void} */
  const handleBackToPilots = () => {
    navigate("/pilots");
  };

  /** @type {(view: string) => void} */
  const navigateTo = (view) => {
    switch (view) {
      case "search":
        navigate("/flights");
        break;
      case "pilots":
        navigate("/pilots");
        break;
      default:
        navigate("/flights");
    }
  };

  // Determine active nav based on route
  const isFlightsActive = route.view === "search" || (route.view === "details" && !route.isPilotView);
  const isPilotsActive = route.view === "pilots" || route.isPilotView;

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      styles={{
        main: {
          background: colorScheme === "dark" ? "#0f0f12" : "#f8f9fa",
        },
      }}
    >
      <AppShell.Header
        style={{
          background: colorScheme === "dark" 
            ? "rgba(15, 15, 18, 0.95)" 
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: colorScheme === "dark"
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          {/* Logo */}
          <Group
            gap="xs"
            style={{ cursor: "pointer" }}
            onClick={() => navigateTo("search")}
          >
            <IconPlane size={28} color="#22c55e" />
            <Title order={3}>
              Fly<span style={{ color: "#22c55e" }}>Share</span>
            </Title>
          </Group>

          {/* Desktop Navigation */}
          <Group gap="md" visibleFrom="sm">
            <Button
              variant={isFlightsActive ? "light" : "subtle"}
              color="green"
              leftSection={<IconPlane size={16} />}
              onClick={() => navigateTo("search")}
            >
              Flights
            </Button>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconTicket size={16} />}
              onClick={() => {
                // TODO: My Bookings view
              }}
            >
              My Bookings
            </Button>
            <Button
              variant={isPilotsActive ? "light" : "subtle"}
              color="orange"
              leftSection={<IconPropeller size={16} />}
              onClick={() => navigateTo("pilots")}
            >
              For Pilots
            </Button>

            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={toggleColorScheme}
              color="gray"
            >
              {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>

            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user?.email}
                size="sm"
                radius="xl"
              >
                {(profile?.displayName || user?.email)?.[0]?.toUpperCase()}
              </Avatar>
              <Text size="sm" c="dimmed">
                {profile?.displayName || user?.email}
              </Text>
            </Group>
          </Group>

          {/* Mobile Menu Button */}
          <Burger
            opened={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            hiddenFrom="sm"
          />
        </Group>
      </AppShell.Header>

      {/* Mobile Drawer */}
      <Drawer
        opened={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={
          <Group gap="xs">
            <IconPlane size={24} color="#22c55e" />
            <Text fw={600}>FlyShare</Text>
          </Group>
        }
        padding="md"
        size="xs"
        position="right"
      >
        <Stack gap="md">
          <Group gap="sm" py="sm">
            <Avatar src={profile?.photoURL} size="md" radius="xl">
              {(profile?.displayName || user?.email)?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Text fw={500}>{profile?.displayName || "User"}</Text>
              <Text size="xs" c="dimmed">{user?.email}</Text>
            </Box>
          </Group>
          <Divider />

          <Button
            variant="subtle"
            fullWidth
            leftSection={<IconPlane size={18} />}
            justify="flex-start"
            onClick={() => {
              navigateTo("search");
              setMobileMenuOpen(false);
            }}
          >
            Browse Flights
          </Button>
          <Button
            variant="subtle"
            fullWidth
            leftSection={<IconTicket size={18} />}
            justify="flex-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            My Bookings
          </Button>
          <Button
            variant="subtle"
            fullWidth
            leftSection={<IconPropeller size={18} />}
            justify="flex-start"
            color="orange"
            onClick={() => {
              navigateTo("pilots");
              setMobileMenuOpen(false);
            }}
          >
            For Pilots
          </Button>
          <Button
            variant="subtle"
            fullWidth
            leftSection={<IconUser size={18} />}
            justify="flex-start"
            onClick={() => {
              setProfileModalOpened(true);
              setMobileMenuOpen(false);
            }}
          >
            Profile
          </Button>
          <Divider />
          <Button
            variant="subtle"
            color="red"
            fullWidth
            leftSection={<IconLogout size={18} />}
            justify="flex-start"
            onClick={() => {
              signOut();
              setMobileMenuOpen(false);
            }}
          >
            Sign Out
          </Button>
        </Stack>
      </Drawer>

      <AppShell.Main>
        {route.view === "search" && (
          <FlightSearch onSelectFlight={handleSelectFlight} />
        )}
        {route.view === "details" && route.flightId && (
          <FlightDetails
            flightId={route.flightId}
            onBack={route.isPilotView ? handleBackToPilots : handleBackToSearch}
            isPilotView={route.isPilotView}
          />
        )}
        {route.view === "pilots" && (
          <PilotDashboard onSelectFlight={handleSelectPilotFlight} />
        )}
      </AppShell.Main>

      {/* Profile Modal */}
      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications position="top-right" />
      <AuthProvider
        appId={APP_ID}
        landingPage={(props) => <LandingPage {...props} />}
      >
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
/** @type {ReturnType<typeof createRoot> | undefined} */
let root;

function render() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

render();

// Enable hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
