/**
 * Main app entry point
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Burger, Group, Title, Text } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAppStore } from "./stores/appStore.js";
import { useAuth } from "../framework/hooks/useAuth.js";
import { AppsList } from "./components/AppsList.jsx";
import { AuthProvider, SignOutButton } from "./components/AuthProvider.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function App() {
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider>
        <AppShell
          header={{ height: 60 }}
          navbar={{
            width: 300,
            breakpoint: "sm",
            collapsed: { mobile: !sidebarOpen },
          }}
          padding="md"
        >
          <AppShell.Header>
            <Group h="100%" px="md">
              <Burger opened={sidebarOpen} onClick={toggleSidebar} hiddenFrom="sm" size="sm" />
              <Title order={3}>Basebase Framework</Title>
              {user && (
                <Group ml="auto" gap="md">
                  <Text size="sm" c="dimmed">
                    {user.email}
                  </Text>
                  <SignOutButton size="xs" />
                </Group>
              )}
            </Group>
          </AppShell.Header>

          <AppShell.Navbar p="md">
            <Text size="sm" fw={500} mb="md">
              Navigation
            </Text>
            <Text size="sm" c="dimmed">
              Apps
            </Text>
          </AppShell.Navbar>

          <AppShell.Main>
            <AppsList />
          </AppShell.Main>
        </AppShell>
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app
const root = createRoot(document.getElementById("app"));
root.render(<App />);

// Enable hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept();
}

export default App;

