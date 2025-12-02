/**
 * Sales CRM - Main app entry point
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Avatar, Tabs, Badge, Text, Loader, Center } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconLayoutDashboard,
  IconUserPlus,
  IconUsers,
  IconBriefcase,
  IconTarget,
  IconChecklist,
  IconBuilding,
  IconSettings
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useDocument } from "../../framework/hooks/useDocument.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID, collections } from "./schema.js";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";

// Import components
import { Dashboard } from "./components/Dashboard.jsx";
import { Leads } from "./components/Leads.jsx";
import { Contacts } from "./components/Contacts.jsx";
import { Accounts } from "./components/Accounts.jsx";
import { Opportunities } from "./components/Opportunities.jsx";
import { Activities } from "./components/Activities.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { NoOrganization } from "./components/NoOrganization.jsx";
import { OrganizationSettings } from "./components/OrganizationSettings.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

/**
 * @typedef {Object} OrganizationMember
 * @property {string} id
 * @property {string} orgId
 * @property {string} email
 * @property {string | null} userId
 * @property {'owner' | 'member'} role
 * @property {'invited' | 'active'} status
 */

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string} createdBy
 */

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [orgSettingsOpened, setOrgSettingsOpened] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Query for user's membership by email (works for both active and invited)
  const userEmail = user?.email?.toLowerCase() || "";
  const membershipQuery = useMemo(
    () => ({ where: [["email", "==", userEmail]] }),
    [userEmail]
  );
  const { data: memberships, loading: membershipsLoading } = useCollection(
    collections.members,
    membershipQuery
  );

  // User should only have one membership (enforced by composite doc ID: {orgId}_{email})
  const membership = /** @type {OrganizationMember | undefined} */ (
    memberships?.[0]
  );

  // Activate membership when invited user signs in
  useEffect(() => {
    if (membership && membership.status === "invited" && user?.uid) {
      const activateMembership = async () => {
        try {
          await setDoc(doc(db, collections.members, membership.id), {
            userId: user.uid,
            status: "active",
            joinedAt: serverTimestamp(),
          }, { merge: true });
        } catch (err) {
          console.error("Error activating membership:", err);
        }
      };
      activateMembership();
    }
  }, [membership?.id, membership?.status, user?.uid]);

  // Get the organization details if we have a membership
  const { data: organization, loading: orgLoading } = useDocument(
    collections.organizations,
    membership?.orgId || null
  );

  const isOwner = membership?.role === "owner";
  const orgId = membership?.orgId || null;

  // Handle organization created
  const handleOrganizationCreated = () => {
    // Trigger a refresh
    setRefreshKey((k) => k + 1);
  };

  // Show loading while checking membership
  if (membershipsLoading || (membership && orgLoading)) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Show NoOrganization if user has no membership
  if (!membership || !organization) {
    return <NoOrganization key={refreshKey} onOrganizationCreated={handleOrganizationCreated} />;
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="md">
            <Title order={3}>Sales CRM</Title>
            <Badge
              size="lg"
              variant="light"
              color="blue"
              leftSection={<IconBuilding size={14} />}
              style={{ cursor: "pointer" }}
              onClick={() => setOrgSettingsOpened(true)}
              title="Organization Settings"
            >
              {organization.name}
              {isOwner && (
                <IconSettings size={12} style={{ marginLeft: 4 }} />
              )}
            </Badge>
          </Group>
          {user && (
            <Avatar
              src={profile?.photoURL}
              alt={profile?.displayName || user.email}
              size="md"
              radius="xl"
              style={{ cursor: 'pointer' }}
              onClick={() => setProfileModalOpened(true)}
            />
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
            <Dashboard orgId={orgId} />
          </Tabs.Panel>

          <Tabs.Panel value="leads">
            <Leads orgId={orgId} />
          </Tabs.Panel>

          <Tabs.Panel value="contacts">
            <Contacts orgId={orgId} />
          </Tabs.Panel>

          <Tabs.Panel value="accounts">
            <Accounts orgId={orgId} />
          </Tabs.Panel>

          <Tabs.Panel value="opportunities">
            <Opportunities orgId={orgId} />
          </Tabs.Panel>

          <Tabs.Panel value="activities">
            <Activities orgId={orgId} />
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>

      {/* Profile Modal */}
      <ProfileModal 
        opened={profileModalOpened} 
        onClose={() => setProfileModalOpened(false)} 
      />

      {/* Organization Settings Modal */}
      <OrganizationSettings
        opened={orgSettingsOpened}
        onClose={() => setOrgSettingsOpened(false)}
        organization={organization}
        isOwner={isOwner}
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
