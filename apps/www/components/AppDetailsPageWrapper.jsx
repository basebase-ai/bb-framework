/**
 * AppDetailsPageWrapper - Wrapper for app details with routing
 * Fetches app by ID from URL params and renders AppDetailsPage
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  AppShell,
  Group,
  Avatar,
  Text,
  LoadingOverlay,
  Button,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useRoute } from "../../../framework/hooks/useRoute.js";
import { ProfileModal } from "./ProfileModal.jsx";
import AppDetailsPage from "./AppDetailsPage.jsx";

/**
 * App details page wrapper with routing
 */
export default function AppDetailsPageWrapper() {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { params, navigate } = useRoute();
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  // Get the app from params
  const selectedApp = useMemo(() => {
    if (!params.appId) return null;
    return allApps.find(a => a.id === params.appId) || null;
  }, [params.appId, allApps]);

  const handleBack = () => {
    navigate("/gallery");
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
    navigate("/gallery");
    showNotification({
      title: "Success",
      message: "App deleted successfully",
      color: "teal",
    });
  };

  return (
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
          <Group 
            gap="xs" 
            align="center"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
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
          <Group gap={20}>
            <Text
              component="a"
              href="https://blog.basebase.com"
              size="sm"
              style={{ color: "#5a7a7e", textDecoration: "none", cursor: "pointer" }}
            >
              Blog
            </Text>
            <Text
              component="a"
              href="https://github.com/basebase-ai/bb-framework"
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              style={{ color: "#5a7a7e", textDecoration: "none", cursor: "pointer" }}
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
             <Text
              size="sm"
              style={{ color: "#5a7a7e", textDecoration: "none", cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              Gallery
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
              onClick={promptSignIn}
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
          <LoadingOverlay visible={loading && !selectedApp} />
          {selectedApp ? (
            <AppDetailsPage
              app={selectedApp}
              onBack={handleBack}
              onUpdate={handleUpdateApp}
              onDelete={handleDeleteApp}
            />
          ) : !loading && (
            <Box py="xl" ta="center">
              <Text c="dimmed">App not found</Text>
              <Button variant="light" mt="md" onClick={handleBack}>
                Back to gallery
              </Button>
            </Box>
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

