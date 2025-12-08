/**
 * Sales CRM - Main app entry point
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Avatar, Tabs, Badge, Text, Loader, Center, Menu, Button, Divider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconLayoutDashboard,
  IconUserPlus,
  IconUsers,
  IconBriefcase,
  IconTarget,
  IconChecklist,
  IconBuilding,
  IconSettings,
  IconChevronDown,
  IconCheck,
  IconPlus,
  IconMail
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
import { LandingPage } from "./components/LandingPage.jsx";

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

/** @type {string} */
const SELECTED_ORG_KEY = "crm_selected_org";

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [orgSettingsOpened, setOrgSettingsOpened] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Selected org ID from localStorage
  const [selectedOrgId, setSelectedOrgId] = useState(
    /** @type {string | null} */ (() => {
      try {
        return localStorage.getItem(SELECTED_ORG_KEY);
      } catch {
        return null;
      }
    })
  );

  // Query for ALL user's memberships by email
  const userEmail = user?.email?.toLowerCase() || "";
  const membershipQuery = useMemo(
    () => ({ where: [["email", "==", userEmail]] }),
    [userEmail]
  );
  const { data: memberships, loading: membershipsLoading } = useCollection(
    collections.members,
    membershipQuery
  );

  // Split memberships into active and pending invitations
  const activeMemberships = useMemo(
    () => /** @type {OrganizationMember[]} */ (
      (memberships || []).filter((m) => m.status === "active")
    ),
    [memberships]
  );
  
  const pendingInvitations = useMemo(
    () => /** @type {OrganizationMember[]} */ (
      (memberships || []).filter((m) => m.status === "invited")
    ),
    [memberships]
  );

  // Fetch all organizations the user belongs to (active + pending)
  const allOrgIds = useMemo(
    () => [...new Set([
      ...activeMemberships.map((m) => m.orgId),
      ...((memberships || []).filter((m) => m.status === "invited").map((m) => m.orgId))
    ])],
    [activeMemberships, memberships]
  );
  
  // Fetch organizations - only when we have IDs to fetch
  const { data: allOrganizations, loading: orgsLoading } = useCollection(
    collections.organizations,
    allOrgIds.length > 0 ? { where: [] } : undefined
  );
  
  // Filter to only orgs the user is a member of (active)
  const activeOrgIds = useMemo(
    () => activeMemberships.map((m) => m.orgId),
    [activeMemberships]
  );
  
  const userOrganizations = useMemo(
    () => /** @type {Organization[]} */ (
      (allOrganizations || []).filter((org) => activeOrgIds.includes(org.id))
    ),
    [allOrganizations, activeOrgIds]
  );

  // Determine current membership and organization
  const currentMembership = useMemo(() => {
    if (!activeMemberships.length) return undefined;
    // Try to find membership for selected org, fallback to first
    const selected = activeMemberships.find((m) => m.orgId === selectedOrgId);
    return selected || activeMemberships[0];
  }, [activeMemberships, selectedOrgId]);

  const organization = useMemo(
    () => userOrganizations.find((org) => org.id === currentMembership?.orgId),
    [userOrganizations, currentMembership]
  );

  // Update selectedOrgId if current selection is invalid
  useEffect(() => {
    if (currentMembership && currentMembership.orgId !== selectedOrgId) {
      setSelectedOrgId(currentMembership.orgId);
      try {
        localStorage.setItem(SELECTED_ORG_KEY, currentMembership.orgId);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [currentMembership, selectedOrgId]);

  // Handle switching organization
  const handleSwitchOrg = (/** @type {string} */ orgId) => {
    setSelectedOrgId(orgId);
    try {
      localStorage.setItem(SELECTED_ORG_KEY, orgId);
    } catch {
      // Ignore localStorage errors
    }
    setActiveTab("dashboard"); // Reset to dashboard on switch
  };

  // Handle accepting an invitation
  const handleAcceptInvitation = async (/** @type {OrganizationMember} */ invitation) => {
    if (!user?.uid) return;
    
    try {
      await setDoc(doc(db, collections.members, invitation.id), {
        userId: user.uid,
        status: "active",
        joinedAt: serverTimestamp(),
      }, { merge: true });
      
      // Switch to the newly accepted org
      handleSwitchOrg(invitation.orgId);
    } catch (err) {
      console.error("Error accepting invitation:", err);
    }
  };

  // Get pending organizations for display (already fetched in allOrganizations)
  const pendingOrganizations = useMemo(
    () => {
      const pendingOrgIds = pendingInvitations.map((m) => m.orgId);
      return /** @type {Organization[]} */ (
        (allOrganizations || []).filter((org) => pendingOrgIds.includes(org.id))
      );
    },
    [allOrganizations, pendingInvitations]
  );

  const isOwner = currentMembership?.role === "owner";
  const orgId = currentMembership?.orgId || null;

  // Handle organization created
  const handleOrganizationCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  // Only show loader on INITIAL load (no data yet)
  const isInitialLoad = membershipsLoading && !memberships;
  const isLoadingOrgs = orgsLoading && !allOrganizations && allOrgIds.length > 0;
  
  if (isInitialLoad || isLoadingOrgs) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Show NoOrganization if user has no active membership
  if (!currentMembership || !organization) {
    return (
      <NoOrganization 
        key={refreshKey} 
        onOrganizationCreated={handleOrganizationCreated}
        pendingInvitations={pendingInvitations}
        pendingOrganizations={pendingOrganizations}
        onAcceptInvitation={handleAcceptInvitation}
      />
    );
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="md">
            <Title order={3}>Sales CRM</Title>
            
            {/* Organization Switcher Menu */}
            <Menu shadow="md" width={280} position="bottom-start">
              <Menu.Target>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconBuilding size={14} />}
                  rightSection={<IconChevronDown size={14} />}
                  size="sm"
                >
                  {organization.name}
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                {/* Current org indicator */}
                <Menu.Label>Current Organization</Menu.Label>
                <Menu.Item
                  leftSection={<IconCheck size={16} />}
                  disabled
                  style={{ opacity: 1 }}
                >
                  <Text size="sm" fw={500}>{organization.name}</Text>
                  <Text size="xs" c="dimmed">{isOwner ? "Owner" : "Member"}</Text>
                </Menu.Item>

                {/* Other organizations */}
                {userOrganizations.length > 1 && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Switch Organization</Menu.Label>
                    {userOrganizations
                      .filter((org) => org.id !== organization.id)
                      .map((org) => {
                        const mem = activeMemberships.find((m) => m.orgId === org.id);
                        return (
                          <Menu.Item
                            key={org.id}
                            leftSection={<IconBuilding size={16} />}
                            onClick={() => handleSwitchOrg(org.id)}
                          >
                            <Text size="sm">{org.name}</Text>
                            <Text size="xs" c="dimmed">
                              {mem?.role === "owner" ? "Owner" : "Member"}
                            </Text>
                          </Menu.Item>
                        );
                      })}
                  </>
                )}

                {/* Pending invitations */}
                {pendingInvitations.length > 0 && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>
                      <Group gap={4}>
                        <IconMail size={14} />
                        Pending Invitations
                      </Group>
                    </Menu.Label>
                    {pendingInvitations.map((invitation) => {
                      const org = pendingOrganizations.find(
                        (o) => o.id === invitation.orgId
                      );
                      return (
                        <Menu.Item
                          key={invitation.id}
                          leftSection={<IconMail size={16} />}
                          onClick={() => handleAcceptInvitation(invitation)}
                          color="green"
                        >
                          <Text size="sm">{org?.name || "Unknown Org"}</Text>
                          <Text size="xs" c="dimmed">Click to accept</Text>
                        </Menu.Item>
                      );
                    })}
                  </>
                )}

                <Menu.Divider />
                
                {/* Organization settings */}
                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={() => setOrgSettingsOpened(true)}
                >
                  Organization Settings
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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
      <AuthProvider 
        appId={APP_ID}
        landingPage={(props) => <LandingPage {...props} />}
      >
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
