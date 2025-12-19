/**
 * Builder - An app for building Basebase apps through AI conversation
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Avatar,
  Box,
  Stack,
  Paper,
  Button,
  Divider,
  ActionIcon,
  Tooltip,
  Tabs,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconHammer,
  IconLogin,
  IconLayoutSidebarRight,
  IconEye,
  IconFiles,
} from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";
import { useBuilderStore } from "./stores/builderStore.js";
import { ChatPanel } from "./components/ChatPanel.jsx";
import { PreviewPanel } from "./components/PreviewPanel.jsx";
import { FileTree } from "./components/FileTree.jsx";
import { AppControls } from "./components/AppControls.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { getAppFiles } from "./utils/fileSystem.js";
import { lintAllFiles } from "./utils/linter.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Main builder interface
 */
function BuilderContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  const {
    currentAppId,
    files,
    showPreview,
    togglePreview,
    setCurrentApp,
    setLintErrors,
  } = useBuilderStore();

  // Restore app from localStorage on mount
  useEffect(() => {
    if (currentAppId) {
      const storedFiles = getAppFiles(currentAppId);
      if (storedFiles && Object.keys(storedFiles).length > 0) {
        // Only update if files differ (to avoid infinite loop)
        const currentFilesStr = JSON.stringify(files);
        const storedFilesStr = JSON.stringify(storedFiles);
        if (currentFilesStr !== storedFilesStr) {
          setCurrentApp(currentAppId, storedFiles);
          const errors = lintAllFiles(storedFiles);
          setLintErrors(errors);
        }
      }
    }
  }, [currentAppId]);

  return (
    <AppShell header={{ height: 50 }} padding={0}>
      {/* Header */}
      <AppShell.Header
        style={{
          backgroundColor: "#1a1b1e",
          borderBottom: "1px solid #2c2e33",
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <IconHammer size={24} color="#228be6" />
            <Title order={4} c="white">
              Builder
            </Title>
            {currentAppId && (
              <>
                <Text c="dimmed" size="sm">
                  /
                </Text>
                <Text c="white" size="sm" fw={500}>
                  {currentAppId}
                </Text>
              </>
            )}
          </Group>

          <Group gap="md">
            <AppControls />

            <Divider orientation="vertical" />

            <Tooltip label={showPreview ? "Hide preview" : "Show preview"}>
              <ActionIcon
                variant={showPreview ? "filled" : "subtle"}
                color="gray"
                onClick={togglePreview}
              >
                <IconLayoutSidebarRight size={18} />
              </ActionIcon>
            </Tooltip>

            {user && (
            <Group 
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email || "User"}
                size="sm"
                radius="xl"
              >
                  {(profile?.displayName || user.email || "U")
                    .charAt(0)
                    .toUpperCase()}
              </Avatar>
            </Group>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* Main Content */}
      <AppShell.Main
        style={{
          backgroundColor: "#f8f9fa",
          height: "calc(100vh - 50px)",
        }}
      >
        <Group gap={0} h="100%" align="stretch" wrap="nowrap">
          {/* Left Panel - Chat (1/3 width) */}
          <Box
            style={{
              width: showPreview ? "33.33%" : "40%",
              minWidth: 320,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #e9ecef",
              backgroundColor: "white",
            }}
          >
            <ChatPanel />
          </Box>

          {/* Right Panel - Tabbed Preview/Files (2/3 width) */}
          {showPreview && (
            <Box
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "white",
              }}
            >
              <Tabs defaultValue="preview" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Tabs.List style={{ borderBottom: "1px solid #e9ecef" }}>
                  <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>
                    Preview
                  </Tabs.Tab>
                  <Tabs.Tab value="files" leftSection={<IconFiles size={14} />}>
                    Files
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
                  <PreviewPanel />
                </Tabs.Panel>

                <Tabs.Panel value="files" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <FileTree />
                </Tabs.Panel>
              </Tabs>
            </Box>
          )}

          {/* File Tree only when panel hidden */}
          {!showPreview && (
            <Box
              style={{
                flex: 1,
                height: "100%",
                backgroundColor: "white",
              }}
            >
              <FileTree />
            </Box>
          )}
        </Group>
      </AppShell.Main>

      {/* Profile Modal */}
        <ProfileModal 
          opened={profileModalOpened} 
          onClose={() => setProfileModalOpened(false)} 
        />
    </AppShell>
  );
}

/**
 * Landing page for unauthenticated users
 */
function LandingPage({ onSignIn }) {
  return (
    <Box
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1b1e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack align="center" gap="xl" maw={500} p="xl">
        <Group gap="md">
          <IconHammer size={48} color="#228be6" />
          <Title order={1} c="white">
            Builder
          </Title>
        </Group>

        <Text size="xl" c="dimmed" ta="center">
          Build Basebase apps through conversation with AI. Describe what you
          want, and let the agent write the code.
        </Text>

        <Stack gap="sm" align="center">
          <Text size="sm" c="dimmed">
            Features:
          </Text>
          <Group gap="xs">
            <Paper p="xs" radius="md" bg="dark.6">
              <Text size="xs" c="white">
                🤖 AI-powered coding
              </Text>
            </Paper>
            <Paper p="xs" radius="md" bg="dark.6">
              <Text size="xs" c="white">
                👁️ Live preview
              </Text>
            </Paper>
            <Paper p="xs" radius="md" bg="dark.6">
              <Text size="xs" c="white">
                🔧 Instant linting
              </Text>
            </Paper>
          </Group>
          <Group gap="xs">
            <Paper p="xs" radius="md" bg="dark.6">
              <Text size="xs" c="white">
                📦 One-click deploy
              </Text>
            </Paper>
            <Paper p="xs" radius="md" bg="dark.6">
              <Text size="xs" c="white">
                🔄 Checkout & commit
              </Text>
            </Paper>
          </Group>
        </Stack>

        <Button
          size="lg"
          leftSection={<IconLogin size={20} />}
          onClick={onSignIn}
        >
          Sign In to Get Started
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          Sign in with your Basebase account to start building apps.
        </Text>
      </Stack>
    </Box>
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
        <BuilderContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
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

// Enable hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default App;
