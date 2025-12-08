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
import { APP_ID } from "../schema.js";

/**
 * Get app ID from URL path (e.g., /app/my-app-id -> my-app-id)
 */
function getAppIdFromPath() {
  const path = window.location.pathname;
  const match = path.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

export default function AppPlayground() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
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
      const appId = getAppIdFromPath();
      setSelectedAppId(appId);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Update URL when selected app changes (but not on popstate)
  const navigateToApp = useCallback((appId) => {
    setSelectedAppId(appId);
    if (appId) {
      window.history.pushState({ appId }, '', `/app/${appId}`);
    } else {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const handleUpdateApp = async (appId, data, options = {}) => {
    const { silent = false } = options;
    try {
      await updateItem(appId, {
        ...data,
        updatedAt: new Date(),
      });
      
      // Note: selectedAppDetails is derived from allApps, so it auto-updates
      
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
        message: error.message,
        color: "red",
      });
    }
  };

  const handleDeleteApp = async (appId) => {
    await removeItem(appId);
    navigateToApp(null);
    showNotification({
      title: "Success",
      message: "App deleted successfully",
      color: "teal",
    });
  };

  const handleOpenApp = (app) => {
    window.open(`https://${app.id}.basebase.com`, '_blank');
  };

  const handleShowDetails = (app) => {
    navigateToApp(app.id);
  };

  const handleBackFromDetails = () => {
    navigateToApp(null);
  };

  return (
    <AppShell
      header={{ height: 48 }}
      padding="xs"
      style={{
        background: "linear-gradient(180deg, rgba(147, 51, 234, 0.05) 0%, rgba(0, 0, 0, 0) 50%)",
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="sm" justify="space-between">
          <Group gap="xs">
            {appLogo && (
              <img
                src={appLogo}
                alt="Playground"
                style={{
                  height: 28,
                  width: 'auto',
                  filter: 'brightness(0) invert(1)', // Makes SVG white
                }}
              />
            )}
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
                color="violet"
              />
              <Text size="sm" c="dimmed">
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
