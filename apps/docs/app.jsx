/**
 * Basebase Documentation App
 * Technical documentation with sidebar navigation
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Avatar,
  Burger,
  Box,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import { IconLogin } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useRouter } from "../../framework/hooks/useRouter.js";
import { AuthProvider, SignOutButton } from "../../framework/components/AuthProvider.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { DocsSidebar } from "./components/DocsSidebar.jsx";
import { DocViewer } from "./components/DocViewer.jsx";
import { CreateDocModal } from "./components/CreateDocModal.jsx";
import { APP_ID, collections } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

const COLORS = {
  coral: "#ff715b",
  slate: "#416165",
  slateLight: "#5a7a7e",
  teal: "#17bebb",
  grey: "#e8eced",
  greyLight: "#f4f6f6",
  white: "#FFFFFF",
};

/**
 * Parse slug from URL path
 * @param {string} path
 * @returns {string | null}
 */
function getSlugFromPath(path) {
  // Match /docs/slug or just /slug
  const match = path.match(/^\/(?:docs\/)?([a-z0-9-]+)$/);
  return match ? match[1] : null;
}

/**
 * @param {{ onSignIn?: () => void }} props
 */
function DocsApp({ onSignIn }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRouter();
  const { data: docs = [], loading, error: docsError, add, update, remove } = useCollection(collections.docs);
  
  // Log collection errors for debugging
  useEffect(() => {
    if (docsError) {
      console.error("Docs collection error:", docsError);
    }
  }, [docsError]);
  
  const [sidebarOpened, { toggle: toggleSidebar }] = useDisclosure(true);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user is admin
  const isAdmin = profile?.role === "admin";

  // Get current doc slug from URL
  const currentSlug = useMemo(() => getSlugFromPath(path), [path]);

  // Find current doc
  const currentDoc = useMemo(() => {
    if (!currentSlug) return null;
    return docs.find(d => d.slug === currentSlug) || null;
  }, [currentSlug, docs]);
  
  // Default to "what-is-basebase" when no doc is selected
  useEffect(() => {
    if (!loading && docs.length > 0 && !currentSlug) {
      const defaultDoc = docs.find(d => d.slug === "what-is-basebase");
      if (defaultDoc) {
        navigate("/what-is-basebase", { replace: true });
      }
    }
  }, [loading, docs, currentSlug, navigate]);

  // Handle doc selection
  const handleSelectDoc = useCallback((/** @type {string} */ slug) => {
    navigate(`/${slug}`);
  }, [navigate]);

  // Handle doc creation
  const handleCreateDoc = useCallback(async (/** @type {{ slug: string; title: string; category: string; order: number }} */ data) => {
    if (!user) throw new Error("Must be logged in");
    
    // Check for duplicate slug
    const existing = docs.find(d => d.slug === data.slug);
    if (existing) {
      throw new Error("A document with this slug already exists");
    }

    await add({
      ...data,
      content: "",
      published: false,
      createdBy: user.uid,
    });

    // Navigate to new doc
    navigate(`/${data.slug}`);
  }, [user, docs, add, navigate]);

  // Handle doc save
  const handleSaveDoc = useCallback(async (/** @type {string} */ id, /** @type {Record<string, unknown>} */ data) => {
    await update(id, {
      ...data,
      updatedAt: new Date(),
    });
  }, [update]);

  // Handle doc delete
  const handleDeleteDoc = useCallback(async (/** @type {string} */ id) => {
    await remove(id);
    navigate("/");
  }, [remove, navigate]);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !sidebarOpened, desktop: !sidebarOpened },
      }}
      padding={0}
    >
      {/* Header */}
      <AppShell.Header
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${COLORS.grey}`,
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={sidebarOpened}
              onClick={toggleSidebar}
              size="sm"
              hiddenFrom="sm"
            />
            <Group 
              gap="xs" 
              style={{ cursor: "pointer" }}
              onClick={() => window.location.href = "https://www.basebase.com"}
            >
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914399563_basebase_white_64.png?alt=media&token=b00983f8-b6b5-41f4-9c9a-83fd3f71f695"
                alt="Basebase"
                style={{ height: 28, width: 28 }}
              />
              <Text fw={700} size="lg" style={{ color: COLORS.slate, letterSpacing: "-0.02em" }}>
                Docs
              </Text>
            </Group>
          </Group>

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
                color="coral"
              >
                {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
              </Avatar>
            </Group>
          ) : onSignIn ? (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconLogin size={14} />}
              onClick={onSignIn}
              color="gray"
            >
              Sign in
            </Button>
          ) : null}
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar style={{ background: COLORS.white, borderRight: `1px solid ${COLORS.grey}` }}>
        <DocsSidebar
          docs={docs}
          selectedSlug={currentSlug}
          onSelectDoc={handleSelectDoc}
          onCreateDoc={isAdmin ? () => setCreateModalOpened(true) : undefined}
          isAdmin={isAdmin}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main style={{ background: COLORS.white }}>
        <DocViewer
          doc={currentDoc}
          loading={loading}
          isAdmin={isAdmin}
          onSave={handleSaveDoc}
          onDelete={handleDeleteDoc}
        />
      </AppShell.Main>

      {/* Modals */}
      {user && (
        <ProfileModal
          opened={profileModalOpened}
          onClose={() => setProfileModalOpened(false)}
        />
      )}

      {isAdmin && (
        <CreateDocModal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
          onCreate={handleCreateDoc}
        />
      )}
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "coral",
        colors: {
          coral: [
            "#fff0ed", "#ffe0db", "#ffc1b5", "#ffa08f", "#ff8872",
            "#ff715b", "#e5654f", "#cc5a47", "#b24f3e", "#994435",
          ],
        },
        fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      <Notifications position="top-right" />
      {/* AuthProvider shows DocsApp for both auth and unauth users */}
      {/* landingPage receives { onSignIn } from AuthProvider which opens the auth modal */}
      <AuthProvider 
        appId={APP_ID}
        landingPage={({ onSignIn }) => <DocsApp onSignIn={onSignIn} />}
      >
        <DocsApp />
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
