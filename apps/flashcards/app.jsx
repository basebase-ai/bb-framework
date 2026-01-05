/**
 * Flashcards - Spaced Repetition Learning App
 * 
 * Routes:
 *   /              - Deck list (auth required)
 *   /deck/:id      - View cards in a deck
 *   /study/:id     - Study mode for a deck
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
import { IconLogin, IconLogout, IconUser, IconCards } from "@tabler/icons-react";
import { AppRouter, RouteContent } from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { DeckList } from "./components/DeckList.jsx";
import { CardList } from "./components/CardList.jsx";
import { StudyMode } from "./components/StudyMode.jsx";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================================================
// Route Components
// ============================================================================

function HomePage() {
  const { navigate } = useRoute();

  /** @param {string} deckId */
  const handleViewDeck = (deckId) => {
    navigate(`/deck/${deckId}`);
  };

  /** @param {string} deckId */
  const handleStudyDeck = (deckId) => {
    navigate(`/study/${deckId}`);
  };

  return (
    <DeckList
      onViewDeck={handleViewDeck}
      onStudyDeck={handleStudyDeck}
    />
  );
}

function DeckViewPage() {
  const { params, navigate } = useRoute();

  const handleBack = () => {
    navigate("/");
  };

  /** @param {string} deckId */
  const handleStudy = (deckId) => {
    navigate(`/study/${deckId}`);
  };

  return (
    <CardList
      deckId={params.id || ""}
      onBack={handleBack}
      onStudy={handleStudy}
    />
  );
}

function StudyPage() {
  const { params, navigate } = useRoute();

  const handleBack = () => {
    navigate(`/deck/${params.id}`);
  };

  const handleComplete = () => {
    navigate(`/deck/${params.id}`);
  };

  return (
    <StudyMode
      deckId={params.id || ""}
      onBack={handleBack}
      onComplete={handleComplete}
    />
  );
}

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import('../../framework/components/AppRouter.jsx').RouteDefinition[]} */
const routes = [
  { path: "/", component: HomePage, auth: true },
  { path: "/deck/:id", component: DeckViewPage, auth: true },
  { path: "/study/:id", component: StudyPage, auth: true },
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
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <Box ta="center" maw={600}>
        <IconCards size={80} color="#e94560" style={{ marginBottom: "1.5rem" }} />
        <Title
          order={1}
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem",
          }}
        >
          Flashcards
        </Title>
        <Text size="xl" c="gray.4" mb="xl">
          Master anything with the scientifically proven Leitner spaced repetition system.
          Create decks, import from Anki, and track your progress.
        </Text>
        <Group justify="center" gap="md">
          <Button
            size="lg"
            variant="gradient"
            gradient={{ from: "#e94560", to: "#ff6b6b" }}
            onClick={onSignIn}
            leftSection={<IconLogin size={20} />}
          >
            Get Started
          </Button>
        </Group>
        <Box mt="xl" pt="xl">
          <Group justify="center" gap="xl">
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">📚</Text>
              <Text size="sm" c="gray.5" mt="xs">Create Decks</Text>
            </Box>
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">📥</Text>
              <Text size="sm" c="gray.5" mt="xs">Import Anki</Text>
            </Box>
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">🧠</Text>
              <Text size="sm" c="gray.5" mt="xs">Leitner System</Text>
            </Box>
            <Box ta="center">
              <Text size="2rem" fw={700} c="white">📊</Text>
              <Text size="sm" c="gray.5" mt="xs">Track Progress</Text>
            </Box>
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

  // Hide header in study mode for full-screen experience
  const isStudyMode = path.startsWith("/study/");

  if (isStudyMode) {
    return <RouteContent />;
  }

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="md"
        style={{ background: "#0f0f1a" }}
      >
        <AppShell.Header
          style={{
            background: "rgba(15, 15, 26, 0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(233, 69, 96, 0.2)",
          }}
        >
          <Group h="100%" px="md" justify="space-between" maw={1200} mx="auto">
            <Group
              gap="sm"
              style={{ cursor: "pointer" }}
              onClick={handleNavigateHome}
            >
              <IconCards size={28} color="#e94560" />
              <Text
                fw={700}
                size="lg"
                style={{ color: "#e94560", letterSpacing: "-0.02em" }}
              >
                Flashcards
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
                      color="pink"
                    >
                      {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
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
                          import("../../framework/core/firebase-init.js").then(({ auth }) => {
                            signOut(auth);
                          });
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
                color="pink"
                leftSection={<IconLogin size={16} />}
                onClick={promptSignIn}
              >
                Sign In
              </Button>
            )}
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Box maw={1200} mx="auto" w="100%">
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
        primaryColor: "pink",
      }}
    >
      <Notifications position="top-right" />
      <AppRouter
        appId={APP_ID}
        routes={routes}
        landingPage={LandingPage}
      >
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

