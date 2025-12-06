import React, { useState } from "react";
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

export default function AppPlayground() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [selectedAppDetails, setSelectedAppDetails] = useState(null);

  const handleUpdateApp = async (appId, data, options = {}) => {
    const { silent = false } = options;
    try {
      await updateItem(appId, {
        ...data,
        updatedAt: new Date(),
      });
      
      // Update the selectedAppDetails if we're viewing this app
      if (selectedAppDetails?.id === appId) {
        setSelectedAppDetails(prev => prev ? { ...prev, ...data } : null);
      }
      
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
    setSelectedAppDetails(null);
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
    setSelectedAppDetails(app);
  };

  const handleBackFromDetails = () => {
    setSelectedAppDetails(null);
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
            <Avatar
              src="/favicon.svg"
              alt="Basebase"
              size="sm"
              radius="sm"
            />
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
