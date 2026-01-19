/**
 * OAuth Integration Test App
 * Test various OAuth integrations via Nango
 */

import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Avatar,
  Button,
  Stack,
  Badge,
  NavLink,
  ScrollArea,
  Box,
  Container,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  SiGmail,
  SiHubspot,
  SiSlack,
  SiGooglesheets,
  SiAirtable,
  SiSupabase,
  SiSalesforce,
  SiGithub,
  SiNotion,
  SiGooglecalendar,
  SiStripe,
  SiLinkedin,
  SiPostgresql,
  SiMongodb,
  SiCoda,
  SiGoogleads,
} from "react-icons/si";
import { TbApi } from "react-icons/tb";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useFunction } from "../../framework/hooks/useFunction.js";
import { useNangoOAuth, NangoIntegrations } from "../../framework/hooks/useNangoOAuth.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Load Google Fonts (matching www landing page)
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap";

/** Basebase Logo SVG Component */
function BasebaseLogo({ size = 28 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 45 56" width={size} height={size * (56 / 45)}>
      <path fill="#FF7300" d="M0 43.052C0 36.396 5.396 31 12.052 31c1.076 0 1.948.872 1.948 1.948V49a7 7 0 1 1-14 0v-5.948Z" />
      <path fill="#FFBE00" d="M32.5 31C39.404 31 45 36.596 45 43.5S39.404 56 32.5 56 20 50.404 20 43.5v-9.022A3.479 3.479 0 0 1 23.479 31H32.5Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#FBBC05" d="M32.5 0C39.404 0 45 5.596 45 12.5S39.404 25 32.5 25h-9.021A3.479 3.479 0 0 1 20 21.521V12.5C20 5.596 25.596 0 32.5 0Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#FF7300" d="M7 0a7 7 0 0 1 7 7v16.052A1.948 1.948 0 0 1 12.052 25C5.396 25 0 19.604 0 12.948V7a7 7 0 0 1 7-7Z" />
    </svg>
  );
}

/** @type {React.CSSProperties} */
const navLinkStyle = { color: "#1a1a1a", textDecoration: "none", cursor: "pointer", fontWeight: 400 };

// Integration Panels
import {
  GmailPanel,
  HubSpotPanel,
  SlackPanel,
  SheetsPanel,
  AirtablePanel,
  SupabasePanel,
  SalesforcePanel,
  GitHubPanel,
  NotionPanel,
  CodaPanel,
  ApifyPanel,
  CalendarPanel,
  StripePanel,
  LinkedInPanel,
  PostgresPanel,
  MongoDBPanel,
  GoogleAdsPanel,
} from "./components/integrations/index.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * @typedef {Object} IntegrationConfig
 * @property {string} id
 * @property {string} label
 * @property {React.ComponentType<{size: number, color: string}>} icon
 * @property {string} color
 */

/** @type {IntegrationConfig[]} */
const INTEGRATION_CONFIG = [
  { id: "gmail", label: "Gmail", icon: SiGmail, color: "#EA4335" },
  { id: "hubspot", label: "HubSpot", icon: SiHubspot, color: "#ff7a59" },
  { id: "slack", label: "Slack", icon: SiSlack, color: "#4A154B" },
  { id: "sheets", label: "Google Sheets", icon: SiGooglesheets, color: "#0F9D58" },
  { id: "googleads", label: "Google Ads", icon: SiGoogleads, color: "#4285F4" },
  { id: "airtable", label: "Airtable", icon: SiAirtable, color: "#18BFFF" },
  { id: "supabase", label: "Supabase", icon: SiSupabase, color: "#3ECF8E" },
  { id: "postgres", label: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
  { id: "mongodb", label: "MongoDB", icon: SiMongodb, color: "#47A248" },
  { id: "salesforce", label: "Salesforce", icon: SiSalesforce, color: "#00A1E0" },
  { id: "github", label: "GitHub", icon: SiGithub, color: "#333" },
  { id: "notion", label: "Notion", icon: SiNotion, color: "#000" },
  { id: "coda", label: "Coda", icon: SiCoda, color: "#F46A54" },
  { id: "apify", label: "Apify", icon: TbApi, color: "#00D4AA" },
  { id: "calendar", label: "Google Calendar", icon: SiGooglecalendar, color: "#4285F4" },
  { id: "stripe", label: "Stripe", icon: SiStripe, color: "#635BFF" },
  { id: "linkedin", label: "LinkedIn (Airtop)", icon: SiLinkedin, color: "#0A66C2" },
];

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [activeTab, setActiveTab] = useState("gmail");

  // OAuth connection status (checked automatically by useNangoOAuth)
  const { isConnected: gmailConnected } = useNangoOAuth(NangoIntegrations.googleMail);
  const { isConnected: hubspotConnected } = useNangoOAuth(NangoIntegrations.hubspot);
  const { isConnected: slackConnected } = useNangoOAuth(NangoIntegrations.slack);
  const { isConnected: sheetsConnected } = useNangoOAuth(NangoIntegrations.googleSheets);
  const { isConnected: airtableConnected } = useNangoOAuth(NangoIntegrations.airtable);
  const { isConnected: salesforceConnected } = useNangoOAuth(NangoIntegrations.salesforce);
  const { isConnected: githubConnected } = useNangoOAuth(NangoIntegrations.github);
  const { isConnected: notionConnected } = useNangoOAuth(NangoIntegrations.notion);
  const { isConnected: calendarConnected } = useNangoOAuth(NangoIntegrations.googleCalendar);
  const { isConnected: stripeConnected } = useNangoOAuth(NangoIntegrations.stripe);
  const { isConnected: googleAdsConnected } = useNangoOAuth(NangoIntegrations.googleAds);

  // Credential-based connection status
  const { call: credentialManager } = useFunction("credentialManager");
  const { call: airtopSession } = useFunction("airtopSession");

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [postgresConnected, setPostgresConnected] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [mongodbConnected, setMongodbConnected] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [codaConnected, setCodaConnected] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [apifyConnected, setApifyConnected] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
  const [linkedinConnected, setLinkedinConnected] = useState(false);

  // Check credential-based integrations on mount
  useEffect(() => {
    if (!user) return;

    // Check Supabase
    credentialManager({ action: "get", serviceName: "supabase" })
      .then((r) => setSupabaseConnected(r.hasCredentials === true))
      .catch(() => setSupabaseConnected(false));

    // Check PostgreSQL
    credentialManager({ action: "get", serviceName: "postgres" })
      .then((r) => setPostgresConnected(r.hasCredentials === true))
      .catch(() => setPostgresConnected(false));

    // Check MongoDB
    credentialManager({ action: "get", serviceName: "mongodb" })
      .then((r) => setMongodbConnected(r.hasCredentials === true))
      .catch(() => setMongodbConnected(false));

    // Check Coda
    credentialManager({ action: "get", serviceName: "coda" })
      .then((r) => setCodaConnected(r.hasCredentials === true))
      .catch(() => setCodaConnected(false));

    // Check Apify
    credentialManager({ action: "get", serviceName: "apify" })
      .then((r) => setApifyConnected(r.hasCredentials === true))
      .catch(() => setApifyConnected(false));

    // Check LinkedIn via Airtop
    airtopSession({ action: "checkProfile", profileName: "linkedin" })
      .then((r) => setLinkedinConnected(r.success === true && r.hasProfile === true))
      .catch(() => setLinkedinConnected(false));
  }, [user]);

  // Build connection status object for sidebar
  const connectionStatus = {
    gmail: gmailConnected,
    hubspot: hubspotConnected,
    slack: slackConnected,
    sheets: sheetsConnected,
    googleads: googleAdsConnected,
    airtable: airtableConnected,
    supabase: supabaseConnected,
    postgres: postgresConnected,
    mongodb: mongodbConnected,
    salesforce: salesforceConnected,
    github: githubConnected,
    notion: notionConnected,
    coda: codaConnected,
    apify: apifyConnected,
    calendar: calendarConnected,
    stripe: stripeConnected,
    linkedin: linkedinConnected,
  };

  // Callbacks for credential-based integrations to update parent state
  const onSupabaseChange = useCallback((c) => setSupabaseConnected(c), []);
  const onPostgresChange = useCallback((c) => setPostgresConnected(c), []);
  const onMongodbChange = useCallback((c) => setMongodbConnected(c), []);
  const onCodaChange = useCallback((c) => setCodaConnected(c), []);
  const onApifyChange = useCallback((c) => setApifyConnected(c), []);
  const onLinkedinChange = useCallback((c) => setLinkedinConnected(c), []);

  // Render the active integration panel
  const renderContent = () => {
    if (!user) {
      return (
        <Stack align="center" justify="center" h={400}>
          <Text c="dimmed" size="lg">
            Please sign in to test integrations
          </Text>
        </Stack>
      );
    }

    switch (activeTab) {
      case "gmail":
        return <GmailPanel user={user} />;
      case "hubspot":
        return <HubSpotPanel user={user} />;
      case "slack":
        return <SlackPanel user={user} />;
      case "sheets":
        return <SheetsPanel user={user} />;
      case "googleads":
        return <GoogleAdsPanel user={user} />;
      case "airtable":
        return <AirtablePanel user={user} />;
      case "supabase":
        return <SupabasePanel user={user} onConnectionChange={onSupabaseChange} />;
      case "postgres":
        return <PostgresPanel user={user} onConnectionChange={onPostgresChange} />;
      case "mongodb":
        return <MongoDBPanel user={user} onConnectionChange={onMongodbChange} />;
      case "salesforce":
        return <SalesforcePanel user={user} />;
      case "github":
        return <GitHubPanel user={user} />;
      case "notion":
        return <NotionPanel user={user} />;
      case "coda":
        return <CodaPanel user={user} onConnectionChange={onCodaChange} />;
      case "apify":
        return <ApifyPanel user={user} onConnectionChange={onApifyChange} />;
      case "calendar":
        return <CalendarPanel user={user} />;
      case "stripe":
        return <StripePanel user={user} />;
      case "linkedin":
        return <LinkedInPanel user={user} onConnectionChange={onLinkedinChange} />;
      default:
        return <Text>Select an integration from the sidebar</Text>;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>Connection Manager</Title>

          {user && (
            <Group gap="sm">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setProfileModalOpened(true)}
              >
                {profile?.displayName || user.email}
              </Button>
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email || "User"}
                size="sm"
                radius="xl"
              >
                {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
              </Avatar>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          <Text size="xs" fw={500} c="dimmed" mb="xs" px="sm">
            INTEGRATIONS
          </Text>
          {INTEGRATION_CONFIG.map((item) => (
            <NavLink
              key={item.id}
              active={activeTab === item.id}
              label={item.label}
              leftSection={<item.icon size={20} color={item.color} />}
              rightSection={
                connectionStatus[item.id] ? (
                  <Badge size="xs" color="green" variant="filled">
                    ✓
                  </Badge>
                ) : null
              }
              onClick={() => setActiveTab(item.id)}
              style={{ borderRadius: 8 }}
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={900}>{renderContent()}</Box>
      </AppShell.Main>

      {user && (
        <ProfileModal
          opened={profileModalOpened}
          onClose={() => setProfileModalOpened(false)}
        />
      )}
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

// Mount app
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

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
