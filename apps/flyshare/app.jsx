/**
 * FlyShare - Private Flight Sharing App
 * Main entry point
 */

import React, { useState } from "react";
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
import { LandingPage } from "./components/LandingPage.jsx";
import { FlightSearch } from "./components/FlightSearch.jsx";
import { FlightDetails } from "./components/FlightDetails.jsx";
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
} from "@tabler/icons-react";

// Note: LandingPage is passed to AuthProvider which shows it for unauthenticated users

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/carousel/styles.css";

/**
 * @typedef {'search' | 'details'} ViewType
 */

function AppContent() {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  // Navigation state - start at search (landing page handled by AuthProvider)
  /** @type {['search' | 'details', React.Dispatch<React.SetStateAction<'search' | 'details'>>]} */
  const [currentView, setCurrentView] = useState("search");
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedFlightId, setSelectedFlightId] = useState(null);

  /** @type {(flightId: string) => void} */
  const handleSelectFlight = (flightId) => {
    setSelectedFlightId(flightId);
    setCurrentView("details");
  };

  /** @type {() => void} */
  const handleBackToSearch = () => {
    setSelectedFlightId(null);
    setCurrentView("search");
  };

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
            onClick={() => setCurrentView("search")}
          >
            <IconPlane size={28} color="#22c55e" />
            <Title order={3}>
              Fly<span style={{ color: "#22c55e" }}>Share</span>
            </Title>
          </Group>

          {/* Desktop Navigation */}
          <Group gap="md" visibleFrom="sm">
            <Button
              variant={currentView === "search" ? "light" : "subtle"}
              color="green"
              leftSection={<IconPlane size={16} />}
              onClick={() => setCurrentView("search")}
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
              setCurrentView("search");
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
        {currentView === "search" && (
          <FlightSearch onSelectFlight={handleSelectFlight} />
        )}
        {currentView === "details" && selectedFlightId && (
          <FlightDetails flightId={selectedFlightId} onBack={handleBackToSearch} />
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
