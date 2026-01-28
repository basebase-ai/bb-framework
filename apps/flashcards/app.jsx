/**
 * Flashcards - Spaced Repetition Study App
 * 
 * Features:
 *   - Import flashcards from Anki (APKG) or CSV/TSV
 *   - Leitner box spaced repetition system
 *   - Track progress across multiple decks
 * 
 * Routes:
 *   /              - Home (deck list)
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
import {
  IconLogin,
  IconLogout,
  IconUser,
  IconCards,
} from "@tabler/icons-react";
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

function LandingPage() {
  const { promptSignIn } = useAuth();

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Group gap="sm">
          <IconCards size={28} color="#4dabf7" />
          <Text fw={700} size="lg" style={{ color: "#4dabf7", letterSpacing: "-0.02em" }}>
            Flashcards
          </Text>
        </Group>
        <Button
          variant="subtle"
          color="gray"
          onClick={promptSignIn}
          leftSection={<IconLogin size={16} />}
        >
          Sign In
        </Button>
      </Box>

      {/* Hero Section */}
      <Box
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <Box
          style={{
            width: 100,
            height: 100,
            borderRadius: "24px",
            background: "linear-gradient(135deg, #4dabf7 0%, #228be6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "2rem",
            boxShadow: "0 20px 60px rgba(77, 171, 247, 0.3)",
          }}
        >
          <IconCards size={50} color="white" />
        </Box>
        <Title
          order={1}
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "0.5rem",
            letterSpacing: "-0.03em",
          }}
        >
          Flashcards
        </Title>
        <Text
          size="xl"
          c="gray.4"
          maw={550}
          mb="xl"
          style={{ lineHeight: 1.6 }}
        >
          Master anything with spaced repetition. Import your Anki decks or create your own flashcard sets.
        </Text>
        
        <Button
          size="xl"
          variant="filled"
          onClick={promptSignIn}
          leftSection={<IconLogin size={22} />}
          style={{
            boxShadow: "0 10px 40px rgba(77, 171, 247, 0.4)",
            fontWeight: 600,
          }}
        >
          Get Started — Free
        </Button>
        <Text size="xs" c="gray.6" mt="md">
          No credit card required. Sign in with Google.
        </Text>
      </Box>

      {/* Features */}
      <Box
        style={{
          padding: "4rem 2rem",
          background: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <Box maw={900} mx="auto">
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "2rem",
            }}
          >
            <Box ta="center">
              <Text size="2.5rem" mb="md">📥</Text>
              <Title order={4} c="white" mb="xs">Import Anki Decks</Title>
              <Text c="gray.5" size="sm">
                Upload your existing .apkg files or import from CSV/TSV. Keep your progress.
              </Text>
            </Box>
            <Box ta="center">
              <Text size="2.5rem" mb="md">📦</Text>
              <Title order={4} c="white" mb="xs">Leitner System</Title>
              <Text c="gray.5" size="sm">
                Cards move through 5 boxes based on your answers. Focus on what you need to learn.
              </Text>
            </Box>
            <Box ta="center">
              <Text size="2.5rem" mb="md">📊</Text>
              <Title order={4} c="white" mb="xs">Track Progress</Title>
              <Text c="gray.5" size="sm">
                See your mastery level for each deck. Know exactly where you stand.
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        style={{
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <Text size="xs" c="gray.7">
          Built for learners who want to remember everything.
        </Text>
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

  // If not logged in, just render route content (landing page)
  if (!user) {
    return <RouteContent />;
  }

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="md"
      >
        <AppShell.Header
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--mantine-color-gray-2)",
          }}
        >
          <Group h="100%" px="md" justify="space-between" maw={1200} mx="auto">
            <Group
              gap="sm"
              style={{ cursor: "pointer" }}
              onClick={handleNavigateHome}
            >
              <IconCards size={28} color="var(--mantine-color-blue-6)" />
              <Text
                fw={700}
                size="lg"
                c="blue"
                style={{ letterSpacing: "-0.02em" }}
              >
                Flashcards
              </Text>
            </Group>

            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Group gap="xs" style={{ cursor: "pointer" }}>
                  <Avatar
                    src={profile?.photoURL}
                    alt={profile?.displayName || user.email || "User"}
                    size="sm"
                    radius="xl"
                  >
                    {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm" c="dimmed" visibleFrom="sm">
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
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppRouter
        appId={APP_ID}
        routes={routes}
        landing={<LandingPage />}
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
