/**
 * Blog - Multi-user blogging platform inspired by Ghost
 * A clean, professional blog system for Basebase's homepage
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
  Button,
  Menu,
  Box,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconLogin, IconLogout, IconUser, IconEdit } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
import { AuthProvider } from "../../framework/components/AuthProvider.jsx";
import { ProfileModal } from "./components/ProfileModal.jsx";
import { PostList } from "./components/PostList.jsx";
import { PostView } from "./components/PostView.jsx";
import { PostEditor } from "./components/PostEditor.jsx";
import { DebugPanel } from "./components/DebugPanel.jsx";
import { useSyncAuthorProfile } from "./hooks/useSyncAuthorProfile.js";
import { APP_ID } from "./schema.js";

// Mantine CSS imports
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

/**
 * Parse the current route from URL
 */
function parseRoute() {
  const path = window.location.pathname;

  // Match /edit/:slug or /edit (new post)
  const editMatch = path.match(/^\/edit(?:\/(.+))?$/);
  if (editMatch) {
    return { view: "edit", slug: editMatch[1] || null };
  }

  // Match /:slug (post view)
  const postMatch = path.match(/^\/(.+)$/);
  if (postMatch) {
    return { view: "post", slug: postMatch[1] };
  }

  // Default: home
  return { view: "home" };
}

/**
 * Navigate to a route
 */
function navigate(view, slug = null) {
  let path = "/";
  if (view === "home") {
    path = "/";
  } else if (view === "post" && slug) {
    path = `/${slug}`;
  } else if (view === "edit") {
    path = slug ? `/edit/${slug}` : "/edit";
  }
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Main app content
 */
function AppContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [currentSlug, setCurrentSlug] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  // Sync author profile to public collection when signed in
  useSyncAuthorProfile();

  // Parse route on mount and on browser back/forward
  useEffect(() => {
    const handleRouteChange = () => {
      const route = parseRoute();
      setCurrentView(route.view);
      setCurrentSlug(route.slug);
    };

    handleRouteChange();
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);


  const handleNavigateHome = () => {
    setEditingPost(null);
    navigate("home");
  };

  const handleNavigateToPost = (slug) => {
    setEditingPost(null);
    navigate("post", slug);
  };

  const handleCreatePost = () => {
    setEditingPost(null);
    navigate("edit");
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    navigate("edit", post.slug);
  };

  const handleSavePost = () => {
    // Refresh and go home
    handleNavigateHome();
  };

  const handleCloseEditor = () => {
    handleNavigateHome();
  };

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="xs"
        style={{
          background: "#faf9f7",
        }}
      >
        <AppShell.Header
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid #e8eced",
          }}
        >
          <Group h="100%" px="md" justify="space-between" maw={1400} mx="auto">
            {/* Logo/Title */}
            <Group gap="md">
              <Group
                gap="xs"
                style={{ cursor: "pointer" }}
                onClick={handleNavigateHome}
              >
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914399563_basebase_white_64.png?alt=media&token=b00983f8-b6b5-41f4-9c9a-83fd3f71f695"
                  alt="Basebase"
                  style={{ height: 32, width: 32 }}
                />
                <Text fw={700} size="lg" style={{ color: "#416165", letterSpacing: "-0.02em" }}>
                  Basebase
                </Text>
                <Text size="sm" style={{ color: "#5a7a7e" }}>
                  Blog
                </Text>
              </Group>
              {import.meta.env.DEV && (
                <Button
                  size="xs"
                  variant={debugMode ? "filled" : "light"}
                  onClick={() => setDebugMode(!debugMode)}
                >
                  {debugMode ? "Close Debug" : "Debug"}
                </Button>
              )}
            </Group>

            {/* User menu */}
            {user ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Group gap="xs" style={{ cursor: "pointer" }}>
                    <Avatar
                      src={profile?.photoURL}
                      alt={profile?.displayName || user.email || "User"}
                      size="sm"
                      radius="xl"
                      color="coral"
                    >
                      {(profile?.displayName || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Text size="sm" style={{ color: "#5a7a7e" }}>
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
                    leftSection={<IconEdit size={16} />}
                    onClick={handleCreatePost}
                  >
                    New Post
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    color="red"
                    onClick={() => {
                      if (confirm("Are you sure you want to sign out?")) {
                        window.location.href = "/?signout=true";
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
                leftSection={<IconLogin size={16} />}
                onClick={() => {
                  window.location.href = "/?signin=true";
                }}
              >
                Sign In
              </Button>
            )}
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Box
            maw={1400}
            mx="auto"
            w="100%"
            p={{ base: 0, sm: "sm" }}
            py={{ base: 0, sm: "md" }}
          >
            {currentView === "edit" ? (
              <PostEditor
                post={editingPost}
                onClose={handleCloseEditor}
                onSave={handleSavePost}
              />
            ) : currentView === "post" && currentSlug ? (
              <PostView
                slug={currentSlug}
                onNavigateHome={handleNavigateHome}
                onEdit={handleEditPost}
              />
            ) : (
              <PostList
                key={user?.uid || "anonymous"}
                onNavigate={handleNavigateToPost}
                onCreatePost={handleCreatePost}
                onEditPost={handleEditPost}
              />
            )}
          </Box>
        </AppShell.Main>
      </AppShell>

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          opened={profileModalOpened}
          onClose={() => setProfileModalOpened(false)}
        />
      )}

      {/* Debug Panel (toggle with Debug button in header) */}
      {debugMode && <DebugPanel onClose={() => setDebugMode(false)} />}
    </>
  );
}

/**
 * Landing page for unauthenticated users
 */
function LandingPage({ onSignIn }) {
  const [debugMode, setDebugMode] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [currentSlug, setCurrentSlug] = useState(null);

  // Parse route on mount and on browser back/forward
  useEffect(() => {
    const handleRouteChange = () => {
      const route = parseRoute();
      setCurrentView(route.view);
      setCurrentSlug(route.slug);
    };

    handleRouteChange();
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  const handleNavigateHome = () => {
    navigate("home");
  };

  const handleNavigateToPost = (slug) => {
    navigate("post", slug);
  };

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="xs"
        style={{
          background: "#faf9f7",
        }}
      >
        <AppShell.Header
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid #e8eced",
          }}
        >
          <Group h="100%" px="md" justify="space-between" maw={1400} mx="auto">
            <Group gap="md">
              <Group
                gap="xs"
                style={{ cursor: "pointer" }}
                onClick={handleNavigateHome}
              >
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914399563_basebase_white_64.png?alt=media&token=b00983f8-b6b5-41f4-9c9a-83fd3f71f695"
                  alt="Basebase"
                  style={{ height: 32, width: 32 }}
                />
                <Text fw={700} size="lg" style={{ color: "#416165", letterSpacing: "-0.02em" }}>
                  Basebase
                </Text>
                <Text size="sm" style={{ color: "#5a7a7e" }}>
                  Blog
                </Text>
              </Group>
              {import.meta.env.DEV && (
                <Button
                  size="xs"
                  variant={debugMode ? "filled" : "light"}
                  onClick={() => setDebugMode(!debugMode)}
                >
                  {debugMode ? "Close Debug" : "Debug"}
                </Button>
              )}
            </Group>

            <Button
              variant="light"
              leftSection={<IconLogin size={16} />}
              onClick={onSignIn}
            >
              Sign In
            </Button>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Box
            maw={1400}
            mx="auto"
            w="100%"
            p={{ base: 0, sm: "sm" }}
            py={{ base: 0, sm: "md" }}
          >
            {currentView === "post" && currentSlug ? (
              <PostView
                slug={currentSlug}
                onNavigateHome={handleNavigateHome}
                onEdit={onSignIn}
              />
            ) : (
              <PostList
                onNavigate={handleNavigateToPost}
                onCreatePost={onSignIn}
                onEditPost={onSignIn}
              />
            )}
          </Box>
        </AppShell.Main>
      </AppShell>

      {/* Debug Panel (toggle with Debug button in header) */}
      {debugMode && <DebugPanel onClose={() => setDebugMode(false)} />}
    </>
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
        <AppContent />
      </AuthProvider>
    </MantineProvider>
  );
}

// Mount app (only once)
const container = document.getElementById("app");
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
