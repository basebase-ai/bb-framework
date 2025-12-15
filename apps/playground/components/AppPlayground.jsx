import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { showNotification } from "@mantine/notifications";
import { ProfileModal } from "./ProfileModal.jsx";
import AppGrid from "./AppGrid.jsx";
import AppDetailsPage from "./AppDetailsPage.jsx";
import CreateAppModal from "./CreateAppModal.jsx";
import PublicHomepage from "./PublicHomepage.jsx";
import { APP_ID } from "../schema.js";

/**
 * Check if current path is the playground section
 * @returns {boolean}
 */
function isPlaygroundPath() {
  const path = window.location.pathname;
  return path === "/playground" || path.startsWith("/playground/");
}

/**
 * Get app ID from URL path (e.g., /playground/app/my-app-id -> my-app-id)
 * @returns {string | null}
 */
function getAppIdFromPath() {
  const path = window.location.pathname;
  const match = path.match(/^\/playground\/app\/([^/]+)/);
  return match ? match[1] : null;
}

export default function AppPlayground() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
  // Track current view (homepage or playground)
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const isOnPlayground = isPlaygroundPath();
  
  // Get this app's logo from the apps collection
  const appLogo = useMemo(() => {
    const thisApp = allApps.find(a => a.id === APP_ID);
    return thisApp?.logoURL;
  }, [allApps]);
  
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(/** @type {string | null} */ (null));
  
  // Derive selected app from ID and apps list
  const selectedAppDetails = useMemo(() => {
    if (!selectedAppId) return null;
    return allApps.find(a => a.id === selectedAppId) || null;
  }, [selectedAppId, allApps]);
  
  // Initialize from URL on mount and handle browser back/forward
  useEffect(() => {
    const appIdFromUrl = getAppIdFromPath();
    if (appIdFromUrl) {
      setSelectedAppId(appIdFromUrl);
    }
    
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      const appId = getAppIdFromPath();
      setSelectedAppId(appId);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Navigate to playground
  const navigateToPlayground = useCallback(() => {
    setCurrentPath('/playground');
    window.history.pushState({}, '', '/playground');
  }, []);
  
  // Navigate to homepage
  const navigateToHome = useCallback(() => {
    setCurrentPath('/');
    setSelectedAppId(null);
    window.history.pushState({}, '', '/');
  }, []);
  
  // Update URL when selected app changes (but not on popstate)
  const navigateToApp = useCallback((/** @type {string | null} */ appId) => {
    setSelectedAppId(appId);
    if (appId) {
      setCurrentPath(`/playground/app/${appId}`);
      window.history.pushState({ appId }, '', `/playground/app/${appId}`);
    } else {
      setCurrentPath('/playground');
      window.history.pushState({}, '', '/playground');
    }
  }, []);

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

  // Show homepage for root path (for all users)
  if (!isOnPlayground) {
    return (
      <PublicHomepage 
        onSignIn={navigateToPlayground}
        isAuthenticated={!!user}
      />
    );
  }

  // Playground content (only for authenticated users - AuthProvider handles this)
  return (
    <AppShell
      header={{ height: 48 }}
      padding="xs"
      style={{
        background: "#faf9f7",
      }}
    >
      <AppShell.Header style={{ borderBottom: '1px solid #f5f3eb', background: '#FFFFFF' }}>
        <Group h="100%" px="sm" justify="space-between">
          <Group gap="xs">
            <Text 
              fw={700} 
              size="md" 
              style={{ color: "#416165", cursor: "pointer" }}
              onClick={navigateToHome}
            >
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
