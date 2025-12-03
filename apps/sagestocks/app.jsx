/**
 * SageStocks - Stock Analysis Dashboard
 */

import React, { useState, useEffect } from "react";
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
  Loader,
  Center,
  Tabs,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconSun, IconMoon, IconChartLine, IconWallet } from "@tabler/icons-react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { TableView } from "./components/TableView.jsx";
import { Portfolio } from "./components/Portfolio.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { APP_ID, collections, DEFAULT_STOCK_FIELDS } from "./schema.js";
import { db } from "../../framework/core/firebase-init.js";

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

function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [pageId, setPageId] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(/** @type {string | null} */ ("portfolio"));

  // Auto-create or find default page configuration
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initializePage = async () => {
      try {
        // Check if default page exists
        const pagesRef = collection(db, collections.pages);
        const q = query(
          pagesRef,
          where("collectionName", "==", "stock-analyses")
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // Use existing page
          setPageId(snapshot.docs[0].id);
        } else {
          // Create default page
          const newPage = {
            name: "Stock Analyses",
            description: "Track and analyze stocks with SageStocks API",
            collectionName: "stock-analyses",
            fields: DEFAULT_STOCK_FIELDS,
            sortBy: "ticker",
            sortDirection: "asc",
            createdBy: user.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const docRef = await addDoc(collection(db, collections.pages), newPage);
          setPageId(docRef.id);
        }
      } catch (error) {
        console.error("Error initializing page:", error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [user]);

  if (loading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <AppShell header={{ height: 110 }} padding="md">
      <AppShell.Header>
        <Group h={60} px="md" justify="space-between">
          <Title order={3}>SageStocks</Title>

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

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
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
      </AppShell.Header>

      <AppShell.Main>
        {activeTab === "portfolio" && <Portfolio />}
        {activeTab === "analyses" && pageId && <TableView pageId={pageId} />}
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
      <AuthProvider appId={APP_ID}>
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
