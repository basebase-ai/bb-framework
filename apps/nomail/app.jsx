/**
 * Main app entry point - NoMail
 * Smart email filtering that shows only messages that need responses
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Text, Avatar, Tabs } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconMail, IconSettings } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { EmailList } from "./components/EmailList.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
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
  const [activeTab, setActiveTab] = useState("emails");

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>📬 NoMail</Title>
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
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="emails" leftSection={<IconMail size={16} />}>
              Important Emails
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Settings
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="emails" pt="md">
            <EmailList />
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <SettingsPanel />
          </Tabs.Panel>
        </Tabs>
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

