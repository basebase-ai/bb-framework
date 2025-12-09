/**
 * SageStocks - Stock Analysis Dashboard
 */

import React, { useState, useMemo } from "react";
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
  Tabs,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconSun, IconMoon, IconChartLine, IconWallet } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useRouter } from "../../framework/hooks/useRouter.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { AnalysesTable } from "./components/AnalysesTable.jsx";
import { Portfolio } from "./components/Portfolio.jsx";
import { AnalysisDetails } from "./components/AnalysisDetails.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { LandingPage } from "./components/LandingPage.jsx";
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

/**
 * Parse the current route from the path
 * @param {string} path
 * @returns {{ view: 'portfolio' | 'analyses' | 'analysis-details'; ticker?: string }}
 */
function parseRoute(path) {
  // Remove leading slash and any query params
  const cleanPath = path.replace(/^\//, "").split("?")[0];

  if (cleanPath === "" || cleanPath === "portfolio") {
    return { view: "portfolio" };
  }

  if (cleanPath === "analyses") {
    return { view: "analyses" };
  }

  // Check for /analyses/{ticker}
  const analysisMatch = cleanPath.match(/^analyses\/([A-Za-z0-9.-]+)$/);
  if (analysisMatch) {
    return { view: "analysis-details", ticker: analysisMatch[1].toUpperCase() };
  }

  // Default to portfolio
  return { view: "portfolio" };
}

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRouter();
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Parse route from URL path
  const route = useMemo(() => parseRoute(path), [path]);

  // Get the active tab from the route
  const activeTab = route.view === "analysis-details" ? "analyses" : route.view;

  // Handle tab change
  const handleTabChange = (/** @type {string | null} */ value) => {
    if (value === "portfolio") {
      navigate("/portfolio");
    } else if (value === "analyses") {
      navigate("/analyses");
    }
  };

  // Navigate to analysis details
  const handleViewAnalysis = (/** @type {string} */ ticker) => {
    navigate(`/analyses/${ticker}`);
  };

  // Navigate back from analysis details
  const handleBackFromDetails = () => {
    navigate("/analyses");
  };

  // Hide tabs when viewing analysis details
  const showTabs = route.view !== "analysis-details";
  const headerHeight = showTabs ? 110 : 60;

  return (
    <AppShell header={{ height: headerHeight }} padding="md">
      <AppShell.Header>
        <Group h={60} px="md" justify="space-between">
          <Title order={3} style={{ cursor: "pointer" }} onClick={() => navigate("/portfolio")}>
            SageStocks
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

        {/* Navigation Tabs - hidden on detail pages */}
        {showTabs && (
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            px="md"
            styles={{
              root: { borderBottom: "1px solid var(--mantine-color-gray-3)" },
              list: { borderBottom: "none" },
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="portfolio" leftSection={<IconWallet size={16} />}>
                My Portfolio
              </Tabs.Tab>
              <Tabs.Tab value="analyses" leftSection={<IconChartLine size={16} />}>
                Stock Analyses
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        )}
      </AppShell.Header>

      <AppShell.Main>
        {route.view === "portfolio" && <Portfolio />}
        {route.view === "analyses" && (
          <AnalysesTable onViewAnalysis={handleViewAnalysis} />
        )}
        {route.view === "analysis-details" && route.ticker && (
          <AnalysisDetails ticker={route.ticker} onBack={handleBackFromDetails} />
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
      <AuthProvider
        appId={APP_ID}
        landingPage={(props) => <LandingPage {...props} />}
      >
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
