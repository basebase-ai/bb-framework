/**
 * Snack - A Slack Clone
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
  ScrollArea,
  Box,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconMessage } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ChannelList } from "./components/ChannelList.jsx";
import { ChannelChat } from "./components/ChannelChat.jsx";
import { CreateChannelModal } from "./components/CreateChannelModal.jsx";
import { ChannelMembersModal } from "./components/ChannelMembersModal.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  return (
    <AppShell
      header={{ height: 50 }}
      navbar={{ width: 260, breakpoint: "sm" }}
      padding={0}
      styles={{
        main: {
          backgroundColor: "var(--mantine-color-gray-0)",
        },
      }}
    >
      {/* Header */}
      <AppShell.Header
        style={{
          backgroundColor: "#4A134B",
          borderBottom: "1px solid #3D0E3E",
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <IconMessage size={24} color="white" />
            <Title order={4} c="white">
              Snack
            </Title>
          </Group>
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
              <Text size="sm" c="white">
                {profile?.displayName || user.email}
              </Text>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar
        style={{
          backgroundColor: "#4A134B",
          borderRight: "none",
        }}
      >
        <AppShell.Section
          grow
          component={ScrollArea}
          scrollbarSize={6}
          styles={{
            viewport: {
              "& > div": {
                display: "block !important",
              },
            },
          }}
        >
          <Box
            py="md"
            style={{
              "& .mantine-NavLink-root": {
                color: "white",
                borderRadius: 0,
                paddingLeft: 16,
                paddingRight: 16,
              },
              "& .mantine-NavLink-root:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
              "& .mantine-NavLink-root[data-active]": {
                backgroundColor: "#3D0E3E",
                color: "white",
              },
            }}
          >
            <ChannelList />
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Box h="calc(100vh - 50px)" bg="white">
          <ChannelChat />
        </Box>
      </AppShell.Main>

      {/* Modals */}
      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
      <CreateChannelModal />
      <ChannelMembersModal />
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
