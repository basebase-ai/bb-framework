/**
 * Builder - An app for building Basebase apps through AI conversation
 *
 * URL Parameters:
 * - ?edit=app-id  - Checkout and edit an existing app
 * - ?fork=app-id  - Fork an existing app (checkout with new ID)
 * - ?new=true     - Start fresh with landing screen
 * - ?prompt=...   - Pre-fill initial prompt (used with edit/fork)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
  Box,
  Stack,
  Button,
  Divider,
  ActionIcon,
  Tooltip,
  Tabs,
  Modal,
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import {
  IconEye,
  IconFiles,
  IconX,
  IconRefresh,
  IconExternalLink,
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
import { LandingScreen } from "./components/LandingScreen.jsx";
import { AuthButton } from "./components/AuthButton.jsx";
import { getAppFiles, saveAppFiles } from "./utils/fileSystem.js";
import { lintAllFiles } from "./utils/linter.js";
import { generateAppId } from "./utils/appIdGenerator.js";
import { writeDraft } from "./utils/draftSync.js";
import { useLLMAgent } from "./hooks/useLLMAgent.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";
import { CURATED_EXAMPLE_APP_IDS, loadCuratedExamples } from "./utils/appExamples.js";
import { getPreviewUrl } from "./utils/draftSync.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// Basebase logo URL
const LOGO_URL =
  "https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914379318_basebase_orange_32.png?alt=media&token=d2f927fb-a1b4-43ec-a078-69bdc462974e";

// The app ID to use as template for new apps
const STARTER_APP_ID = "starter-app";

/**
 * Parse URL parameters
 * @returns {{ edit: string | null, fork: string | null, isNew: boolean, prompt: string | null }}
 */
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    edit: params.get("edit"),
    fork: params.get("fork"),
    isNew: params.get("new") === "true",
    prompt: params.get("prompt"),
  };
}

/**
 * Clear URL parameters without reload
 */
function clearUrlParams() {
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, "", url.toString());
}

/**
 * Main builder interface (requires authentication)
 * @param {{ initialPrompt?: string | null, onClose?: () => void }} props
 */
function BuilderContent({ initialPrompt, onClose }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [closeModalOpened, setCloseModalOpened] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingPrompt, setPendingPrompt] = useState(
    /** @type {string | null} */ (null)
  );
  const initializedRef = useRef(false);

  const {
    currentAppId,
    files,
    setCurrentApp,
    clearCurrentApp,
    setLintErrors,
    lintErrors,
    refreshPreview,
    setExampleApps,
    setExampleAppsLoading,
    setExampleAppsError,
  } = useBuilderStore();

  const { sendMessage } = useLLMAgent();

  const previewUrl = currentAppId ? getPreviewUrl(currentAppId) : null;
  const criticalErrors = (lintErrors || []).filter((e) => e.severity === "error");
  const hasErrors = criticalErrors.length > 0;

  // Handle URL params and initialization on mount
  useEffect(() => {
    if (initializedRef.current || !user) return;
    initializedRef.current = true;

    const handleInit = async () => {
      const { edit, fork, prompt } = parseUrlParams();

      // ?edit=app-id - Checkout existing app
      if (edit) {
        try {
          await checkoutApp(edit);
          if (prompt) {
            setPendingPrompt(prompt);
          }
        } catch (error) {
          notifications.show({
            title: "Failed to load app",
            message: error.message,
            color: "red",
          });
        }
        clearUrlParams();
        setIsInitializing(false);
        return;
      }

      // ?fork=app-id - Fork existing app with new ID
      if (fork) {
        try {
          const newAppId = generateAppId();
          await forkApp(fork, newAppId);
          if (prompt) {
            setPendingPrompt(prompt);
          }
        } catch (error) {
          notifications.show({
            title: "Failed to fork app",
            message: error.message,
            color: "red",
          });
        }
        clearUrlParams();
        setIsInitializing(false);
        return;
      }

      // Check for initial prompt passed from landing screen
      if (initialPrompt) {
        await handleNewApp(initialPrompt);
        setIsInitializing(false);
        return;
      }

      // No URL params - restore from localStorage if exists
      if (currentAppId) {
        const storedFiles = getAppFiles(currentAppId);
        if (storedFiles && Object.keys(storedFiles).length > 0) {
          setCurrentApp(currentAppId, storedFiles);
          const errors = lintAllFiles(storedFiles);
          setLintErrors(errors);
        }
      }

      setIsInitializing(false);
    };

    handleInit();
  }, [user, initialPrompt]);

  // Load curated example apps once per session (for agent search/tools)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        setExampleAppsLoading(true);
        setExampleAppsError(null);
        const examples = await loadCuratedExamples(db, CURATED_EXAMPLE_APP_IDS);
        if (!cancelled) {
          setExampleApps(examples);
        }
      } catch (e) {
        if (!cancelled) {
          setExampleAppsError(e instanceof Error ? e.message : "Failed to load examples");
        }
      } finally {
        if (!cancelled) {
          setExampleAppsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, setExampleApps, setExampleAppsLoading, setExampleAppsError]);

  // Send pending prompt after initialization
  useEffect(() => {
    if (pendingPrompt && currentAppId && !isInitializing) {
      sendMessage(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, currentAppId, isInitializing, sendMessage]);

  /**
   * Checkout an existing app from Firestore
   * @param {string} appId
   */
  const checkoutApp = async (appId) => {
    // Fetch from Firestore
    const appRef = doc(db, "apps", appId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      throw new Error(`App "${appId}" not found`);
    }

    const appData = appSnap.data();
    const versionHash = appData.currentVersion;

    if (!versionHash) {
      throw new Error(`App "${appId}" has no published version`);
    }

    // Fetch version
    const versionRef = doc(db, "apps", appId, "versions", versionHash);
    const versionSnap = await getDoc(versionRef);

    if (!versionSnap.exists()) {
      throw new Error(`Version "${versionHash}" not found`);
    }

    const versionData = versionSnap.data();
    const sourceFiles = versionData.source || {};

    // Save to localStorage
    saveAppFiles(appId, sourceFiles);

    // Sync draft to Firestore BEFORE setting currentAppId
    if (user) {
      await writeDraft(appId, sourceFiles, user.uid, user.email);
    }

    // Now set current app - this triggers preview iframe to load
    setCurrentApp(appId, sourceFiles);
    setLintErrors(lintAllFiles(sourceFiles));

    notifications.show({
      title: "App loaded",
      message: `Checked out "${appId}"`,
      color: "green",
    });
  };

  /**
   * Fork an existing app with a new ID
   * @param {string} sourceAppId
   * @param {string} newAppId
   */
  const forkApp = async (sourceAppId, newAppId) => {
    console.log(`📦 Forking "${sourceAppId}" to "${newAppId}"...`);
    
    // Fetch source app
    const appRef = doc(db, "apps", sourceAppId);
    const appSnap = await getDoc(appRef);

    if (!appSnap.exists()) {
      throw new Error(`App "${sourceAppId}" not found`);
    }

    const appData = appSnap.data();
    const versionHash = appData.currentVersion;
    console.log(`📦 Source app currentVersion: ${versionHash}`);

    if (!versionHash) {
      throw new Error(`App "${sourceAppId}" has no published version`);
    }

    // Fetch version
    const versionRef = doc(db, "apps", sourceAppId, "versions", versionHash);
    const versionSnap = await getDoc(versionRef);

    if (!versionSnap.exists()) {
      throw new Error(`Version "${versionHash}" not found`);
    }

    const versionData = versionSnap.data();
    /** @type {Record<string, string>} */
    const sourceFiles = versionData.source || {};
    console.log(`📦 Source files from Firestore:`, Object.keys(sourceFiles));

    // Update APP_ID in schema.js, skip internal files
    /** @type {Record<string, string>} */
    const newFiles = {};
    for (const [fileName, content] of Object.entries(sourceFiles)) {
      // Skip internal/metadata files
      if (fileName.startsWith(".")) {
        continue;
      }
      if (fileName === "schema.js") {
        newFiles[fileName] = content.replace(
          /export const APP_ID = ['"][^'"]+['"]/,
          `export const APP_ID = "${newAppId}"`
        );
      } else {
        newFiles[fileName] = content;
      }
    }
    console.log(`📦 New app files:`, Object.keys(newFiles));

    // Save to localStorage
    saveAppFiles(newAppId, newFiles);

    // Sync draft to Firestore BEFORE setting currentAppId
    if (user) {
      await writeDraft(newAppId, newFiles, user.uid, user.email);
    }

    // Now set current app - this triggers preview iframe to load
    setCurrentApp(newAppId, newFiles);
    setLintErrors(lintAllFiles(newFiles));

    notifications.show({
      title: "App forked",
      message: `Created "${newAppId}" from "${sourceAppId}"`,
      color: "green",
    });
  };

  /**
   * Initialize a new app by forking starter-app
   * @param {string} prompt
   */
  const handleNewApp = async (prompt) => {
    const appId = generateAppId();
    
    // Fork starter-app to create the new app
    await forkApp(STARTER_APP_ID, appId);

    // Set pending prompt to be sent after render
    setPendingPrompt(prompt);
  };

  /**
   * Handle close button - show warning and clear state
   */
  const handleClose = () => {
    clearCurrentApp();
    setCloseModalOpened(false);
    // Go back to landing screen
    if (onClose) {
      onClose();
    }
  };

  // Show loading while initializing
  if (isInitializing || !currentAppId) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack align="center" gap="md">
          <img src={LOGO_URL} alt="Basebase" width={48} height={48} />
          <Text c="dimmed">Setting up your app...</Text>
        </Stack>
      </Box>
    );
  }

  // Main editing UI
  return (
    <AppShell header={{ height: 50 }} padding={0}>
      {/* Header */}
      <AppShell.Header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e9ecef",
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <img src={LOGO_URL} alt="Basebase" width={24} height={24} />
            <Title order={4} c="dark">
              Basebase
            </Title>
            {currentAppId && (
              <>
                <Text c="dimmed" size="sm">
                  /
                </Text>
                <Text c="dark" size="sm" fw={500}>
                  {currentAppId}
              </Text>
              </>
            )}
          </Group>

          <Group gap="md">
            <AppControls />

            <Divider orientation="vertical" />

            <Tooltip label="Close project">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setCloseModalOpened(true)}
              >
                <IconX size={18} />
              </ActionIcon>
            </Tooltip>

            <AuthButton
              user={user}
              profile={profile}
              onProfileClick={() => setProfileModalOpened(true)}
            />
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
              width: "33.33%",
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
          <Box
            style={{
              flex: 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "white",
            }}
          >
            <Tabs
              defaultValue="preview"
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
              <Tabs.List style={{ borderBottom: "1px solid #e9ecef" }}>
                <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>
                  Preview
                </Tabs.Tab>
                <Tabs.Tab value="files" leftSection={<IconFiles size={14} />}>
                  Files
                </Tabs.Tab>
                <Group gap="xs" style={{ marginLeft: "auto" }}>
                  <Tooltip label="Refresh preview">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={refreshPreview}
                      disabled={hasErrors}
                    >
                      <IconRefresh size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Open in new tab">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        if (previewUrl) window.open(previewUrl, "_blank");
                      }}
                      disabled={!previewUrl || hasErrors}
                >
                      <IconExternalLink size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Tabs.List>

              <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
                <PreviewPanel />
              </Tabs.Panel>

              <Tabs.Panel
                value="files"
                style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FileTree />
              </Tabs.Panel>
            </Tabs>
          </Box>
        </Group>
      </AppShell.Main>

      {/* Profile Modal */}
        <ProfileModal 
          opened={profileModalOpened} 
          onClose={() => setProfileModalOpened(false)} 
        />

      {/* Close Confirmation Modal */}
      <Modal
        opened={closeModalOpened}
        onClose={() => setCloseModalOpened(false)}
        title="Close Project"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to close this project? Any uncommitted changes
            may be lost.
          </Text>
          <Text size="sm" c="dimmed">
            Make sure to commit your work before closing if you want to keep it.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setCloseModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleClose}>
              Close Project
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}

/**
 * Check if URL params indicate we should go directly to editor
 */
function shouldStartInEditorMode() {
  const { edit, fork } = parseUrlParams();
  return !!(edit || fork);
}

function App() {
  // "landing" = show landing page (no auth required)
  // "editor" = show editor (auth required)
  const [mode, setMode] = useState(
    shouldStartInEditorMode() ? "editor" : "landing"
  );
  const [pendingPrompt, setPendingPrompt] = useState(
    /** @type {string | null} */ (null)
  );

  // Handle "Build It" from landing screen
  const handleStartBuilding = (prompt) => {
    setPendingPrompt(prompt);
    setMode("editor");
  };

  // Handle closing the editor (go back to landing)
  const handleCloseEditor = () => {
    setPendingPrompt(null);
    setMode("landing");
    // Clear URL params
    window.history.replaceState({}, "", window.location.pathname);
  };

  // Landing mode - no auth required
  if (mode === "landing") {
    return (
      <MantineProvider defaultColorScheme="light">
        <Notifications position="top-right" />
        <LandingScreen onSubmit={handleStartBuilding} />
      </MantineProvider>
    );
  }

  // Editor mode - auth required
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider appId={APP_ID}>
        <BuilderContent 
          initialPrompt={pendingPrompt} 
          onClose={handleCloseEditor}
        />
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
