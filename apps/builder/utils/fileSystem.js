/**
 * File System Utilities
 * localStorage-based file system for the builder app
 */

const STORAGE_KEY = "builder_apps";

/**
 * Get all apps from localStorage
 * @returns {Record<string, Record<string, string>>} appId -> files map
 */
export function getAllApps() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error("Failed to read apps from localStorage:", err);
    return {};
  }
}

/**
 * Save all apps to localStorage
 * @param {Record<string, Record<string, string>>} apps
 */
export function saveAllApps(apps) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (err) {
    console.error("Failed to save apps to localStorage:", err);
    throw new Error("Failed to save: localStorage may be full");
  }
}

/**
 * Get files for a specific app
 * @param {string} appId
 * @returns {Record<string, string> | null}
 */
export function getAppFiles(appId) {
  const apps = getAllApps();
  return apps[appId] || null;
}

/**
 * Save files for a specific app
 * @param {string} appId
 * @param {Record<string, string>} files
 */
export function saveAppFiles(appId, files) {
  const apps = getAllApps();
  apps[appId] = files;
  saveAllApps(apps);
}

/**
 * Delete an app from localStorage
 * @param {string} appId
 */
export function deleteApp(appId) {
  const apps = getAllApps();
  delete apps[appId];
  saveAllApps(apps);
}

/**
 * List all app IDs in localStorage
 * @returns {string[]}
 */
export function listApps() {
  return Object.keys(getAllApps());
}

/**
 * Format files with line numbers for agent display
 * @param {Record<string, string>} files
 * @returns {string}
 */
export function formatFilesWithLineNumbers(files) {
  const parts = [];

  // Sort files: schema.js first, then app.jsx, then alphabetically
  const sortedFiles = Object.keys(files).sort((a, b) => {
    if (a === "schema.js") return -1;
    if (b === "schema.js") return 1;
    if (a === "app.jsx") return -1;
    if (b === "app.jsx") return 1;
    return a.localeCompare(b);
  });

  for (const fileName of sortedFiles) {
    const content = files[fileName];
    const lines = content.split("\n");
    const numberedLines = lines
      .map((line, i) => `${String(i + 1).padStart(4, " ")} | ${line}`)
      .join("\n");

    parts.push(`=== ${fileName} (${lines.length} lines) ===\n${numberedLines}`);
  }

  return parts.join("\n\n");
}

/**
 * Get starter app template
 * @param {string} appId
 * @returns {Record<string, string>}
 */
export function getStarterAppTemplate(appId) {
  const schemaContent = `/**
 * Define your Firestore collections and their structure
 */

export const APP_ID = "${appId}";

/**
 * Namespaced collection names
 */
export const collections = {
  // Global collections (no namespace needed)
  apps: "apps",
  users: "users",

  // Your app-specific collections (automatically namespaced)
  // items: \`\${APP_ID}_items\`,
};

/**
 * Helper function to create a namespaced collection name
 * @param {string} name
 * @returns {string}
 */
export function getCollection(name) {
  return \`\${APP_ID}_\${name}\`;
}
`;

  const appContent = `/**
 * ${appId} - A Basebase App
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Button,
  Stack,
  Container,
  Box,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconPlus, IconLogin } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function MainContent({ onSignIn }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [counter, setCounter] = useState(0);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header style={{ backgroundColor: "#fff", borderBottom: "1px solid #e9ecef" }}>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3} c="dark">${appId}</Title>
          {user ? (
            <Group 
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Text size="sm" c="dimmed">
                {profile?.displayName || user.email}
              </Text>
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email || "User"}
                size="sm"
                radius="xl"
              >
                {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
              </Avatar>
            </Group>
          ) : (
            <Button
              variant="light"
              leftSection={<IconLogin size={16} />}
              onClick={onSignIn}
            >
              Sign In
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ backgroundColor: "#f8f9fa" }}>
        <Container size="sm">
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "calc(100vh - 120px)",
              textAlign: "center",
            }}
          >
            <Stack align="center" gap="xl">
              <div>
                <Title order={1} size="3rem" c="dark" mb="md">
                  Welcome to ${appId}
                </Title>
                <Text size="xl" c="dimmed" maw={500}>
                  This is a starter template. Customize this page to build something amazing!
                </Text>
              </div>

              <Stack align="center" gap="md" mt="xl">
                <Text size="6rem" fw={700} c="blue" lh={1}>
                  {counter}
                </Text>
                <Button
                  size="lg"
                  leftSection={<IconPlus size={20} />}
                  onClick={() => setCounter((c) => c + 1)}
                >
                  Click me!
                </Button>
                <Text size="sm" c="dimmed">
                  A simple counter to get you started
                </Text>
              </Stack>
            </Stack>
          </Box>
        </Container>
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

function LandingPage({ onSignIn }) {
  return <MainContent onSignIn={onSignIn} />;
}

function AppContent() {
  return <MainContent />;
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

const container = document.getElementById("app");
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
`;

  const profileModalContent = `/**
 * ProfileModal - User profile management modal
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Avatar,
  Group,
  Text,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUser, IconLogout } from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { signOut } from "firebase/auth";
import { auth } from "../../../framework/core/firebase-init.js";

export function ProfileModal({ opened, onClose }) {
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile(user?.uid);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!displayName.trim()) return;

    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      notifications.show({
        title: "Profile updated",
        message: "Your display name has been updated.",
        color: "green",
      });
      onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update profile.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!user) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Profile" centered>
      <Stack gap="md">
        <Group>
          <Avatar
            src={profile?.photoURL}
            size="lg"
            radius="xl"
          >
            {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text fw={500}>{profile?.displayName || "No name set"}</Text>
            <Text size="sm" c="dimmed">{user.email}</Text>
          </div>
        </Group>

        <Divider />

        <TextInput
          label="Display Name"
          placeholder="Enter your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          leftSection={<IconUser size={16} />}
        />

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
`;

  return {
    "schema.js": schemaContent,
    "app.jsx": appContent,
    "components/ProfileModal.jsx": profileModalContent,
  };
}
