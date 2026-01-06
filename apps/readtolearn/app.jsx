/**
 * ReadToLearn - Language Learning Through Reading
 *
 * Import text or PDF documents in a foreign language and click on
 * words to see translations and hear pronunciations.
 *
 * Routes:
 *   /              - Document list (auth required)
 *   /read/:id      - Reading view for a document
 *   /practice      - Flashcard practice mode
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Avatar,
  Button,
  Menu,
  Box,
  Title,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconLogin,
  IconLogout,
  IconUser,
  IconBook2,
  IconLanguage,
} from "@tabler/icons-react";
import {
  AppRouter,
  RouteContent,
} from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { DocumentList } from "./components/DocumentList.jsx";
import { DocumentReader } from "./components/DocumentReader.jsx";
import { DocumentUpload } from "./components/DocumentUpload.jsx";
import { FlashcardPractice } from "./components/FlashcardPractice.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================================================
// Route Components
// ============================================================================

function HomePage() {
  const { navigate } = useRoute();
  const [uploadOpen, setUploadOpen] = useState(false);

  /** @param {string} docId */
  const handleOpenDocument = (docId) => {
    navigate(`/read/${docId}`);
  };

  /** @param {string} docId */
  const handleDocumentCreated = (docId) => {
    navigate(`/read/${docId}`);
  };

  return (
    <>
      <DocumentList
        onOpenDocument={handleOpenDocument}
        onAddDocument={() => setUploadOpen(true)}
      />
      <DocumentUpload
        opened={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleDocumentCreated}
      />
    </>
  );
}

function ReadPage() {
  const { params, navigate } = useRoute();

  const handleBack = () => {
    navigate("/");
  };

  return <DocumentReader documentId={params.id || ""} onBack={handleBack} />;
}

function PracticePage() {
  const { navigate } = useRoute();

  const handleBack = () => {
    navigate("/");
  };

  return <FlashcardPractice onBack={handleBack} />;
}

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import('../../framework/components/AppRouter.jsx').RouteDefinition[]} */
const routes = [
  { path: "/", component: HomePage, auth: true },
  { path: "/read/:id", component: ReadPage, auth: true },
  { path: "/practice", component: PracticePage, auth: true },
];

// ============================================================================
// Landing Page
// ============================================================================

/** @param {{ onSignIn: () => void }} props */
function LandingPage({ onSignIn }) {
  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <Box ta="center" maw={600}>
        <Box
          style={{
            width: 100,
            height: 100,
            margin: "0 auto 1.5rem",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)",
          }}
        >
          <IconBook2 size={50} color="white" stroke={1.5} />
        </Box>
        <Title
          order={1}
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem",
            letterSpacing: "-0.02em",
          }}
        >
          ReadToLearn
        </Title>
        <Text size="xl" c="gray.4" mb="xl" lh={1.6}>
          Learn vocabulary by reading. Import any text in a foreign language,
          click on words to see translations and hear pronunciations.
        </Text>
        <Group justify="center" gap="md">
          <Button
            size="lg"
            variant="gradient"
            gradient={{ from: "#3b82f6", to: "#06b6d4" }}
            onClick={onSignIn}
            leftSection={<IconLogin size={20} />}
            style={{
              boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)",
            }}
          >
            Get Started
          </Button>
        </Group>
        <Box mt="xl" pt="xl">
          <Group justify="center" gap="xl">
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">
                📖
              </Text>
              <Text size="sm" c="gray.5" mt="xs">
                Import Text/PDF
              </Text>
            </Box>
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">
                🖱️
              </Text>
              <Text size="sm" c="gray.5" mt="xs">
                Click Words
              </Text>
            </Box>
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">
                🔊
              </Text>
              <Text size="sm" c="gray.5" mt="xs">
                Hear Pronunciation
              </Text>
            </Box>
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">
                🧠
              </Text>
              <Text size="sm" c="gray.5" mt="xs">
                Learn Naturally
              </Text>
            </Box>
          </Group>
        </Box>

        {/* Supported languages */}
        <Box mt="xl" pt="lg">
          <Group justify="center" gap="xs">
            <IconLanguage size={16} color="var(--mantine-color-gray-5)" />
            <Text size="sm" c="dimmed">
              Norwegian, Swedish, Danish, German, French, Spanish, Italian,
              Dutch, Portuguese
            </Text>
          </Group>
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================================
// Layout Component
// ============================================================================

function AppLayout() {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { navigate, path } = useRoute();
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  const handleNavigateHome = () => {
    navigate("/");
  };

  // Check if we're in reading mode
  const isReadingMode = path.startsWith("/read/");

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="md"
        style={{ background: "#0f172a" }}
      >
        <AppShell.Header
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <Group h="100%" px="md" justify="space-between" maw={1200} mx="auto">
            <Group
              gap="sm"
              style={{ cursor: "pointer" }}
              onClick={handleNavigateHome}
            >
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconBook2 size={20} color="white" stroke={1.5} />
              </Box>
              <Text
                fw={700}
                size="lg"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                }}
              >
                ReadToLearn
              </Text>
            </Group>

            {user ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Group gap="xs" style={{ cursor: "pointer" }}>
                    <Avatar
                      src={profile?.photoURL}
                      alt={profile?.displayName || user.email || "User"}
                      size="sm"
                      radius="xl"
                      color="blue"
                    >
                      {(profile?.displayName || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Text size="sm" c="gray.5">
                      {profile?.displayName || user.email}
                    </Text>
                  </Group>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconUser size={16} />}
                    onClick={() => setProfileModalOpened(true)}
                  >
                    Profile
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    color="red"
                    onClick={() => {
                      if (confirm("Are you sure you want to sign out?")) {
                        import("firebase/auth").then(({ signOut }) => {
                          import("../../framework/core/firebase-init.js").then(
                            ({ auth }) => {
                              signOut(auth);
                            }
                          );
                        });
                      }
                    }}
                  >
                    Sign Out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Button
                variant="light"
                color="blue"
                leftSection={<IconLogin size={16} />}
                onClick={promptSignIn}
              >
                Sign In
              </Button>
            )}
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Box maw={isReadingMode ? 900 : 1200} mx="auto" w="100%">
            <RouteContent />
          </Box>
        </AppShell.Main>
      </AppShell>

      {user && (
        <ProfileModal
          opened={profileModalOpened}
          onClose={() => setProfileModalOpened(false)}
        />
      )}
    </>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        primaryColor: "blue",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Notifications position="top-right" />
      <AppRouter appId={APP_ID} routes={routes} landingPage={LandingPage}>
        <AppLayout />
      </AppRouter>
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


