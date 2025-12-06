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
} from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";

// Tab components
import InfoTab from "./tabs/InfoTab.jsx";
import DiscussionTab from "./tabs/DiscussionTab.jsx";
import IssuesTab from "./tabs/IssuesTab.jsx";
import ReviewsTab from "./tabs/ReviewsTab.jsx";
import SettingsTab from "./tabs/SettingsTab.jsx";

export default function AppDetailsPage({ app, onBack, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("info");
  
  const { profile: ownerProfile } = useUserProfile(app?.owner);
  const { profiles: collaboratorProfiles } = useUserProfiles(app?.collaborators || []);
  
  const isOwner = user && app?.owner === user.uid;
  const isCollaborator = user && app?.collaborators?.includes(user.uid);
  
  if (!app) return null;
  
  return (
    <Box maw={900} mx="auto" py="md">
      {/* Header */}
      <Group mb="lg" justify="space-between">
        <Button 
          variant="subtle" 
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          variant="filled"
          color="violet"
          leftSection={<IconExternalLink size={14} />}
          onClick={() => window.open(`https://${app.id}.basebase.com`, '_blank')}
        >
          Open App
        </Button>
      </Group>
      
      {/* App Header */}
      <Card withBorder mb="lg">
        <Group gap="md">
          <Avatar
            src={app.logoURL}
            alt={app.name}
            size={80}
            radius="md"
            color="violet"
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
          >
            {app.name?.charAt(0)?.toUpperCase() || "A"}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Text size="xl" fw={700}>{app.name || "Untitled App"}</Text>
            <Group gap="xs" mt={4}>
              <Avatar src={ownerProfile?.photoURL} size="xs" radius="xl" color="violet">
                {(ownerProfile?.displayName || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm" c="dimmed">{ownerProfile?.displayName || "Unknown"}</Text>
              {app.category && <Badge color="violet" variant="light" size="sm">{app.category}</Badge>}
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
        
        {(isOwner || isCollaborator) && (
          <Tabs.Panel value="settings">
            <SettingsTab app={app} onUpdate={onUpdate} onDelete={onDelete} onClose={onBack} />
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}
