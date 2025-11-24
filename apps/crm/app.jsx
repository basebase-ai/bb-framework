/**
 * Sales CRM - Main app entry point
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Text, Avatar, Tabs } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconLayoutDashboard,
  IconUserPlus,
  IconUsers,
  IconBriefcase,
  IconTarget,
  IconChecklist
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Import components
import { Dashboard } from "./components/Dashboard.jsx";
import { Leads } from "./components/Leads.jsx";
import { Contacts } from "./components/Contacts.jsx";
import { Accounts } from "./components/Accounts.jsx";
import { Opportunities } from "./components/Opportunities.jsx";
import { Activities } from "./components/Activities.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>Sales CRM</Title>
          {user && (
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
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard size={16} />}>
              Dashboard
            </Tabs.Tab>
            <Tabs.Tab value="leads" leftSection={<IconUserPlus size={16} />}>
              Leads
            </Tabs.Tab>
            <Tabs.Tab value="contacts" leftSection={<IconUsers size={16} />}>
              Contacts
            </Tabs.Tab>
            <Tabs.Tab value="accounts" leftSection={<IconBriefcase size={16} />}>
              Accounts
            </Tabs.Tab>
            <Tabs.Tab value="opportunities" leftSection={<IconTarget size={16} />}>
              Opportunities
            </Tabs.Tab>
            <Tabs.Tab value="activities" leftSection={<IconChecklist size={16} />}>
              Activities
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard">
            <Dashboard />
          </Tabs.Panel>

          <Tabs.Panel value="leads">
            <Leads />
          </Tabs.Panel>

          <Tabs.Panel value="contacts">
            <Contacts />
          </Tabs.Panel>

          <Tabs.Panel value="accounts">
            <Accounts />
          </Tabs.Panel>

          <Tabs.Panel value="opportunities">
            <Opportunities />
          </Tabs.Panel>

          <Tabs.Panel value="activities">
            <Activities />
          </Tabs.Panel>
        </Tabs>
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
