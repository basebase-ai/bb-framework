/**
 * Blog - Multi-user blogging platform inspired by Ghost
 * A clean, professional blog system for Basebase's homepage
 * 
 * Routes:
 *   /              - Post list (public)
 *   /:slug         - View post (public)
 *   /edit          - Create new post (auth required)
 *   /edit/:slug    - Edit existing post (auth required)
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
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconLogin, IconLogout, IconUser, IconEdit } from "@tabler/icons-react";
import { AppRouter, RouteContent, SignOutButton } from "../../framework/components/AppRouter.jsx";
import { useRoute } from "../../framework/hooks/useRoute.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";
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

// ============================================================================
// Route Components
// ============================================================================

/**
 * Home page - shows list of posts
 */
function HomePage() {
  const { navigate } = useRoute();
  const { user, promptSignIn } = useAuth();

  const handleNavigate = (/** @type {string} */ slug) => {
    navigate(`/${slug}`);
  };

  const handleCreatePost = () => {
    if (!user) {
      promptSignIn();
      return;
    }
    navigate("/edit");
  };

  const handleEditPost = (/** @type {{ slug: string }} */ post) => {
    if (!user) {
      promptSignIn();
      return;
    }
    navigate(`/edit/${post.slug}`);
  };

  return (
    <PostList
      key={user?.uid || "anonymous"}
      onNavigate={handleNavigate}
      onCreatePost={handleCreatePost}
      onEditPost={handleEditPost}
    />
  );
}

/**
 * Post view page - shows a single post
 */
function PostViewPage() {
  const { params, navigate } = useRoute();
  const { user, promptSignIn } = useAuth();

  const handleNavigateHome = () => {
    navigate("/");
  };

  const handleEdit = (/** @type {{ slug: string }} */ post) => {
    if (!user) {
      promptSignIn();
      return;
    }
    navigate(`/edit/${post.slug}`);
  };

  return (
    <PostView
      slug={params.slug}
      onNavigateHome={handleNavigateHome}
      onEdit={handleEdit}
    />
  );
}

/**
 * Post editor page - create or edit posts
 * Fetches post by slug when editing, passes null for new posts
 */
function PostEditorPage() {
  const { params, navigate } = useRoute();
  const { user } = useAuth();
  const [post, setPost] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(!!params.slug);

  // Fetch post by slug when editing
  useEffect(() => {
    if (!params.slug || !user) {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        // Import Firestore functions
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("../../framework/core/firebase-init.js");
        const { collections } = await import("./schema.js");
        
        // Query posts by slug for current user
        const q = query(
          collection(db, collections.posts),
          where("slug", "==", params.slug),
          where("authorId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setPost({ id: doc.id, ...doc.data() });
        }
      } catch (err) {
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.slug, user?.uid]);

  const handleClose = () => {
    navigate("/");
  };

  const handleSave = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <Box py="xl" ta="center">
        <Text c="dimmed">Loading post...</Text>
      </Box>
    );
  }

  return (
    <PostEditor
      post={post}
      onClose={handleClose}
      onSave={handleSave}
    />
  );
}

// ============================================================================
// Route Definitions
// ============================================================================

/** @type {import('../../framework/components/AppRouter.jsx').RouteDefinition[]} */
const routes = [
  { path: "/", component: HomePage },
  { path: "/edit", component: PostEditorPage, auth: true },
  { path: "/edit/:slug", component: PostEditorPage, auth: true },
  { path: "/:slug", component: PostViewPage },
];

// ============================================================================
// Layout Component
// ============================================================================

/**
 * Blog layout with header
 */
function BlogLayout() {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { navigate } = useRoute();
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Sync author profile to public collection when signed in
  useSyncAuthorProfile();

  const handleNavigateHome = () => {
    navigate("/");
  };

  const handleCreatePost = () => {
    navigate("/edit");
  };

  return (
    <>
      <AppShell
        header={{ height: 64 }}
        padding="xs"
        style={{ background: "#faf9f7" }}
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
                leftSection={<IconLogin size={16} />}
                onClick={promptSignIn}
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
            <RouteContent />
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

      {/* Debug Panel */}
      {debugMode && <DebugPanel onClose={() => setDebugMode(false)} />}
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
      <AppRouter appId={APP_ID} routes={routes}>
        <BlogLayout />
      </AppRouter>
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
