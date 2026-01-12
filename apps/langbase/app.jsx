/**
 * LangBase - Free Language Learning Toolkit
 * 
 * Features:
 *   - Flashcard Study: Spaced repetition with Leitner system, Anki import
 *   - Sentence Practice: AI-generated comprehension exercises
 *   - Assisted Reading: Import texts/PDFs with click-to-translate
 *   - Conversation Practice: Chat with AI in target language with translation help
 * 
 * Routes:
 *   /              - Home (shows active tab content)
 *   /deck/:id      - View cards in a deck
 *   /study/:id     - Study mode for a deck
 *   /practice/:id  - Sentence practice mode
 *   /read/:id      - Reading view for a document
 *   /chat/:id      - Conversation practice chat
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
  Tabs,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconLogin, IconLogout, IconUser, IconCards, IconBook2, IconMessageCircle } from "@tabler/icons-react";
import { AppRouter, RouteContent } from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { DeckList } from "./components/DeckList.jsx";
import { CardList } from "./components/CardList.jsx";
import { StudyMode } from "./components/StudyMode.jsx";
import { SentencePractice } from "./components/SentencePractice.jsx";
import { DocumentList } from "./components/reading/DocumentList.jsx";
import { DocumentReader } from "./components/reading/DocumentReader.jsx";
import { DocumentUpload } from "./components/reading/DocumentUpload.jsx";
import { ScenarioList } from "./components/conversation/ScenarioList.jsx";
import { ConversationChat } from "./components/conversation/ConversationChat.jsx";
import { useUIStore } from "./stores/uiStore.js";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// ============================================================================
// Route Components
// ============================================================================

function HomePage() {
  const { navigate } = useRoute();
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const [uploadOpen, setUploadOpen] = useState(false);

  /** @param {string} deckId */
  const handleViewDeck = (deckId) => {
    navigate(`/deck/${deckId}`);
  };

  /** @param {string} deckId */
  const handleStudyDeck = (deckId) => {
    navigate(`/study/${deckId}`);
  };

  /** @param {string} docId */
  const handleOpenDocument = (docId) => {
    navigate(`/read/${docId}`);
  };

  /** @param {string} docId */
  const handleDocumentCreated = (docId) => {
    navigate(`/read/${docId}`);
  };

  /** @param {string} convoId */
  const handleOpenConversation = (convoId) => {
    navigate(`/chat/${convoId}`);
  };

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(val) => val && setActiveTab(/** @type {'vocabulary' | 'reading' | 'conversation'} */ (val))}
        mb="lg"
      >
        <Tabs.List>
          <Tabs.Tab value="vocabulary" leftSection={<IconCards size={16} />}>
            Vocabulary
          </Tabs.Tab>
          <Tabs.Tab value="reading" leftSection={<IconBook2 size={16} />}>
            Reading
          </Tabs.Tab>
          <Tabs.Tab value="conversation" leftSection={<IconMessageCircle size={16} />}>
            Conversation
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === "vocabulary" && (
        <DeckList
          onViewDeck={handleViewDeck}
          onStudyDeck={handleStudyDeck}
        />
      )}
      
      {activeTab === "reading" && (
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
      )}
      
      {activeTab === "conversation" && (
        <ScenarioList onOpenConversation={handleOpenConversation} />
      )}
    </Box>
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

  /** @param {string} deckId */
  const handlePractice = (deckId) => {
    navigate(`/practice/${deckId}`);
  };

  return (
    <CardList
      deckId={params.id || ""}
      onBack={handleBack}
      onStudy={handleStudy}
      onPractice={handlePractice}
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

function PracticePage() {
  const { params, navigate } = useRoute();

  const handleBack = () => {
    navigate(`/deck/${params.id}`);
  };

  return (
    <SentencePractice
      deckId={params.id || ""}
      onBack={handleBack}
    />
  );
}

function ReadPage() {
  const { params, navigate } = useRoute();

  const handleBack = () => {
    navigate("/");
  };

  return <DocumentReader documentId={params.id || ""} onBack={handleBack} />;
}

function ConversationChatPage() {
  const { params, navigate } = useRoute();
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const handleBack = () => {
    setActiveTab("conversation");
    navigate("/");
  };

  return <ConversationChat conversationId={params.id || ""} onBack={handleBack} />;
}

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import('../../framework/components/AppRouter.jsx').RouteDefinition[]} */
const routes = [
  { path: "/", component: HomePage, auth: true },
  { path: "/deck/:id", component: DeckViewPage, auth: true },
  { path: "/study/:id", component: StudyPage, auth: true },
  { path: "/practice/:id", component: PracticePage, auth: true },
  { path: "/read/:id", component: ReadPage, auth: true },
  { path: "/chat/:id", component: ConversationChatPage, auth: true },
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
        background: "linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #1a1a2e 100%)",
      }}
    >
      {/* Hero Section */}
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 2rem",
          minHeight: "70vh",
          textAlign: "center",
        }}
      >
        <Box
          style={{
            width: 100,
            height: 100,
            borderRadius: "24px",
            background: "linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "2rem",
            boxShadow: "0 20px 60px rgba(233, 69, 96, 0.3)",
          }}
        >
          <IconCards size={50} color="white" />
        </Box>
        <Title
          order={1}
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            fontWeight: 800,
            background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem",
            letterSpacing: "-0.03em",
          }}
        >
          LangBase
        </Title>
        <Text
          size="xl"
          c="gray.5"
          maw={500}
          mb="sm"
          style={{ lineHeight: 1.6 }}
        >
          A free, open-source language learning toolkit
        </Text>
        <Text
          size="md"
          c="gray.6"
          maw={600}
          mb="xl"
          style={{ lineHeight: 1.7 }}
        >
          Master vocabulary with spaced repetition flashcards, practice reading comprehension 
          with instant translations, and build fluency through AI-generated sentence practice.
        </Text>
        <Button
          size="xl"
          variant="gradient"
          gradient={{ from: "#e94560", to: "#ff6b6b" }}
          onClick={promptSignIn}
          leftSection={<IconLogin size={22} />}
          style={{
            boxShadow: "0 10px 40px rgba(233, 69, 96, 0.4)",
            fontWeight: 600,
          }}
        >
          Start Learning — Free
        </Button>
        <Text size="xs" c="gray.7" mt="md">
          No credit card required. Sign in with Google.
        </Text>
      </Box>

      {/* Features Section */}
      <Box
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "4rem 2rem",
        }}
      >
        <Box maw={1000} mx="auto">
          <Title order={2} ta="center" c="white" mb="xs" fw={700}>
            Four powerful tools, one app
          </Title>
          <Text ta="center" c="gray.5" mb="xl" size="lg">
            Everything you need to learn a new language effectively
          </Text>

          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2rem",
              marginTop: "2rem",
            }}
          >
            {/* Feature 1: Flashcards */}
            <Box
              style={{
                background: "linear-gradient(135deg, rgba(233, 69, 96, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)",
                border: "1px solid rgba(233, 69, 96, 0.2)",
                borderRadius: "16px",
                padding: "2rem",
              }}
            >
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "12px",
                  background: "rgba(233, 69, 96, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <IconCards size={28} color="#e94560" />
              </Box>
              <Title order={3} c="white" mb="sm" fw={600}>
                Flashcard Study
              </Title>
              <Text c="gray.4" size="sm" style={{ lineHeight: 1.7 }}>
                Learn vocabulary using the proven <strong style={{ color: "#e94560" }}>Leitner spaced repetition system</strong>. 
                Create your own decks or <strong style={{ color: "#e94560" }}>import directly from Anki</strong> (.apkg files). 
                Includes text-to-speech for 10+ languages.
              </Text>
              <Box mt="md">
                <Text size="xs" c="gray.6">
                  ✓ Anki deck import (.apkg) &nbsp; ✓ Leitner boxes &nbsp; ✓ Audio TTS
                </Text>
              </Box>
            </Box>

            {/* Feature 2: Sentence Practice */}
            <Box
              style={{
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: "16px",
                padding: "2rem",
              }}
            >
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "12px",
                  background: "rgba(99, 102, 241, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Text size="xl">🧠</Text>
              </Box>
              <Title order={3} c="white" mb="sm" fw={600}>
                Sentence Practice
              </Title>
              <Text c="gray.4" size="sm" style={{ lineHeight: 1.7 }}>
                Practice reading comprehension with <strong style={{ color: "#6366f1" }}>AI-generated sentences</strong> using 
                only your mastered vocabulary. Choose random sentences or follow 
                a <strong style={{ color: "#6366f1" }}>cohesive story</strong> to keep practice engaging.
              </Text>
              <Box mt="md">
                <Text size="xs" c="gray.6">
                  ✓ Uses your vocab &nbsp; ✓ Story mode &nbsp; ✓ Adjustable difficulty
                </Text>
              </Box>
            </Box>

            {/* Feature 3: Assisted Reading */}
            <Box
              style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "16px",
                padding: "2rem",
              }}
            >
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <IconBook2 size={28} color="#10b981" />
              </Box>
              <Title order={3} c="white" mb="sm" fw={600}>
                Assisted Reading
              </Title>
              <Text c="gray.4" size="sm" style={{ lineHeight: 1.7 }}>
                Import any text or PDF and read with <strong style={{ color: "#10b981" }}>instant word translations</strong>. 
                Click any word to see its meaning, hear the <strong style={{ color: "#10b981" }}>pronunciation</strong>, 
                and automatically save it as a flashcard for later review.
              </Text>
              <Box mt="md">
                <Text size="xs" c="gray.6">
                  ✓ Click-to-translate &nbsp; ✓ Auto-save vocab &nbsp; ✓ PDF support
                </Text>
              </Box>
            </Box>

            {/* Feature 4: Conversation Practice */}
            <Box
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "16px",
                padding: "2rem",
              }}
            >
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "12px",
                  background: "rgba(245, 158, 11, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <IconMessageCircle size={28} color="#f59e0b" />
              </Box>
              <Title order={3} c="white" mb="sm" fw={600}>
                Conversation Practice
              </Title>
              <Text c="gray.4" size="sm" style={{ lineHeight: 1.7 }}>
                Practice real-world scenarios by <strong style={{ color: "#f59e0b" }}>chatting with AI</strong> in your target language. 
                Click words to translate them, and use the <strong style={{ color: "#f59e0b" }}>lookup panel</strong> to 
                find words while composing your messages.
              </Text>
              <Box mt="md">
                <Text size="xs" c="gray.6">
                  ✓ Real scenarios &nbsp; ✓ Click-to-translate &nbsp; ✓ Composition help
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Bottom CTA */}
      <Box
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Title order={3} c="white" mb="sm">
          Ready to start learning?
        </Title>
        <Text c="gray.5" mb="lg">
          Join for free and begin your language journey today.
        </Text>
        <Button
          size="lg"
          variant="gradient"
          gradient={{ from: "#e94560", to: "#ff6b6b" }}
          onClick={promptSignIn}
          leftSection={<IconLogin size={18} />}
        >
          Get Started
        </Button>
      </Box>

      {/* Footer */}
      <Box
        style={{
          padding: "2rem",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.03)",
        }}
      >
        <Text size="xs" c="gray.7">
          LangBase is free and open source. Built with ❤️ for language learners.
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

  // Hide header in study/practice mode for full-screen experience
  const isFullScreenMode = path.startsWith("/study/") || path.startsWith("/practice/");

  if (isFullScreenMode) {
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
                LangBase
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
