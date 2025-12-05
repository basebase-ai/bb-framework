/**
 * WriteBase - Collaborative Document Editor
 * 
 * A Google Docs-like application with:
 * - Real-time collaborative editing
 * - Document sharing and permissions
 * - Version history with fine-grained tracking
 * - Presence indicators (cursors, typing)
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { 
  MantineProvider, 
  AppShell, 
  Group, 
  Title, 
  Text, 
  Avatar, 
  ActionIcon,
  Tooltip,
  Loader,
  Stack,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconFileText, IconLogout } from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth } from "../../framework/core/firebase-init.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { APP_ID } from "./schema.js";
import { useAppStore } from "./stores/appStore.js";
import { DocumentsList } from "./components/DocumentsList.jsx";
import { DocumentEditor } from "./components/DocumentEditor.jsx";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// TipTap editor styles
const editorStyles = `
  .tiptap {
    outline: none;
    min-height: 300px;
  }
  
  .tiptap p {
    margin: 0.5em 0;
  }
  
  .tiptap h1 {
    font-size: 2em;
    font-weight: 700;
    margin: 0.67em 0;
  }
  
  .tiptap h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin: 0.75em 0;
  }
  
  .tiptap h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin: 0.83em 0;
  }
  
  .tiptap ul,
  .tiptap ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  
  .tiptap li {
    margin: 0.25em 0;
  }
  
  .tiptap blockquote {
    border-left: 3px solid #e9ecef;
    padding-left: 1em;
    margin: 0.5em 0;
    color: #868e96;
  }
  
  .tiptap pre {
    background: #f8f9fa;
    border-radius: 4px;
    padding: 0.75em 1em;
    font-family: monospace;
    margin: 0.5em 0;
    overflow-x: auto;
  }
  
  .tiptap code {
    background: #f1f3f5;
    border-radius: 3px;
    padding: 0.1em 0.3em;
    font-family: monospace;
  }
  
  .tiptap pre code {
    background: none;
    padding: 0;
  }
  
  .tiptap p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
  
  .tiptap:focus {
    outline: none;
  }
`;

/**
 * Main app content component
 */
function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const view = useAppStore((state) => state.view);

  // Handle deep linking to a specific document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const docId = params.get('doc');
      if (docId && user) {
        useAppStore.getState().openDocument(docId);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user]);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (authLoading) {
    return (
      <Stack align="center" justify="center" h="100vh">
        <Loader size="lg" />
        <Text c="dimmed">Loading...</Text>
      </Stack>
    );
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          {/* Logo */}
          <Group 
            gap="xs" 
            style={{ cursor: 'pointer' }}
            onClick={() => useAppStore.getState().closeDocument()}
          >
            <IconFileText size={28} color="#228be6" />
            <Title order={3}>WriteBase</Title>
          </Group>
          
          {/* User Menu */}
          {user && (
            <Group gap="md">
              <Group gap="xs">
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
              
              <Tooltip label="Sign Out">
                <ActionIcon variant="subtle" color="gray" onClick={handleSignOut}>
                  <IconLogout size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ height: 'calc(100vh - 60px)', overflow: 'auto' }}>
        {view === 'list' && <DocumentsList />}
        {view === 'editor' && <DocumentEditor />}
      </AppShell.Main>
    </AppShell>
  );
}

/**
 * Root App component
 */
function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <style>{editorStyles}</style>
      <AuthProvider appId={APP_ID}>
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
/** @type {import('react-dom/client').Root | undefined} */
let root;

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
