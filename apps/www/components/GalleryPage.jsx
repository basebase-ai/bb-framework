/**
 * GalleryPage - App gallery view (public, auth-aware)
 * Shows all available apps with filtering and search
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
import AppGrid from "./AppGrid.jsx";

/**
 * Gallery page component
 */
export default function GalleryPage() {
  const { user, promptSignIn } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const { navigate } = useRoute();
  
  const { data: allApps = [], loading, update: updateItem, remove: removeItem } = useCollection("apps");
  
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  const handleShowDetails = (/** @type {{ id: string }} */ app) => {
    navigate(`/gallery/app/${app.id}`);
  };

  const handleCreateApp = () => {
    if (!user) {
      promptSignIn();
      return;
    }
    window.open("https://builder.basebase.com/?new=true", "_blank");
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
          <LoadingOverlay visible={loading} />
          <AppGrid
            apps={allApps}
            loading={loading}
            onShowDetails={handleShowDetails}
            onCreateApp={handleCreateApp}
          />
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

