import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Group,
  Avatar,
  Text,
  LoadingOverlay,
  Button,
  Container,
  Menu,
} from "@mantine/core";
import { IconLogout, IconUser } from "@tabler/icons-react";
import { signOut } from "firebase/auth";
import { auth } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useRouter } from "../../../framework/hooks/useRouter.js";
import { showNotification } from "@mantine/notifications";
import { ProfileModal } from "./ProfileModal.jsx";
import AppGrid from "./AppGrid.jsx";
import AppDetailsPage from "./AppDetailsPage.jsx";
import PublicHomepage from "./PublicHomepage.jsx";
import TermsOfService from "./TermsOfService.jsx";
import PrivacyPolicy from "./PrivacyPolicy.jsx";
import AboutUs from "./AboutUs.jsx";
import Pricing from "./Pricing.jsx";
import IntegrationsPage from "./IntegrationsPage.jsx";

// Load Google Fonts (matching landing page)
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap";

/** @type {Record<string, string>} */
const COLORS = {
  bg: "#0a0a0a",
  bgLight: "#111111",
  border: "#2a2a2a",
  text: "#e5e5e5",
  textMuted: "#888888",
  accent: "#22c55e",
  pink: "#ec4899",
  purple: "#a855f7",
};

/**
 * Basebase Logo SVG Component - green/pink theme
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

/**
 * Parse route from URL path
 * @param {string} path
 * @returns {{ view: "home" | "gallery" | "terms" | "privacy" | "about" | "pricing" | "integrations" | "app-details"; appId?: string }}
 */
function parseRoute(path) {
  if (path === "/terms") return { view: "terms" };
  if (path === "/privacy") return { view: "privacy" };
  if (path === "/about") return { view: "about" };
  if (path === "/pricing") return { view: "pricing" };
  if (path === "/integrations") return { view: "integrations" };
  if (path === "/gallery") return { view: "gallery" };

  // Check for /gallery/app/{appId}
  const appMatch = path.match(/^\/gallery\/app\/([^/]+)/);
  if (appMatch) {
    return { view: "app-details", appId: appMatch[1] };
  }

  // Default to homepage
  return { view: "home" };
}

/**
 * @param {{ onSignIn?: () => void }} props
 */
export default function AppGallery({ onSignIn }) {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRouter();

  // Load Google Fonts on mount
  useEffect(() => {
    const existingLink = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");

  // Parse route from current path
  const route = useMemo(() => parseRoute(path), [path]);

  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Get selected app from route
  const selectedAppId = route.appId || null;
  const selectedAppDetails = useMemo(() => {
    if (!selectedAppId) return null;
    return allApps.find(a => a.id === selectedAppId) || null;
  }, [selectedAppId, allApps]);

  // Navigation helpers
  const navigateToGallery = () => {
    console.log("[AppGallery] navigateToGallery called");
    navigate("/gallery");
  };
  const navigateToHome = () => {
    navigate("/");
  };
  const navigateToTerms = () => {
    navigate("/terms");
  };
  const navigateToPrivacy = () => {
    navigate("/privacy");
  };
  const navigateToAbout = () => {
    navigate("/about");
  };
  const navigateToPricing = () => {
    navigate("/pricing");
  };
  const navigateToIntegrations = () => {
    navigate("/integrations");
  };
  const navigateToApp = (/** @type {string | null} */ appId) => {
    if (appId) {
      navigate(`/gallery/app/${appId}`);
    } else {
      navigate("/gallery");
    }
  };

  const handleUpdateApp = async (/** @type {string} */ appId, /** @type {Record<string, unknown>} */ data, /** @type {{ silent?: boolean }} */ options = {}) => {
    const { silent = false } = options;
    try {
      await updateItem(appId, {
        ...data,
        updatedAt: new Date(),
      });

      if (!silent) {
        showNotification({
          title: "Success",
          message: "App updated successfully",
          color: "teal",
        });
      }
    } catch (error) {
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
        color: "red",
      });
    }
  };

  const handleDeleteApp = async (/** @type {string} */ appId) => {
    await removeItem(appId);
    navigateToApp(null);
    showNotification({
      title: "Success",
      message: "App deleted successfully",
      color: "teal",
    });
  };

  const handleShowDetails = (/** @type {{ id: string }} */ app) => {
    navigateToApp(app.id);
  };

  const handleBackFromDetails = () => {
    navigateToApp(null);
  };

  /** @type {React.CSSProperties} */
  const navLinkStyle = { color: COLORS.textMuted, textDecoration: "none", cursor: "pointer", fontWeight: 400 };

  // Route to appropriate view
  if (route.view === "terms") {
    return <TermsOfService onBack={navigateToHome} />;
  }
  if (route.view === "privacy") {
    return <PrivacyPolicy onBack={navigateToHome} />;
  }
  if (route.view === "about") {
    return <AboutUs onBack={navigateToHome} />;
  }
  if (route.view === "pricing") {
    return <Pricing onBack={navigateToHome} onSignIn={navigateToGallery} />;
  }
  if (route.view === "integrations") {
    return (
      <IntegrationsPage
        onBack={navigateToHome}
        onSignIn={onSignIn || promptSignIn}
        onNavigateToGallery={navigateToGallery}
        onOpenProfile={() => setProfileModalOpened(true)}
        userPhotoURL={profile?.photoURL}
        userDisplayName={profile?.displayName || user?.email}
      />
    );
  }
  if (route.view === "home") {
    return (
      <PublicHomepage
        onNavigateToGallery={navigateToGallery}
        onSignIn={onSignIn || promptSignIn}
        onSignOut={handleSignOut}
        onOpenProfile={() => setProfileModalOpened(true)}
        user={user}
        userDisplayName={profile?.displayName || user?.email}
        userPhotoURL={profile?.photoURL}
      />
    );
  }

  // Gallery content - dark mode
  return (
    <Box
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation - dark mode */}
      <Box
        component="nav"
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(10, 10, 10, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          zIndex: 100,
        }}
      >
        <Container size="xl">
          <Group justify="space-between" h={56} px="md">
            {/* Logo */}
            <Group
              gap={8}
              align="center"
              style={{ cursor: "pointer" }}
              onClick={navigateToHome}
            >
              <BasebaseLogo size={22} />
              <Text fw={700} style={{ color: COLORS.text, letterSpacing: "-0.02em" }}>
                basebase
              </Text>
            </Group>

            {/* Desktop Nav Links */}
            <Group gap={24}>
              <Text
                size="sm"
                style={{ ...navLinkStyle, color: COLORS.text }}
              >
                Gallery
              </Text>
              <Text
                component="a"
                href="https://github.com/basebase-ai/bb-framework"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                style={navLinkStyle}
              >
                GitHub
              </Text>
              <Text
                component="a"
                href="https://docs.basebase.com"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                style={navLinkStyle}
              >
                Docs
              </Text>
              {user ? (
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <Avatar
                      src={profile?.photoURL}
                      alt={profile?.displayName || user.email || "User"}
                      size="sm"
                      radius="xl"
                      color="green"
                      style={{ cursor: "pointer" }}
                    >
                      {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                    </Avatar>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconUser size={14} />}
                      onClick={() => setProfileModalOpened(true)}
                    >
                      Profile
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconLogout size={14} />}
                      color="red"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => (onSignIn || promptSignIn)()}
                  style={{ borderColor: COLORS.border, color: COLORS.text }}
                >
                  Sign in
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Main Content */}
      <Container size="xl" py="xl">
        <LoadingOverlay visible={loading} overlayProps={{ color: COLORS.bg, backgroundOpacity: 0.8 }} />

        {/* Solution Gallery Headline */}
        {!selectedAppDetails && (
          <Text
            component="h1"
            mb="xl"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              margin: 0,
              marginBottom: 24,
            }}
          >
            App gallery
          </Text>
        )}

        {selectedAppDetails ? (
          <AppDetailsPage
            app={selectedAppDetails}
            onBack={handleBackFromDetails}
            onUpdate={handleUpdateApp}
            onDelete={handleDeleteApp}
            darkMode
          />
        ) : (
          <AppGrid
            apps={allApps}
            loading={loading}
            onShowDetails={handleShowDetails}
            onCreateApp={() => window.open("https://builder.basebase.com/?new=true", "_blank")}
            darkMode
          />
        )}
      </Container>

      {/* Modals */}
      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
    </Box>
  );
}
