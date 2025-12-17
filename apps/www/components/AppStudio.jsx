import React, { useState, useMemo } from "react";
import {
  Box,
  AppShell,
  Group,
  Avatar,
  Text,
  LoadingOverlay,
} from "@mantine/core";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useRouter } from "../../../framework/hooks/useRouter.js";
import { showNotification } from "@mantine/notifications";
import { ProfileModal } from "./ProfileModal.jsx";
import AppGrid from "./AppGrid.jsx";
import AppDetailsPage from "./AppDetailsPage.jsx";
import CreateAppModal from "./CreateAppModal.jsx";
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
 * @returns {{ view: "home" | "studio" | "terms" | "privacy" | "about" | "pricing" | "integrations" | "app-details"; appId?: string }}
 */
function parseRoute(path) {
  if (path === "/terms") return { view: "terms" };
  if (path === "/privacy") return { view: "privacy" };
  if (path === "/about") return { view: "about" };
  if (path === "/pricing") return { view: "pricing" };
  if (path === "/integrations") return { view: "integrations" };
  if (path === "/studio") return { view: "studio" };
  
  // Check for /studio/app/{appId}
  const appMatch = path.match(/^\/studio\/app\/([^/]+)/);
  if (appMatch) {
    return { view: "app-details", appId: appMatch[1] };
  }
  
  // Default to homepage
  return { view: "home" };
}

export default function AppStudio() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { path, navigate } = useRouter();
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
  // Parse route from current path
  const route = useMemo(() => parseRoute(path), [path]);
  
  // Get this app's logo from the apps collection
  const appLogo = useMemo(() => {
    const thisApp = allApps.find(a => a.id === APP_ID);
    return thisApp?.logoURL;
  }, [allApps]);
  
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  
  // Get selected app from route
  const selectedAppId = route.appId || null;
  const selectedAppDetails = useMemo(() => {
    if (!selectedAppId) return null;
    return allApps.find(a => a.id === selectedAppId) || null;
  }, [selectedAppId, allApps]);
  
  // Navigation helpers
  const navigateToStudio = () => {
    console.log("[AppStudio] navigateToStudio called");
    navigate("/studio");
  };
  const navigateToHome = () => {
    console.log("[AppStudio] navigateToHome called");
    navigate("/");
  };
  const navigateToTerms = () => {
    console.log("[AppStudio] navigateToTerms called");
    navigate("/terms");
  };
  const navigateToPrivacy = () => {
    console.log("[AppStudio] navigateToPrivacy called");
    navigate("/privacy");
  };
  const navigateToAbout = () => {
    console.log("[AppStudio] navigateToAbout called");
    navigate("/about");
  };
  const navigateToPricing = () => {
    console.log("[AppStudio] navigateToPricing called");
    navigate("/pricing");
  };
  const navigateToIntegrations = () => {
    console.log("[AppStudio] navigateToIntegrations called");
    navigate("/integrations");
  };
  const navigateToApp = (/** @type {string | null} */ appId) => {
    if (appId) {
      navigate(`/studio/app/${appId}`);
    } else {
      navigate("/studio");
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

  const handleOpenApp = (/** @type {{ id: string }} */ app) => {
    window.open(`https://${app.id}.basebase.com`, '_blank');
  };

  const handleShowDetails = (/** @type {{ id: string }} */ app) => {
    navigateToApp(app.id);
  };

  const handleBackFromDetails = () => {
    navigateToApp(null);
  };

  // Debug logging
  console.log("[AppStudio] Current path:", path, "Route:", route);

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
    return <Pricing onBack={navigateToHome} onSignIn={navigateToStudio} />;
  }
  if (route.view === "integrations") {
    return <IntegrationsPage onBack={navigateToHome} />;
  }
  if (route.view === "home") {
    return (
      <PublicHomepage 
        onSignIn={navigateToStudio}
        isAuthenticated={!!user}
        onNavigateToTerms={navigateToTerms}
        onNavigateToPrivacy={navigateToPrivacy}
        onNavigateToAbout={navigateToAbout}
        onNavigateToPricing={navigateToPricing}
        onNavigateToIntegrations={navigateToIntegrations}
      />
    );
  }

  // Studio content (only for authenticated users - AuthProvider handles this)
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
          {user && (
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
              onOpenApp={handleOpenApp}
              onShowDetails={handleShowDetails}
              onCreateApp={() => setCreateModalOpened(true)}
            />
          )}
        </Box>
      </AppShell.Main>

      {/* Modals */}
      <CreateAppModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
      />
      <ProfileModal
        opened={profileModalOpened}
        onClose={() => setProfileModalOpened(false)}
      />
    </AppShell>
  );
}
