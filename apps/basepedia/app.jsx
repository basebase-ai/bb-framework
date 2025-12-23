/**
 * Main app entry point - Basepedia
 * 
 * Routes:
 * - / (public): Page list with search
 * - /:slug (public): View/edit page (editing requires auth)
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Text, Avatar } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { AppRouter, RouteContent } from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";
import { PageList } from "./components/PageList.jsx";
import { PageEditor } from "./components/PageEditor.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import("../../framework/components/AppRouter.jsx").RouteDefinition[]} */
const routes = [
  { path: "/", component: PageList },
  { path: "/:slug", component: PageEditor },
];

// ============================================================================
// App Layout
// ============================================================================

function AppLayout() {
  const { user, authenticated } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { navigate } = useRoute();
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title 
            order={3} 
            style={{ cursor: 'pointer' }}
            onClick={() => navigate("/")}
          >
            Basepedia
          </Title>
          {authenticated && (
            <Group 
              gap="xs"
              style={{ cursor: 'pointer' }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user?.email}
                size="sm"
                radius="xl"
              />
              <Text size="sm" c="dimmed">
                {profile?.displayName || user?.email}
              </Text>
            </Group>
          )}
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
