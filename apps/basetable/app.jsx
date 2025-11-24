/**
 * Base Table - Notion-like Data Table Interface
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  ActionIcon,
  Avatar,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useRouter } from "../../framework/hooks/useRouter.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { TableView } from "./components/TableView.jsx";
import { PageList } from "./components/PageList.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { APP_ID } from "./schema.js";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === "dark";

  return (
    <ActionIcon
      variant="outline"
      onClick={toggleColorScheme}
      title="Toggle theme"
      size="lg"
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRouter();
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Extract page ID from URL (/page/{pageId})
  const pageId = path.startsWith("/page/") ? path.slice(6) : null;

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title
            order={3}
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            Base Table
          </Title>

          <Group gap="md">
            <ThemeToggle />
            {user && (
              <Group
                gap="xs"
                style={{ cursor: "pointer" }}
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
        {pageId ? (
          <TableView pageId={pageId} onNavigateHome={() => navigate("/")} />
        ) : (
          <PageList onNavigateTo={(id) => navigate(`/page/${id}`)} />
        )}
      </AppShell.Main>

      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        colors: {
          dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5c5f66',
            '#373A40',
            '#2C2E33',
            '#25262b',
            '#1A1B1E',
            '#141517',
            '#101113',
          ],
        },
      }}
    >
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

const container = document.getElementById("app");
let root;

function render() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

render();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
