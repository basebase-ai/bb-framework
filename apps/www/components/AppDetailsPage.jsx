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
  IconPencil,
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

export default function AppDetailsPage({ app, onBack, onUpdate, onDelete }) {
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
          variant="subtle" 
          color="slate"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
        >
          Back
        </Button>
        <Group gap="xs">
          {canEdit && (
            <Button
              variant="light"
              color="dark"
              leftSection={<IconHammer size={14} />}
              onClick={() => window.open(`https://builder.basebase.com/?edit=${app.id}`, "_blank")}
            >
              Build
            </Button>
          )}
          <Button
            variant="light"
            color="coral"
            leftSection={<IconGitFork size={14} />}
            onClick={handleFork}
          >
            Fork
        </Button>
        <Button
          variant="filled"
          color="coral"
          leftSection={<IconExternalLink size={14} />}
          onClick={() => window.open(`https://${app.id}.basebase.com`, '_blank')}
        >
          Open App
        </Button>
        </Group>
      </Group>
      
      {/* App Header */}
      <Card withBorder mb="lg" style={{ borderColor: '#f5f3eb' }}>
        <Group gap="md">
          <Avatar
            src={app.logoURL}
            alt={app.name}
            size={80}
            radius="md"
            color="coral"
          >
            {app.name?.charAt(0)?.toUpperCase() || "A"}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Text size="xl" fw={600} style={{ color: '#416165' }}>{app.name || "Untitled App"}</Text>
            <Group gap="xs" mt={4}>
              <Avatar src={ownerProfile?.photoURL} size="xs" radius="xl" color="teal">
                {(ownerProfile?.displayName || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm" style={{ color: '#5a7a7e' }}>{ownerProfile?.displayName || "Unknown"}</Text>
              {app.category && <Badge color="coral" variant="light" size="sm">{app.category}</Badge>}
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
