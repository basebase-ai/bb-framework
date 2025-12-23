import React, { useState, useMemo } from "react";
import {
  Box,
  AppShell,
  Group,
  Avatar,
  Text,
  LoadingOverlay,
  Button,
  Stack,
  Title,
  Textarea,
  Paper,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
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
  const [builderPrompt, setBuilderPrompt] = useState("");
  
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

  const handleBuildIt = () => {
    const trimmed = builderPrompt.trim();
    const promptParam = encodeURIComponent(trimmed);
    const baseUrl = "https://builder.basebase.com/";
    const target = trimmed ? `${baseUrl}?prompt=${promptParam}` : baseUrl;
    window.open(target, "_blank");
  };

  // Debug logging

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
    return <IntegrationsPage onBack={navigateToHome} />;
  }
  if (route.view === "home") {
    return (
      <PublicHomepage 
        onSignIn={navigateToGallery}
        isAuthenticated={!!user}
        onNavigateToTerms={navigateToTerms}
        onNavigateToPrivacy={navigateToPrivacy}
        onNavigateToAbout={navigateToAbout}
        onNavigateToPricing={navigateToPricing}
        onNavigateToIntegrations={navigateToIntegrations}
      />
    );
  }

  // Gallery content (only for authenticated users - AuthProvider handles this)
  return (
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
          <Group 
            gap="xs" 
            align="center"
            style={{ cursor: "pointer" }}
            onClick={navigateToHome}
          >
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/vibe-together-d2159.firebasestorage.app/o/apps%2Fwww%2Fapp-assets%2Fwww%2F1765914399563_basebase_white_64.png?alt=media&token=b00983f8-b6b5-41f4-9c9a-83fd3f71f695"
              alt="Basebase"
              style={{ height: 32, width: 32 }}
            />
            <Text fw={700} size="lg" style={{ color: "#416165", letterSpacing: "-0.02em" }}>
              Basebase
            </Text>
          </Group>
          {user ? (
            <Group 
              gap="xs"
              style={{ cursor: 'pointer' }}
              onClick={() => setProfileModalOpened(true)}
            >
              <Avatar
                src={profile?.photoURL}
                alt={profile?.displayName || user.email}
                size="sm"
                radius="xl"
                color="coral"
              />
              <Text size="sm" style={{ color: "#5a7a7e" }}>
                {profile?.displayName || user.email}
              </Text>
            </Group>
          ) : (
            <Button
              variant="light"
              color="coral"
              size="xs"
              onClick={() => (onSignIn || promptSignIn)()}
            >
              Sign in
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box
          maw={1400}
          mx="auto"
          w="100%"
          p={{ base: 0, sm: 'sm' }}
          py={{ base: 0, sm: 'md' }}
        >
          <LoadingOverlay visible={loading} />
          
          {/* Hero builder CTA */}
          <Paper
            shadow="xs"
            radius="md"
            p={{ base: "lg", sm: "xl" }}
            mb="md"
            style={{
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            <Stack gap="md" align="center" w="100%">
              <Title order={3} style={{ color: "#1D1D1F", letterSpacing: "-0.02em" }} ta="center">
                What do you want to build?
              </Title>
              <Textarea
                placeholder="Describe your app idea... (e.g., CRM that pulls Salesforce + HubSpot, shows renewals, health scores, and reminders)"
                size="md"
                minRows={3}
                maxRows={6}
                autosize
                value={builderPrompt}
                onChange={(e) => setBuilderPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleBuildIt();
                  }
                }}
                w="100%"
                styles={{
                  input: {
                    backgroundColor: "#fdfefe",
                    border: "1px solid #dee2e6",
                  },
                }}
              />
              <Group justify="space-between" w="100%" align="center" wrap="wrap" gap="xs">
                <Text size="xs" c="dimmed">
                  Press ⌘+Enter to start building
                </Text>
                <Button
                  size="md"
                  variant="filled"
                  color="coral"
                  radius="md"
                  onClick={handleBuildIt}
                  rightSection={<IconArrowRight size={16} />}
                  disabled={!builderPrompt.trim()}
                >
                  Build it
                </Button>
              </Group>
            </Stack>
          </Paper>
          
        <Text
          size="xs"
          style={{ color: "#5a7a7e", padding: "24px 8px", textAlign: "center" }}
          weight={400}
        >
          Or select one of the apps below to use, edit, or fork
        </Text>

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
        </Box>
      </AppShell.Main>

      {/* Modals */}
      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
    </AppShell>
  );
}
