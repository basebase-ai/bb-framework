import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Group,
  Avatar,
  Text,
  LoadingOverlay,
  Button,
  Container,
} from "@mantine/core";
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
import { APP_ID } from "../schema.js";

// Load Google Fonts (matching landing page)
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap";

/** Basebase Logo SVG Component */
function BasebaseLogo({ size = 28 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 45 56" width={size} height={size * (56/45)}>
      <path fill="#FF7300" d="M0 43.052C0 36.396 5.396 31 12.052 31c1.076 0 1.948.872 1.948 1.948V49a7 7 0 1 1-14 0v-5.948Z" />
      <path fill="#FFBE00" d="M32.5 31C39.404 31 45 36.596 45 43.5S39.404 56 32.5 56 20 50.404 20 43.5v-9.022A3.479 3.479 0 0 1 23.479 31H32.5Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#FBBC05" d="M32.5 0C39.404 0 45 5.596 45 12.5S39.404 25 32.5 25h-9.021A3.479 3.479 0 0 1 20 21.521V12.5C20 5.596 25.596 0 32.5 0Zm0 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
      <path fill="#FF7300" d="M7 0a7 7 0 0 1 7 7v16.052A1.948 1.948 0 0 1 12.052 25C5.396 25 0 19.604 0 12.948V7a7 7 0 0 1 7-7Z" />
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
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
  // Parse route from current path
  const route = useMemo(() => parseRoute(path), [path]);
  
  // Get this app's logo from the apps collection
  const appLogo = useMemo(() => {
    const thisApp = allApps.find(a => a.id === APP_ID);
    return thisApp?.logoURL;
  }, [allApps]);
  
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
  const navLinkStyle = { color: "#1a1a1a", textDecoration: "none", cursor: "pointer", fontWeight: 400 };

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
        onSignIn={onSignIn || promptSignIn}
        onCreateApp={() => window.open("https://builder.basebase.com/?new=true", "_blank")}
        isAuthenticated={!!user}
        userPhotoURL={profile?.photoURL}
        userDisplayName={profile?.displayName || user?.email}
        onNavigateToTerms={navigateToTerms}
        onNavigateToPrivacy={navigateToPrivacy}
        onNavigateToAbout={navigateToAbout}
        onNavigateToPricing={navigateToPricing}
        onNavigateToIntegrations={navigateToIntegrations}
        onNavigateToGallery={navigateToGallery}
        onOpenProfile={() => setProfileModalOpened(true)}
      />
    );
  }

  // Gallery content
  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Navigation - matching landing page */}
      <Box
        component="nav"
        style={{
          position: "relative",
          background: "#FFFFFF",
          zIndex: 100,
        }}
      >
        <Container size="xl">
          <Group justify="space-between" h={72} px="md">
            {/* Logo */}
            <Group 
              gap={8} 
              align="center"
              style={{ cursor: "pointer" }}
              onClick={navigateToHome}
            >
              <BasebaseLogo size={28} />
              <Text fw={500} size="xl" style={{ color: "#1a1a1a", letterSpacing: "-0.02em" }}>
                Basebase
              </Text>
            </Group>

            {/* Desktop Nav Links */}
            <Group gap={32}>
              <Text
                size="sm"
                style={{ ...navLinkStyle, fontWeight: 500 }}
              >
                App Gallery
              </Text>
              <Text
                size="sm"
                style={navLinkStyle}
                onClick={() => navigateToIntegrations()}
              >
                Integrations
              </Text>
              <Text
                component="a"
                href="https://docs.basebase.com"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                style={navLinkStyle}
              >
                Documentation
              </Text>
              {user ? (
                <Group
                  gap="xs"
                  style={{ cursor: "pointer" }}
                  onClick={() => setProfileModalOpened(true)}
                >
                  <Avatar
                    src={profile?.photoURL}
                    alt={profile?.displayName || user.email || "User"}
                    size="sm"
                    radius="xl"
                    color="orange"
                  >
                    {(profile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </Avatar>
                </Group>
              ) : (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => (onSignIn || promptSignIn)()}
                  style={{ color: "#1a1a1a" }}
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
        <LoadingOverlay visible={loading} />
        
        {/* App Gallery Headline */}
        {!selectedAppDetails && (
          <Text
            component="h1"
            ta="center"
            mb="xl"
            style={{
              fontSize: "clamp(32px, 5vw, 53px)",
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              margin: 0,
              marginBottom: 32,
              fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
            }}
          >
            App Gallery
          </Text>
        )}

        {selectedAppDetails ? (
          <AppDetailsPage
            app={selectedAppDetails}
            onBack={handleBackFromDetails}
            onUpdate={handleUpdateApp}
            onDelete={handleDeleteApp}
          />
        ) : (
          <AppGrid
            apps={allApps}
            loading={loading}
            onShowDetails={handleShowDetails}
            onCreateApp={() => window.open("https://builder.basebase.com/?new=true", "_blank")}
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
