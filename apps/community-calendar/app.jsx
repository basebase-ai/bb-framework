/**
 * Main app entry point - San Francisco Community Calendar
 * 
 * Routes:
 * - / (public): Event search and discovery
 * - /admin (auth): Calendar management for owners/collaborators
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
  Box,
  Container,
  Stack,
  Button,
  ActionIcon,
  Alert,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconSettings, IconHome, IconAlertCircle } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useDocument } from "../../framework/hooks/useDocument.js";
import { AppRouter, RouteContent } from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";
import { EventsGrid } from "./components/EventsGrid.jsx";
import { CalendarsTable } from "./components/CalendarsTable.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { APP_ID, collections } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================================================
// Route Components
// ============================================================================

/** Public events page with hero section */
function EventsPage() {
  return (
    <>
      {/* Hero Section with Background */}
      <Box
        style={{
          position: 'relative',
          height: 350,
          backgroundImage: 'url(https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=2000&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Overlay for better text readability */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        />
        
        {/* Title */}
        <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
          <Stack align="center" gap="md">
            <Title
              order={1}
              size={56}
              fw={700}
              style={{
                color: 'white',
                textAlign: 'center',
                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
                lineHeight: 1.1,
              }}
            >
              San Francisco Community Calendar
            </Title>
            <Text
              size="xl"
              style={{
                color: 'white',
                textAlign: 'center',
                textShadow: '1px 1px 4px rgba(0, 0, 0, 0.7)',
              }}
            >
              Discover events happening in your community
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Events Grid */}
      <EventsGrid />
    </>
  );
}

/** Admin page - requires owner/collaborator permissions */
function AdminPage() {
  const { user } = useAuth();
  const { navigate } = useRoute();
  const { data: appDoc } = useDocument(collections.apps, APP_ID);

  // Check if user is owner or collaborator
  const isOwner = user && appDoc && appDoc.owner === user.uid;
  const isCollaborator = user && appDoc && appDoc.collaborators && appDoc.collaborators.includes(user.uid);
  const canAdmin = isOwner || isCollaborator;

  if (!canAdmin) {
    return (
      <Container size="sm" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Access Denied" color="red">
          You don't have permission to access the admin area. Only app owners and collaborators can manage calendars.
        </Alert>
        <Button mt="md" variant="light" onClick={() => navigate("/")}>
          Back to Events
        </Button>
      </Container>
    );
  }

  return <CalendarsTable />;
}

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import("../../framework/components/AppRouter.jsx").RouteDefinition[]} */
const routes = [
  { path: "/", component: EventsPage },
  { path: "/admin", component: AdminPage, auth: true },
];

// ============================================================================
// App Layout
// ============================================================================

function AppLayout() {
  const { user, authenticated } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRoute();
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Fetch app document to check ownership (for showing admin button)
  const { data: appDoc } = useDocument(collections.apps, APP_ID);

  const isOwner = user && appDoc && appDoc.owner === user.uid;
  const isCollaborator = user && appDoc && appDoc.collaborators && appDoc.collaborators.includes(user.uid);
  const canAdmin = isOwner || isCollaborator;
  const isAdminPage = path === "/admin";

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3} style={{ cursor: 'pointer' }} onClick={() => navigate("/")}>
            Eventbase
          </Title>
          <Group gap="md">
            {canAdmin && (
              <ActionIcon
                variant={isAdminPage ? "filled" : "subtle"}
                size="lg"
                onClick={() => navigate(isAdminPage ? "/" : "/admin")}
                title={isAdminPage ? "Show Public View" : "Show Admin View"}
              >
                {isAdminPage ? <IconHome size={20} /> : <IconSettings size={20} />}
              </ActionIcon>
            )}
            {authenticated && (
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user?.email}
                size="sm"
                radius="xl"
                style={{ cursor: 'pointer' }}
                onClick={() => setProfileModalOpened(true)}
              />
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <RouteContent />
      </AppShell.Main>

      {/* Profile Modal */}
      <ProfileModal 
        opened={profileModalOpened} 
        onClose={() => setProfileModalOpened(false)} 
      />
    </AppShell>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppRouter appId={APP_ID} routes={routes}>
        <AppLayout />
      </AppRouter>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
/** @type {import('react-dom/client').Root | null} */
let root = null;

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
