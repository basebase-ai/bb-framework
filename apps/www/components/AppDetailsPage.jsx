import React, { useState } from "react";
import {
  Text,
  Button,
  Card,
  Group,
  Box,
  Avatar,
  Badge,
  Tabs,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconExternalLink,
  IconInfoCircle,
  IconMessageCircle,
  IconBug,
  IconStar,
  IconSettings,
  IconHistory,
  IconHammer,
  IconGitFork,
} from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";

// Tab components
import InfoTab from "./tabs/InfoTab.jsx";
import DiscussionTab from "./tabs/DiscussionTab.jsx";
import IssuesTab from "./tabs/IssuesTab.jsx";
import ReviewsTab from "./tabs/ReviewsTab.jsx";
import VersionsTab from "./tabs/VersionsTab.jsx";
import SettingsTab from "./tabs/SettingsTab.jsx";

/** @type {Record<string, Record<string, string>>} */
const THEMES = {
  light: {
    bg: "#FFFFFF",
    bgCard: "#FFFFFF",
    border: "#f5f3eb",
    text: "#416165",
    textMuted: "#5a7a7e",
    accent: "#ff715b",
  },
  dark: {
    bg: "#0a0a0a",
    bgCard: "#111111",
    border: "#2a2a2a",
    text: "#e5e5e5",
    textMuted: "#888888",
    accent: "#22c55e",
  },
};

/**
 * @param {{
 *   app: Record<string, any>;
 *   onBack: () => void;
 *   onUpdate: (appId: string, data: Record<string, unknown>, options?: { silent?: boolean }) => Promise<void>;
 *   onDelete: (appId: string) => Promise<void>;
 *   darkMode?: boolean;
 * }} props
 */
export default function AppDetailsPage({ app, onBack, onUpdate, onDelete, darkMode = false }) {
  const colors = darkMode ? THEMES.dark : THEMES.light;
  const { user, promptSignIn } = useAuth();
  const [activeTab, setActiveTab] = useState("info");
  
  const { profile: ownerProfile } = useUserProfile(app?.owner);
  const { profiles: collaboratorProfiles } = useUserProfiles(app?.collaborators || []);
  
  const isOwner = user && app?.owner === user.uid;
  const isCollaborator = user && app?.collaborators?.includes(user.uid);
  const canEdit = !!user && (isOwner || isCollaborator);
  const handleFork = () => {
    if (!user) {
      promptSignIn();
      return;
    }
    window.open(`https://builder.basebase.com/?fork=${app.id}`, "_blank");
  };
  
  if (!app) return null;
  
  return (
    <Box maw={900} mx="auto" py="md">
      {/* Header */}
      <Group mb="lg" justify="space-between">
        <Button 
          variant={darkMode ? "outline" : "subtle"}
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
          style={darkMode ? { borderColor: colors.border, color: colors.text } : undefined}
        >
          Back
        </Button>
        <Group gap="xs">
          {canEdit && (
            <Button
              variant={darkMode ? "outline" : "light"}
              leftSection={<IconHammer size={14} />}
              onClick={() => window.open(`https://builder.basebase.com/?edit=${app.id}`, "_blank")}
              style={darkMode ? { borderColor: colors.border, color: colors.text } : undefined}
            >
              Build
            </Button>
          )}
          <Button
            variant={darkMode ? "outline" : "light"}
            leftSection={<IconGitFork size={14} />}
            onClick={handleFork}
            style={darkMode ? { borderColor: colors.border, color: colors.text } : undefined}
          >
            Fork
          </Button>
          <Button
            variant="filled"
            leftSection={<IconExternalLink size={14} />}
            onClick={() => window.open(`https://${app.id}.basebase.com`, "_blank")}
            style={{ backgroundColor: colors.accent, color: darkMode ? "#0a0a0a" : "#FFFFFF" }}
          >
            Open App
          </Button>
        </Group>
      </Group>
      
      {/* App Header */}
      <Card withBorder mb="lg" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
        <Group gap="md">
          <Avatar
            src={app.logoURL}
            alt={app.name}
            size={80}
            radius="md"
            color={darkMode ? "green" : "orange"}
          >
            {app.name?.charAt(0)?.toUpperCase() || "A"}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Text size="xl" fw={600} style={{ color: colors.text }}>{app.name || "Untitled App"}</Text>
            <Group gap="xs" mt={4}>
              <Avatar src={ownerProfile?.photoURL} size="xs" radius="xl" color={darkMode ? "pink" : "teal"}>
                {(ownerProfile?.displayName || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm" style={{ color: colors.textMuted }}>{ownerProfile?.displayName || "Unknown"}</Text>
              {app.category && <Badge color={darkMode ? "green" : "orange"} variant={darkMode ? "outline" : "light"} size="sm">{app.category}</Badge>}
            </Group>
          </div>
        </Group>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="info" leftSection={<IconInfoCircle size={14} />}>Info</Tabs.Tab>
          <Tabs.Tab value="discussion" leftSection={<IconMessageCircle size={14} />}>Discussion</Tabs.Tab>
          <Tabs.Tab value="issues" leftSection={<IconBug size={14} />}>Issues</Tabs.Tab>
          <Tabs.Tab value="reviews" leftSection={<IconStar size={14} />}>Reviews</Tabs.Tab>
          <Tabs.Tab value="versions" leftSection={<IconHistory size={14} />}>Versions</Tabs.Tab>
          {(isOwner || isCollaborator) && (
            <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>Settings</Tabs.Tab>
          )}
        </Tabs.List>
        
        <Tabs.Panel value="info">
          <InfoTab app={app} ownerProfile={ownerProfile} collaboratorProfiles={collaboratorProfiles} />
        </Tabs.Panel>
        
        <Tabs.Panel value="discussion">
          <DiscussionTab app={app} />
        </Tabs.Panel>
        
        <Tabs.Panel value="issues">
          <IssuesTab app={app} />
        </Tabs.Panel>
        
        <Tabs.Panel value="reviews">
          <ReviewsTab app={app} />
        </Tabs.Panel>
        
        <Tabs.Panel value="versions">
          <VersionsTab app={app} onUpdate={onUpdate} />
        </Tabs.Panel>
        
        {(isOwner || isCollaborator) && (
          <Tabs.Panel value="settings">
            <SettingsTab app={app} onUpdate={onUpdate} onDelete={onDelete} onClose={onBack} />
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}
