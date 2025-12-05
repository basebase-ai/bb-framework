/**
 * Main app entry point
 */

import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Burger, Group, Title, Text, Stack, Avatar } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAppStore } from "./stores/appStore.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { ProjectManager, ASSIGNED_TO_ME_VIEW } from "./components/ProjectManager.jsx";
import { ProjectTable } from "./components/ProjectTable.jsx";
import { AssignedToMeView } from "./components/AssignedToMeView.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { ImproveThisButton } from "./components/ImproveThisButton.jsx";
import { collections } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const SELECTED_PROJECT_KEY = "todo-app:selectedProjectId";

/**
 * Parse the URL path to extract route info
 * Routes:
 *   / or /assigned - Assigned to Me view
 *   /project/:projectId - Project view
 *   /project/:projectId/item/:itemId - Project view with item details open
 */
function parseRoute() {
  const path = window.location.pathname;
  
  // Assigned to me
  if (path === "/" || path === "/assigned") {
    return { view: ASSIGNED_TO_ME_VIEW, projectId: null, itemId: null };
  }
  
  // Project with optional item
  const projectMatch = path.match(/^\/project\/([^/]+)(?:\/item\/([^/]+))?$/);
  if (projectMatch) {
    return {
      view: "project",
      projectId: projectMatch[1],
      itemId: projectMatch[2] || null,
    };
  }
  
  // Default to assigned
  return { view: ASSIGNED_TO_ME_VIEW, projectId: null, itemId: null };
}

/**
 * Build a URL path for navigation
 */
function buildRoute(projectId, itemId = null) {
  if (!projectId || projectId === ASSIGNED_TO_ME_VIEW) {
    return "/assigned";
  }
  if (itemId) {
    return `/project/${projectId}/item/${itemId}`;
  }
  return `/project/${projectId}`;
}

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Get access to todoItems update function for moving tasks between projects
  const { update: updateTodoItem } = useCollection(collections.todoItems);

  // Handler for moving a task to a different project
  const handleMoveTask = useCallback(async (taskId, targetProjectId) => {
    if (!taskId || !targetProjectId) return;
    
    try {
      // Update the task's projectId and set order to -1 to put it at the top
      await updateTodoItem(taskId, {
        projectId: targetProjectId,
        order: -1,
      });
    } catch (error) {
      console.error("Error moving task:", error);
    }
  }, [updateTodoItem]);

  // Parse initial route on mount
  useEffect(() => {
    const route = parseRoute();
    if (route.view === ASSIGNED_TO_ME_VIEW) {
      setSelectedProjectId(ASSIGNED_TO_ME_VIEW);
    } else if (route.projectId) {
      setSelectedProjectId(route.projectId);
      if (route.itemId) {
        setSelectedItemId(route.itemId);
      }
    } else {
      // Fall back to localStorage
      const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
      if (savedProjectId) {
        setSelectedProjectId(savedProjectId);
      } else {
        setSelectedProjectId(ASSIGNED_TO_ME_VIEW);
      }
    }
  }, []);

  // Listen for popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute();
      if (route.view === ASSIGNED_TO_ME_VIEW) {
        setSelectedProjectId(ASSIGNED_TO_ME_VIEW);
        setSelectedItemId(null);
      } else if (route.projectId) {
        setSelectedProjectId(route.projectId);
        setSelectedItemId(route.itemId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL when selection changes (but not on initial load)
  const updateUrl = useCallback((projectId, itemId = null) => {
    const newPath = buildRoute(projectId, itemId);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, "", newPath);
    }
  }, []);

  // Save selected project to localStorage whenever it changes
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== ASSIGNED_TO_ME_VIEW) {
      localStorage.setItem(SELECTED_PROJECT_KEY, selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedItemId(null);
    updateUrl(projectId);
    
    // Close sidebar on mobile when project is selected
    if (window.innerWidth < 768) { // sm breakpoint
      setSidebarOpen(false);
    }
  };

  const handleOpenItem = useCallback((itemId) => {
    setSelectedItemId(itemId);
    if (selectedProjectId && selectedProjectId !== ASSIGNED_TO_ME_VIEW) {
      updateUrl(selectedProjectId, itemId);
    }
  }, [selectedProjectId, updateUrl]);

  const handleCloseItem = useCallback(() => {
    setSelectedItemId(null);
    if (selectedProjectId && selectedProjectId !== ASSIGNED_TO_ME_VIEW) {
      updateUrl(selectedProjectId);
    }
  }, [selectedProjectId, updateUrl]);

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
          <Title order={3}>Projectbase</Title>
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
          onMoveTask={handleMoveTask}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        {selectedProjectId === ASSIGNED_TO_ME_VIEW ? (
          <AssignedToMeView />
        ) : (
          <ProjectTable 
            projectId={selectedProjectId} 
            initialItemId={selectedItemId}
            onOpenItem={handleOpenItem}
            onCloseItem={handleCloseItem}
          />
        )}
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

