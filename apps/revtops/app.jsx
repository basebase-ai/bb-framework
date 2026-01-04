/**
 * RevTops App Entry Point
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

// Components
import PublicHomepage from "./components/PublicHomepage.jsx";
import IntegrationsPage from "./components/IntegrationsPage.jsx";
// Reuse existing placeholder app studio content for now, or just a simple placeholder
import { AppShell, Title, Text, Button, Box } from "@mantine/core";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Check if current path is a public page
 * @param {string} path
 * @returns {string | null}
 */
function getPublicPage(path) {
  if (path === "/integrations") return "integrations";
  if (path === "/pricing") return "pricing";
  // Add other pages as needed
  return null;
}

function AppStudio() {
  return (
    <Box p="xl" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8f9fa" }}>
      <Box ta="center">
        <Title order={1} style={{ fontSize: 60 }}>🚀</Title>
        <Title order={2} mt="md">RevTops Console</Title>
        <Text c="dimmed" mt="sm">Welcome to your high-agency command center.</Text>
      </Box>
    </Box>
  );
}

function App() {
  console.log("🚀 RevTops App rendering...");

  // Track current path for public page routing
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen for navigation changes
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Navigation helpers
  const navigateToHome = () => {
    setCurrentPath("/");
    window.history.pushState({}, "", "/");
  };

  const navigateToIntegrations = () => {
    setCurrentPath("/integrations");
    window.history.pushState({}, "", "/integrations");
  };

  const navigateToPricing = () => {
    // Placeholder for now
    alert("Pricing page coming soon!");
  };

  const publicPage = getPublicPage(currentPath);

  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "indigo",
        fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
        colors: {
          indigo: [
            "#edf2ff", "#dbe4ff", "#bac8ff", "#91a7ff", "#748ffc",
            "#5c7cfa", "#4c6ef5", "#4263eb", "#3b5bdb", "#364fc7"
          ],
        }
      }}
    >
      <Notifications position="top-right" />

      {/* Public Pages */}
      {publicPage === "integrations" && (
        <AuthProvider
          appId={APP_ID}
          landingPage={(authProps) => (
            <IntegrationsPage onBack={navigateToHome} onSignIn={authProps.onSignIn} />
          )}
        >
          {/* If authenticated, still show integrations page but logged in */}
          <IntegrationsPage onBack={navigateToHome} />
        </AuthProvider>
      )}

      {/* Main Layout */}
      {!publicPage && (
        <AuthProvider
          appId={APP_ID}
          landingPage={(props) => (
            <PublicHomepage
              {...props}
              onNavigateToIntegrations={navigateToIntegrations}
              onNavigateToPricing={navigateToPricing}
            />
          )}
        >
          <AppStudio />
        </AuthProvider>
      )}
    </MantineProvider>
  );
}

// Mount app
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
