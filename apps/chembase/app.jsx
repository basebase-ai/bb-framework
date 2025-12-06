/**
 * ChemBase - Main Entry
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, AppShell, Group, Title, Text, Tabs } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { AtomBuilder } from "./components/AtomBuilder.jsx";
import { PeriodicTable } from "./components/PeriodicTable.jsx";
import { BondingLab } from "./components/BondingLab.jsx";
import { APP_ID } from "./schema.js";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function AppContent() {
  const [activeTab, setActiveTab] = useState("builder");
  const [targetElement, setTargetElement] = useState(null);

  const handleSelectElement = (atomicNumber) => {
    setTargetElement(atomicNumber);
    setActiveTab("builder");
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md">
          <Title order={3}>ChemBase</Title>
          <Text size="sm" c="dimmed">Atomic Builder</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="builder">Atom Builder</Tabs.Tab>
            <Tabs.Tab value="table">Periodic Table</Tabs.Tab>
            <Tabs.Tab value="bonding">Bonding Lab</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="builder">
            <AtomBuilder 
              targetAtomicNumber={targetElement} 
              onSetTarget={setTargetElement}
            />
          </Tabs.Panel>

          <Tabs.Panel value="table">
            <PeriodicTable onSelectElement={handleSelectElement} />
          </Tabs.Panel>

          <Tabs.Panel value="bonding">
            <BondingLab />
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

const container = document.getElementById("app");
let root;

function render() {
  if (!root) root = createRoot(container);
  root.render(<App />);
}

render();

if (import.meta.hot) {
  import.meta.hot.accept(() => render());
}

export default App;

