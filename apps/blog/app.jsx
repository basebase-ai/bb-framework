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
// Logo Component
// ============================================================================

/**
 * Basebase Logo SVG Component - green/pink/purple theme
 * @param {{ size?: number }} props
 */
function BasebaseLogo({ size = 28 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 45 56" width={size} height={size * (56 / 45)}>
      <path fill="#22c55e" d="M0 43.052C0 36.396 5.396 31 12.052 31c1.076 0 1.948.872 1.948 1.948V49a7 7 0 1 1-14 0v-5.948Z" />
      <path fill="#ec4899" d="M32.5 31C39.404 31 45 36.596 45 43.5S39.404 56 32.5 56 20 50.404 20 43.5v-9.022A3.479 3.479 0 0 1 23.479 31H32.5Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#a855f7" d="M32.5 0C39.404 0 45 5.596 45 12.5S39.404 25 32.5 25h-9.021A3.479 3.479 0 0 1 20 21.521V12.5C20 5.596 25.596 0 32.5 0Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#22c55e" d="M7 0a7 7 0 0 1 7 7v16.052A1.948 1.948 0 0 1 12.052 25C5.396 25 0 19.604 0 12.948V7a7 7 0 0 1 7-7Z" />
    </svg>
  );
}

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

        console.log("Fetching post with slug:", params.slug, "for user:", user.uid);

        // Try private collection first (drafts and user's posts)
        let q = query(
          collection(db, collections.posts),
          where("slug", "==", params.slug),
          where("authorId", "==", user.uid)
        );
        let snapshot = await getDocs(q);

        console.log("Private collection query returned", snapshot.size, "documents");

        // If not found in private collection, try public collection
        if (snapshot.empty) {
          console.log("Trying public collection...");
          q = query(
            collection(db, collections.postsPublic),
            where("slug", "==", params.slug),
            where("authorId", "==", user.uid)
          );
          snapshot = await getDocs(q);
          console.log("Public collection query returned", snapshot.size, "documents");
        }

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const postData = { id: doc.id, ...doc.data() };
          console.log("Post loaded:", postData);
          setPost(postData);
        } else {
          console.warn("No post found with slug:", params.slug);
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
      >
        <AppShell.Header
          style={{
            backdropFilter: "blur(20px)",
          }}
        >
          <Group h="100%" px="md" justify="space-between" maw={1400} mx="auto">
            {/* Logo/Title */}
            <Group gap="md">
              <Group
                gap="xs"
                component="a"
                href="https://www.basebase.com"
                style={{
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                <BasebaseLogo size={24} />
                <Text fw={700} size="lg" style={{ letterSpacing: "-0.02em" }}>
                  Basebase
                </Text>
                <Text size="sm" c="dimmed">
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
                    <Text size="sm" c="dimmed">
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
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        primaryColor: "green",
        scale: 0.92,
        colors: {
          dark: [
            "#C1C2C5",
            "#A6A7AB",
            "#909296",
            "#5c5f66",
            "#373A40",
            "#2C2E33",
            "#1a1a1a",
            "#0a0a0a",
            "#050505",
            "#000000",
          ],
          // Dark mode palette matching homepage
          green: [
            "#e6fff0",
            "#c3f9d8",
            "#8cf5b9",
            "#4ade80",
            "#34d970",
            "#22c55e",  // Primary - Green accent
            "#1ea750",
            "#188a42",
            "#126e35",
            "#0c5227",
          ],
          pink: [
            "#fff0f6",
            "#ffd6e8",
            "#ffadd2",
            "#ff85b8",
            "#f472b6",
            "#ec4899",  // Secondary - Pink accent
            "#db2777",
            "#be185d",
            "#9d174d",
            "#831843",
          ],
          purple: [
            "#f5f3ff",
            "#ede9fe",
            "#ddd6fe",
            "#c4b5fd",
            "#a78bfa",
            "#a855f7",  // Tertiary - Purple accent
            "#9333ea",
            "#7e22ce",
            "#6b21a8",
            "#581c87",
          ],
        },
        fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
        fontSizes: {
          xs: "0.75rem",
          sm: "0.85rem",
          md: "0.95rem",
          lg: "1.05rem",
          xl: "1.15rem",
        },
        spacing: {
          xs: "0.5rem",
          sm: "0.7rem",
          md: "0.9rem",
          lg: "1.1rem",
          xl: "1.4rem",
        },
        headings: {
          fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
          fontWeight: 600,
          sizes: {
            h1: { fontSize: "1.85rem" },
            h2: { fontSize: "1.6rem" },
            h3: { fontSize: "1.35rem" },
          },
        },
        defaultRadius: "md",
        components: {
          Button: { defaultProps: { size: "xs" } },
          TextInput: { defaultProps: { size: "sm" } },
          Textarea: { defaultProps: { size: "sm" } },
          Select: { defaultProps: { size: "sm" } },
          Autocomplete: { defaultProps: { size: "sm" } },
          Card: { defaultProps: { padding: "sm", radius: "md" } },
          Badge: { defaultProps: { size: "xs" } },
          Avatar: { defaultProps: { size: "md" } },
          ActionIcon: { defaultProps: { size: "sm" } },
        },
      }}
      withGlobalStyles
      withNormalizeCSS
    >
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
