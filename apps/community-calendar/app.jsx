/**
 * Main app entry point - San Francisco Community Calendar
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
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconSettings, IconHome } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useDocument } from "../../framework/hooks/useDocument.js";
import { EventsGrid } from "./components/EventsGrid.jsx";
import { CalendarsTable } from "./components/CalendarsTable.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID, collections } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Fetch app document to check ownership
  const { data: appDoc } = useDocument(collections.apps, APP_ID);

  // Check if user is owner or collaborator
  const isOwner = user && appDoc && appDoc.owner === user.uid;
  const isCollaborator = user && appDoc && appDoc.collaborators && appDoc.collaborators.includes(user.uid);
  const canAdmin = isOwner || isCollaborator;

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>SF Community Calendar</Title>
          <Group gap="md">
            {canAdmin && (
              <ActionIcon
                variant={showAdmin ? "filled" : "subtle"}
                size="lg"
                onClick={() => setShowAdmin(!showAdmin)}
                title={showAdmin ? "Show Public View" : "Show Admin View"}
              >
                {showAdmin ? <IconHome size={20} /> : <IconSettings size={20} />}
              </ActionIcon>
            )}
            {user && (
              <Group 
                gap="xs"
                style={{ cursor: 'pointer' }}
                onClick={() => setProfileModalOpened(true)}
              >
                <Avatar
                  src={profile?.photoURL}
                  alt={profile?.displayName || user.email}
                  size="sm"
                  radius="xl"
                />
                <Text size="sm" c="dimmed">
                  {profile?.displayName || user.email}
                </Text>
              </Group>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {showAdmin ? (
          /* Admin View - Calendars Table */
          <CalendarsTable />
        ) : (
          /* Public View */
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
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
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

