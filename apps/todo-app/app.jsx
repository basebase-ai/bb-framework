/**
 * Main app entry point
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Burger, Group, Title, Text, Stack, Avatar } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAppStore } from "./stores/appStore.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProjectManager } from "./components/ProjectManager.jsx";
import { ProjectTable } from "./components/ProjectTable.jsx";
import { AuthProvider, SignOutButton } from "../../framework/components/AuthProvider.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  return (
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
          <Title order={3}>Todo App</Title>
          {user && (
            <Group ml="auto" gap="md">
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
              <SignOutButton size="xs" />
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ProjectManager
          onSelectProject={setSelectedProjectId}
          selectedProjectId={selectedProjectId}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <ProjectTable projectId={selectedProjectId} />
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
      <AuthProvider>
        <AppContent />
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

