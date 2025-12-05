/**
 * UpdateBase - Progress Updates for Startups (Multi-tenant)
 * Share updates with investors and stakeholders
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Tabs,
  Container,
  Badge,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconRocket,
  IconUsers,
  IconUsersGroup,
  IconSettings,
  IconBuilding,
} from "@tabler/icons-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useDocument } from "../../framework/hooks/useDocument.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { UpdateFeed } from "./components/UpdateFeed.jsx";
import { SubscribersManager } from "./components/SubscribersManager.jsx";
import { NoOrganization } from "./components/NoOrganization.jsx";
import { OrganizationSettings } from "./components/OrganizationSettings.jsx";
import { APP_ID, collections } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * @typedef {'updates' | 'subscribers'} TabValue
 */

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} orgId
 * @property {string} email
 * @property {string | null} userId
 * @property {'owner' | 'admin' | 'member'} role
 * @property {'invited' | 'active'} status
 */

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string | null} description
 * @property {string} createdBy
 */

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [orgSettingsOpened, setOrgSettingsOpened] = useState(false);
  /** @type {[TabValue, React.Dispatch<React.SetStateAction<TabValue>>]} */
  const [activeTab, setActiveTab] = useState("updates");
  const [refreshKey, setRefreshKey] = useState(0);

  // Query for user's membership by email
  const userEmail = user?.email?.toLowerCase() || "";
  const membershipQuery = useMemo(
    () => ({ where: [["email", "==", userEmail]] }),
    [userEmail]
  );
  const { data: memberships, loading: membershipsLoading } = useCollection(
    collections.members,
    membershipQuery
  );

  // User's first membership (should only have one per org pattern)
  const membership = /** @type {Member | undefined} */ (memberships?.[0]);

  // Activate membership when invited user signs in
  useEffect(() => {
    if (membership && membership.status === "invited" && user?.uid) {
      const activateMembership = async () => {
        try {
          await setDoc(
            doc(db, collections.members, membership.id),
            {
              userId: user.uid,
              status: "active",
              joinedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          console.error("Error activating membership:", err);
        }
      };
      activateMembership();
    }
  }, [membership?.id, membership?.status, user?.uid]);

  // Get the organization details
  const { data: organization, loading: orgLoading } = useDocument(
    collections.organizations,
    membership?.orgId || null
  );

  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || isOwner;
  const orgId = membership?.orgId || null;

  // Handle organization created
  const handleOrganizationCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  // Show loading while checking membership
  if (membershipsLoading || (membership && orgLoading)) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading...</Text>
        </Stack>
      </Center>
    );
  }

  // Show NoOrganization if user has no membership
  if (!membership || !organization) {
    return (
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="sm">
              <IconRocket size={28} color="#228be6" />
              <Stack gap={0}>
                <Title order={3} style={{ lineHeight: 1.2 }}>
                  UpdateBase
                </Title>
                <Text size="xs" c="dimmed">
                  Startup Progress Updates
                </Text>
              </Stack>
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
                <Text size="sm" c="dimmed" visibleFrom="sm">
                  {profile?.displayName || user.email}
                </Text>
              </Group>
            )}
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <NoOrganization key={refreshKey} onOrganizationCreated={handleOrganizationCreated} />
        </AppShell.Main>

        <ProfileModal opened={profileModalOpened} onClose={() => setProfileModalOpened(false)} />
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="md">
            <Group gap="sm">
              <IconRocket size={28} color="#228be6" />
              <Stack gap={0}>
                <Title order={3} style={{ lineHeight: 1.2 }}>
                  UpdateBase
                </Title>
                <Text size="xs" c="dimmed">
                  Startup Progress Updates
                </Text>
              </Stack>
            </Group>

            {/* Organization Badge */}
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
              {isOwner && <IconSettings size={12} style={{ marginLeft: 4 }} />}
            </Badge>
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
              <Text size="sm" c="dimmed" visibleFrom="sm">
                {profile?.displayName || user.email}
              </Text>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg" py="md">
          <Tabs value={activeTab} onChange={(val) => setActiveTab(val || "updates")}>
            <Tabs.List>
              <Tabs.Tab value="updates" leftSection={<IconRocket size={16} />}>
                Updates
              </Tabs.Tab>
              <Tabs.Tab value="subscribers" leftSection={<IconUsers size={16} />}>
                Subscribers
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="updates" pt="lg">
              <UpdateFeed orgId={orgId} />
            </Tabs.Panel>

            <Tabs.Panel value="subscribers" pt="lg">
              <SubscribersManager orgId={orgId} />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>

      {/* Profile Modal */}
      <ProfileModal opened={profileModalOpened} onClose={() => setProfileModalOpened(false)} />

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
/** @type {ReturnType<typeof createRoot> | null} */
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
