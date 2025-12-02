/**
 * Main app entry point
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Burger, Group, Title, Text, Stack, Avatar } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAppStore } from "./stores/appStore.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProjectManager } from "./components/ProjectManager.jsx";
import { ProjectTable } from "./components/ProjectTable.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { ImproveThisButton } from "./components/ImproveThisButton.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const SELECTED_PROJECT_KEY = "todo-app:selectedProjectId";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Load selected project from localStorage on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
    if (savedProjectId) {
      setSelectedProjectId(savedProjectId);
    }
  }, []);

  // Save selected project to localStorage whenever it changes
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(SELECTED_PROJECT_KEY, selectedProjectId);
    } else {
      localStorage.removeItem(SELECTED_PROJECT_KEY);
    }
  }, [selectedProjectId]);

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    
    // Close sidebar on mobile when project is selected
    if (window.innerWidth < 768) { // sm breakpoint
      setSidebarOpen(false);
    }
  };

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
              <Avatar 
                src={profile?.photoURL} 
                alt={profile?.displayName || user.email}
                size="sm"
                radius="xl"
                style={{ cursor: 'pointer' }}
                onClick={() => setProfileModalOpened(true)}
              />
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ProjectManager
          onSelectProject={handleSelectProject}
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

      {/* Improve This Button */}
      <ImproveThisButton />
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

