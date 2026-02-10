/**
 * ELIZA - A Computer Program For the Study of Natural Language Communication
 * Based on Joseph Weizenbaum's 1966 paper
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
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconLogin, IconBrain } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { ElizaChat } from "./components/ElizaChat.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Main page content
 */
function MainContent({ onSignIn }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #333" }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <IconBrain size={28} color="#00aaff" />
            <Box>
              <Title order={3} c="#00aaff" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                ELIZA
              </Title>
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', marginTop: '-4px' }}>
                1966 Natural Language Processor
              </Text>
            </Box>
          </Group>
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
              color="cyan"
              leftSection={<IconLogin size={16} />}
              onClick={onSignIn}
            >
              Sign In
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ backgroundColor: "#0a0a0a", height: 'calc(100vh - 60px)' }}>
        <ElizaChat />
      </AppShell.Main>

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
 */
function LandingPage({ onSignIn }) {
  return (
    <Box style={{ backgroundColor: "#0a0a0a", minHeight: "100vh" }}>
      <MainContent onSignIn={onSignIn} />
    </Box>
  );
}

function AppContent() {
  return <MainContent />;
}

function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications position="top-right" />
      <AuthProvider
        appId={APP_ID}
        landingPage={(props) => <LandingPage {...props} />}
        requireAuth={false}
      >
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
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
