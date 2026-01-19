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

import React, { useState, useEffect } from "react";
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
  Modal,
  Stack,
  Select,
  useMantineColorScheme,
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { IconLogin, IconLogout, IconUser, IconCards, IconBook2, IconMessageCircle, IconSun, IconMoon, IconLanguage, IconChevronDown, IconAlertTriangle, IconVolume } from "@tabler/icons-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../framework/core/firebase-init.js";
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
import { useSpeech } from "./hooks/useSpeech.js";
import { APP_ID, collections, SUPPORTED_LANGUAGES } from "./schema.js";

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
          <Tabs.Tab value="conversation" leftSection={<IconMessageCircle size={16} />}>
            Conversation
          </Tabs.Tab>
          <Tabs.Tab value="vocabulary" leftSection={<IconCards size={16} />}>
            Vocabulary
          </Tabs.Tab>
          <Tabs.Tab value="reading" leftSection={<IconBook2 size={16} />}>
            Reading
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === "vocabulary" && (
        <DeckList
          onViewDeck={handleViewDeck}
          onStudyDeck={handleStudyDeck}
        />
      )}
      
      {activeTab === "conversation" && (
        <ScenarioList onOpenConversation={handleOpenConversation} />
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
  const handleSentencePractice = (deckId) => {
    navigate(`/practice/${deckId}`);
  };

  return (
    <CardList
      deckId={params.id || ""}
      onBack={handleBack}
      onStudy={handleStudy}
      onSentencePractice={handleSentencePractice}
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
    // Navigate back to the deck view
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
        background: "#0f0f1a",
        overflowX: "hidden",
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
        }}
      >
        <Group gap="sm">
          <IconCards size={28} color="#e94560" />
          <Text fw={700} size="lg" style={{ color: "#e94560", letterSpacing: "-0.02em" }}>
            LangBase
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
            background: "#e94560",
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
            color: "#ffffff",
            marginBottom: "0.5rem",
            letterSpacing: "-0.03em",
          }}
        >
          LangBase
        </Title>
        <Text
          size="xl"
          c="gray.5"
          maw={550}
          mb="sm"
          style={{ lineHeight: 1.6 }}
        >
          Learn high-frequency words, and practice them in real conversations with AI.
        </Text>
       
        <Button
          size="xl"
          variant="filled"
          color="pink"
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

      {/* Method Section */}
      <Box
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "4rem 2rem",
        }}
      >
        <Box maw={900} mx="auto">
          <Title order={2} ta="center" c="white" mb="xs" fw={700}>
            The two-step method
          </Title>
          <Text ta="center" c="gray.5" mb="xl" size="lg">
            Build vocabulary, then put it to use immediately
          </Text>

          {/* Two main steps */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2rem",
              marginTop: "2rem",
            }}
          >
            {/* Step 1: Learn Vocabulary */}
            <Box
              style={{
                background: "rgba(233, 69, 96, 0.08)",
                border: "1px solid rgba(233, 69, 96, 0.2)",
                borderRadius: "16px",
                padding: "2rem",
                position: "relative",
              }}
            >
              <Box
                style={{
                  position: "absolute",
                  top: "-16px",
                  left: "24px",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#e94560",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "white",
                  fontSize: "14px",
                }}
              >
                1
              </Box>
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
                  marginTop: "0.5rem",
                }}
              >
                <IconCards size={28} color="#e94560" />
              </Box>
              <Title order={3} c="white" mb="sm" fw={600}>
                Learn High-Frequency Words
              </Title>
              <Text c="gray.4" size="sm" style={{ lineHeight: 1.7 }}>
                Import an <strong style={{ color: "#e94560" }}>Anki deck</strong> of the most common words in your 
                target language, or create your own. The <strong style={{ color: "#e94560" }}>Leitner spaced 
                repetition system</strong> ensures you review words at optimal intervals — spending 
                more time on words you struggle with.
              </Text>
              <Box mt="md">
                <Text size="xs" c="gray.6">
                  ✓ Import Anki decks (.apkg) &nbsp; ✓ Spaced repetition &nbsp; ✓ Audio pronunciation
                </Text>
              </Box>
            </Box>

            {/* Step 2: Practice in Scenarios */}
            <Box
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "16px",
                padding: "2rem",
                position: "relative",
              }}
            >
              <Box
                style={{
                  position: "absolute",
                  top: "-16px",
                  left: "24px",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "white",
                  fontSize: "14px",
                }}
              >
                2
              </Box>
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
                  marginTop: "0.5rem",
                }}
              >
                <IconMessageCircle size={28} color="#f59e0b" />
              </Box>
              <Title order={3} c="white" mb="sm" fw={600}>
                Practice in Real Scenarios
              </Title>
              <Text c="gray.4" size="sm" style={{ lineHeight: 1.7 }}>
                Create conversation scenarios like "ordering at a café" or "meeting a new friend". 
                An <strong style={{ color: "#f59e0b" }}>AI chat partner</strong> plays the other role while you practice. 
                Click any word to translate it, and use the <strong style={{ color: "#f59e0b" }}>lookup panel</strong> to 
                find words as you compose messages.
              </Text>
              <Box mt="md">
                <Text size="xs" c="gray.6">
                  ✓ Realistic scenarios &nbsp; ✓ Click-to-translate &nbsp; ✓ Grammar corrections
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Additional Tools Section */}
      <Box
        style={{
          padding: "4rem 2rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Box maw={900} mx="auto">
          <Title order={3} ta="center" c="gray.4" mb="xs" fw={600}>
            Plus more tools to accelerate your learning
          </Title>
          <Text ta="center" c="gray.6" mb="xl" size="sm">
            Additional features to support your language journey
          </Text>

          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Sentence Practice */}
            <Box
              style={{
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <Text size="lg" mb="xs">🧠</Text>
              <Title order={5} c="white" mb="xs" fw={600}>
                Sentence Practice
              </Title>
              <Text c="gray.5" size="xs" style={{ lineHeight: 1.6 }}>
                AI generates sentences using only your mastered vocabulary. 
                Test your comprehension with random sentences or follow a cohesive story.
              </Text>
            </Box>

            {/* Assisted Reading */}
            <Box
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <IconBook2 size={24} color="#10b981" style={{ marginBottom: 8 }} />
              <Title order={5} c="white" mb="xs" fw={600}>
                Assisted Reading
              </Title>
              <Text c="gray.5" size="xs" style={{ lineHeight: 1.6 }}>
                Import any text or PDF. Click words to see translations and hear pronunciation. 
                New words automatically become flashcards.
              </Text>
            </Box>

            {/* Community Decks */}
            <Box
              style={{
                background: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.15)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <Text size="lg" mb="xs">🌍</Text>
              <Title order={5} c="white" mb="xs" fw={600}>
                Community Sharing
              </Title>
              <Text c="gray.5" size="xs" style={{ lineHeight: 1.6 }}>
                Share vocabulary decks and conversation scenarios with other learners. 
                Copy community content to your own library.
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Supported Languages Section */}
      <Box
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Box maw={800} mx="auto">
          <Title order={2} ta="center" c="white" mb="xs" fw={700}>
            Supported Languages
          </Title>
          <Text ta="center" c="gray.5" mb="lg" size="sm">
            For English speakers learning these languages
          </Text>
          
          <Group justify="center" gap="lg" mb="xl">
            <Box ta="center">
              <Text size="2.5rem" mb="xs">🇪🇸</Text>
              <Text c="white" fw={500}>Spanish</Text>
            </Box>
            <Box ta="center">
              <Text size="2.5rem" mb="xs">🇫🇷</Text>
              <Text c="white" fw={500}>French</Text>
            </Box>
            <Box ta="center">
              <Text size="2.5rem" mb="xs">🇳🇴</Text>
              <Text c="white" fw={500}>Norwegian</Text>
            </Box>
            <Box ta="center">
              <Text size="2.5rem" mb="xs">🇩🇪</Text>
              <Text c="white" fw={500}>German</Text>
            </Box>
          </Group>
          
          <Text c="gray.6" size="xs" ta="center">
            Currently available for English speakers only. More languages coming soon!
          </Text>
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
          variant="filled"
          color="pink"
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

// Language options for select dropdowns (with flags)
const languageOptions = Object.entries(SUPPORTED_LANGUAGES)
  .filter(([key]) => key !== "english") // Don't show English as a study language
  .map(([key, lang]) => ({
    value: key,
    label: `${lang.flag} ${lang.name}`,
  }));

function AppLayout() {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { navigate, path } = useRoute();
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [languageSetupOpen, setLanguageSetupOpen] = useState(false);
  const [selectedSetupLanguage, setSelectedSetupLanguage] = useState("spanish");
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  // Speech synthesis for voice checking
  const { availableVoices, hasVoiceForLanguage, getVoiceInfo } = useSpeech();
  
  // Store state
  const primaryLanguage = useUIStore((s) => s.primaryLanguage);
  const setPrimaryLanguage = useUIStore((s) => s.setPrimaryLanguage);
  const setSourceLanguage = useUIStore((s) => s.setSourceLanguage);
  
  // Load primary language from user preferences
  const [prefsLoading, setPrefsLoading] = useState(true);
  
  /**
   * Check voice availability and show notification
   * @param {string} languageKey
   */
  const checkVoiceAndNotify = React.useCallback((languageKey) => {
    // Wait a bit for voices to load (they load async in some browsers)
    setTimeout(() => {
      const langInfo = SUPPORTED_LANGUAGES[languageKey];
      if (!langInfo) return;
      
      const voiceInfo = getVoiceInfo(languageKey);
      
      if (voiceInfo.hasVoice) {
        notifications.show({
          id: "voice-success",
          title: `${langInfo.name} voice selected`,
          message: `Using "${voiceInfo.voiceName}" (${voiceInfo.voiceLang}) for audio pronunciation.`,
          color: "green",
          icon: <IconVolume size={18} />,
          autoClose: 5000,
        });
      } else {
        notifications.show({
          id: "voice-warning",
          title: `No ${langInfo.name} voice available`,
          message: `Your browser doesn't have a ${langInfo.name} text-to-speech voice. Audio pronunciation won't work. To fix: install ${langInfo.name} voices in your system settings.`,
          color: "yellow",
          icon: <IconAlertTriangle size={18} />,
          autoClose: 10000,
        });
      }
    }, 500);
  }, [getVoiceInfo]);
  
  useEffect(() => {
    if (!user?.uid) {
      setPrefsLoading(false);
      return;
    }
    
    // Set loading to true when starting to fetch for a user
    setPrefsLoading(true);
    
    const prefsRef = doc(db, collections.userPreferences, user.uid);
    
    getDoc(prefsRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.primaryLanguage) {
          setPrimaryLanguage(data.primaryLanguage);
          setSourceLanguage(data.primaryLanguage);
        }
      }
      setPrefsLoading(false);
    }).catch((err) => {
      console.error("Failed to load user preferences:", err);
      setPrefsLoading(false);
    });
  }, [user?.uid, setPrimaryLanguage, setSourceLanguage]);
  
  // Check voice availability whenever primaryLanguage changes
  useEffect(() => {
    if (primaryLanguage && availableVoices.length > 0) {
      checkVoiceAndNotify(primaryLanguage);
    }
  }, [primaryLanguage, availableVoices.length, checkVoiceAndNotify]);
  
  // Show language setup modal for new users (after loading)
  // Don't show if we already have a primaryLanguage set in the store (optimistic update)
  useEffect(() => {
    if (user && !prefsLoading && !primaryLanguage) {
      setLanguageSetupOpen(true);
    }
  }, [user, prefsLoading, primaryLanguage]);
  
  /**
   * Handle language setup completion
   */
  const handleLanguageSetup = async () => {
    if (!user?.uid) return;
    
    // Close modal immediately (optimistic)
    setLanguageSetupOpen(false);
    
    // Update local state immediately
    setPrimaryLanguage(selectedSetupLanguage);
    setSourceLanguage(selectedSetupLanguage);
    
    // Save to user preferences collection
    try {
      const prefsRef = doc(db, collections.userPreferences, user.uid);
      await setDoc(prefsRef, {
        owner: user.uid,
        primaryLanguage: selectedSetupLanguage,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save language preference:", err);
    }
  };
  
  /**
   * Handle language change from dropdown
   * @param {string} lang
   */
  const handleLanguageChange = async (lang) => {
    if (!user?.uid) return;
    
    // Update local state immediately
    setPrimaryLanguage(lang);
    setSourceLanguage(lang);
    
    // Save to user preferences collection
    try {
      const prefsRef = doc(db, collections.userPreferences, user.uid);
      await setDoc(prefsRef, {
        owner: user.uid,
        primaryLanguage: lang,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save language preference:", err);
    }
  };

  const handleNavigateHome = () => {
    navigate("/");
  };

  // Hide header in study/practice mode for full-screen experience
  const isFullScreenMode = path.startsWith("/study/") || path.startsWith("/practice/");

  // If user is not logged in, just render the route content (landing page) without AppShell
  if (!user) {
    return <RouteContent />;
  }

  if (isFullScreenMode) {
    return <RouteContent />;
  }
  
  const currentLangInfo = primaryLanguage ? SUPPORTED_LANGUAGES[primaryLanguage] : null;

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="md"
        style={{ background: isDark ? "#0f0f1a" : undefined, overflowX: "hidden" }}
      >
        <AppShell.Header
          style={{
            background: isDark ? "rgba(15, 15, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${isDark ? "rgba(233, 69, 96, 0.2)" : "rgba(233, 69, 96, 0.3)"}`,
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
              <Group gap="sm">
                {/* Language selector dropdown */}
                {currentLangInfo && (
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        rightSection={<IconChevronDown size={14} />}
                      >
                        {currentLangInfo.flag} {currentLangInfo.name}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Studying</Menu.Label>
                      {languageOptions.map((opt) => (
                        <Menu.Item
                          key={opt.value}
                          onClick={() => handleLanguageChange(opt.value)}
                          style={{
                            fontWeight: opt.value === primaryLanguage ? 600 : 400,
                            background: opt.value === primaryLanguage 
                              ? (isDark ? "rgba(233, 69, 96, 0.15)" : "rgba(233, 69, 96, 0.1)")
                              : undefined,
                          }}
                        >
                          {opt.label}
                        </Menu.Item>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                )}
                
                {/* User menu */}
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
                      <Text size="sm" c="gray.5" visibleFrom="sm">
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
                    <Menu.Item
                      leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
                      onClick={() => toggleColorScheme()}
                    >
                      {isDark ? "Light Mode" : "Dark Mode"}
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
      
      {/* Language setup modal for new users */}
      <Modal
        opened={languageSetupOpen}
        onClose={() => {}} // Prevent closing without selection
        title="Welcome to LangBase!"
        centered
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            What language are you learning? This will be your default for creating decks, conversations, and reading materials.
          </Text>
          <Select
            label="I'm studying"
            placeholder="Select a language"
            data={languageOptions}
            value={selectedSetupLanguage}
            onChange={(val) => val && setSelectedSetupLanguage(val)}
            size="md"
            required
          />
          <Text size="xs" c="dimmed">
            You can use Langbase to study multiple languages at once, just change this anytime in the header.
          </Text>
          <Button
            onClick={handleLanguageSetup}
            fullWidth
            color="pink"
            disabled={!selectedSetupLanguage}
          >
            Get Started
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  // Prevent horizontal scrolling on mobile
  useEffect(() => {
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
    return () => {
      document.documentElement.style.overflowX = "";
      document.body.style.overflowX = "";
    };
  }, []);

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
