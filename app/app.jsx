/**
 * Main app entry point
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Burger, Group, Title, Text, NavLink, Stack } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useAppStore } from "./stores/appStore.js";
import { useAuth } from "../framework/hooks/useAuth.js";
import { TableView } from "./components/TableView.jsx";
import { GridView } from "./components/GridView.jsx";
import { ListView } from "./components/ListView.jsx";
import { CanvasView } from "./components/CanvasView.jsx";
import { ReorderableView } from "./components/ReorderableView.jsx";
import { AuthProvider, SignOutButton } from "./components/AuthProvider.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [currentPage, setCurrentPage] = useState("table");

  const renderPage = () => {
    switch (currentPage) {
      case "table":
        return <TableView />;
      case "grid":
        return <GridView />;
      case "list":
        return <ListView />;
      case "canvas":
        return <CanvasView />;
      case "reorderable":
        return <ReorderableView />;
      default:
        return <TableView />;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !sidebarOpen },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={sidebarOpen} onClick={toggleSidebar} hiddenFrom="sm" size="sm" />
          <Title order={3}>Basebase Framework</Title>
          {user && (
            <Group ml="auto" gap="md">
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
              <SignOutButton size="xs" />
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="sm" fw={500} mb="md">
          Apps Views
        </Text>
        <Stack gap={4}>
          <NavLink
            label="Table"
            active={currentPage === "table"}
            onClick={() => setCurrentPage("table")}
          />
          <NavLink
            label="Grid"
            active={currentPage === "grid"}
            onClick={() => setCurrentPage("grid")}
          />
          <NavLink
            label="List"
            active={currentPage === "list"}
            onClick={() => setCurrentPage("list")}
          />
          <NavLink
            label="Canvas"
            active={currentPage === "canvas"}
            onClick={() => setCurrentPage("canvas")}
          />
          <NavLink
            label="Reorderable"
            active={currentPage === "reorderable"}
            onClick={() => setCurrentPage("reorderable")}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {renderPage()}
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app
const root = createRoot(document.getElementById("app"));
root.render(<App />);

// Enable hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept();
}

export default App;

