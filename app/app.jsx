/**
 * Main app entry point
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Text, Avatar } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAuth } from "../framework/hooks/useAuth.js";
import { useUserProfile } from "../framework/hooks/useUserProfile.js";
import { NotesBoard } from "./components/NotesBoard.jsx";
import { AuthProvider, SignOutButton } from "../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>Basebase Starter App</Title>
          {user && (
            <Group gap="md">
              <Group gap="xs">
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
              <SignOutButton size="xs" />
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <NotesBoard />
      </AppShell.Main>
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

