/**
 * Main app entry point - Basepedia
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Text, Avatar } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useRouter } from "../../framework/hooks/useRouter.js";
import { PageList } from "./components/PageList.jsx";
import { PageEditor } from "./components/PageEditor.jsx";
import { CreatePageModal } from "./components/CreatePageModal.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRouter();
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [createPageModalOpened, setCreatePageModalOpened] = useState(false);
  
  // Extract page slug from URL path
  const currentPage = path === "/" || path === "" ? null : path.slice(1);

  const handleNavigateHome = () => {
    navigate("/");
  };

  const handleNavigateToPage = (slug) => {
    navigate(`/${slug}`);
  };

  const handleCreatePage = () => {
    if (!user) {
      alert("Please sign in to create pages");
      return;
    }
    setCreatePageModalOpened(true);
  };

  const handlePageCreated = (slug) => {
    navigate(`/${slug}`);
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title 
            order={3} 
            style={{ cursor: 'pointer' }}
            onClick={handleNavigateHome}
          >
            Basepedia
          </Title>
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
      </AppShell.Header>

      <AppShell.Main>
        {currentPage ? (
          <PageEditor
            slug={currentPage}
            onNavigateHome={handleNavigateHome}
            onPageDeleted={handleNavigateHome}
          />
        ) : (
          <PageList
            onNavigate={handleNavigateToPage}
            onCreatePage={handleCreatePage}
          />
        )}
      </AppShell.Main>

      {/* Profile Modal */}
      <ProfileModal 
        opened={profileModalOpened} 
        onClose={() => setProfileModalOpened(false)} 
      />

      {/* Create Page Modal */}
      <CreatePageModal
        opened={createPageModalOpened}
        onClose={() => setCreatePageModalOpened(false)}
        onPageCreated={handlePageCreated}
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

