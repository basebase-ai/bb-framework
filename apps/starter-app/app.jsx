/**
 * Starter App - A placeholder template designed to be customized
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
  Stack,
  Container,
  Box,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconPlus, IconLogin } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Main page content - shared between authenticated and landing page
 * @param {{ onSignIn?: () => void }} props
 */
function MainContent({ onSignIn }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [counter, setCounter] = useState(0);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header style={{ backgroundColor: "#fff", borderBottom: "1px solid #e9ecef" }}>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3} c="dark">Default</Title>
          {user ? (
            <Group 
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Text size="sm" c="dimmed">
                {profile?.displayName || user.email}
              </Text>
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email || "User"}
                size="sm"
                radius="xl"
              >
                {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
              </Avatar>
            </Group>
          ) : (
            <Button
              variant="light"
              leftSection={<IconLogin size={16} />}
              onClick={onSignIn}
            >
              Sign In
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ backgroundColor: "#f8f9fa" }}>
        <Container size="sm">
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "calc(100vh - 120px)",
              textAlign: "center",
            }}
          >
            <Stack align="center" gap="xl">
              <div>
                <Title order={1} size="3rem" c="dark" mb="md">
                  Welcome to Your App
                </Title>
                <Text size="xl" c="dimmed" maw={500}>
                  This is a starter template. Customize this page to build something amazing!
                </Text>
              </div>

              <Stack align="center" gap="md" mt="xl">
                <Text size="6rem" fw={700} c="blue" lh={1}>
                  {counter}
                </Text>
                <Button
                  size="lg"
                  leftSection={<IconPlus size={20} />}
                  onClick={() => setCounter((c) => c + 1)}
                >
                  Click me!
                </Button>
                <Text size="sm" c="dimmed">
                  A simple counter to get you started
                </Text>
              </Stack>
            </Stack>
          </Box>
        </Container>
      </AppShell.Main>

      {/* Profile Modal - only rendered when user is logged in */}
      {user && (
        <ProfileModal 
          opened={profileModalOpened} 
          onClose={() => setProfileModalOpened(false)} 
        />
      )}
    </AppShell>
  );
}

/**
 * Landing page for unauthenticated users
 * @param {{ onSignIn: () => void }} props
 */
function LandingPage({ onSignIn }) {
  return <MainContent onSignIn={onSignIn} />;
}

function AppContent() {
  return <MainContent />;
}

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
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
