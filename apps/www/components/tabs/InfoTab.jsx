import React, { useState } from "react";
import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Avatar,
  Button,
  Box,
  Grid,
  Image,
  Spoiler,
  Paper,
  ThemeIcon,
  SimpleGrid,
  Tooltip,
  ActionIcon,
  ScrollArea,
} from "@mantine/core";
import {
  IconExternalLink,
  IconCopy,
  IconCalendar,
  IconCategory,
  IconUsers,
  IconLock,
  IconWorld,
  IconCode,
  IconChevronRight,
  IconPhoto,
  IconStar,
  IconDownload,
} from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { useAuth } from "../../../../framework/hooks/useAuth.js";

/**
 * Format date to readable string
 * @param {unknown} timestamp
 */
function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  const date = typeof timestamp === 'object' && 'toDate' in timestamp 
    ? /** @type {{ toDate: () => Date }} */ (timestamp).toDate() 
    : new Date(/** @type {string | number | Date} */ (timestamp));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format relative time
 * @param {unknown} timestamp
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = typeof timestamp === 'object' && 'toDate' in timestamp 
    ? /** @type {{ toDate: () => Date }} */ (timestamp).toDate() 
    : new Date(/** @type {string | number | Date} */ (timestamp));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * @typedef {Object} AppData
 * @property {string} id
 * @property {string} [name]
 * @property {string} [description]
 * @property {string} [category]
 * @property {string} [logoURL]
 * @property {string[]} [screenshots]
 * @property {string[]} [tags]
 * @property {string} [accessMode]
 * @property {boolean} [publicUse]
 * @property {boolean} [publicEdit]
 * @property {string} [currentVersion]
 * @property {string} [versionNotes]
 * @property {string} owner
 * @property {string[]} [collaborators]
 * @property {unknown} [createdAt]
 * @property {unknown} [updatedAt]
 */

/**
 * @typedef {Object} ProfileData
 * @property {string} [displayName]
 * @property {string} [email]
 * @property {string} [photoURL]
 * @property {string} [bio]
 */

/**
 * @param {{ app: AppData, ownerProfile: ProfileData | undefined, collaboratorProfiles: Map<string, ProfileData> | undefined }} props
 */
export default function InfoTab({ app, ownerProfile, collaboratorProfiles }) {
  const [showAllScreenshots, setShowAllScreenshots] = useState(false);
  const { user } = useAuth();
  
  const appUrl = `https://${app.id}.basebase.com`;
  const screenshots = app.screenshots || [];
  const hasScreenshots = screenshots.length > 0;
  const ownerDisplayName = user
    ? (ownerProfile?.displayName || "Unknown Developer")
    : "Sign in to view";
  
  return (
    <Stack gap="xl">
      {/* Hero Action Section */}
      <Card withBorder radius="lg" p="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Group gap="xs">
              <Badge 
                color={app.accessMode === "open" ? "gray" : "dark"} 
                variant="light"
                size="sm"
              >
                {app.accessMode === "open" ? "Free" : "Invite Only"}
              </Badge>
              {app.category && (
                <Badge color="gray" variant="light" size="sm">
                  {app.category}
                </Badge>
              )}
            </Group>
            
            <Text size="sm" c="dimmed" lineClamp={2}>
              {app.description || "No description available. The developer hasn't added a description yet."}
            </Text>
            
            <Group gap="lg" mt="xs">
              <Group gap={4}>
                <IconStar size={14} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                <Text size="sm" fw={500}>—</Text>
                <Text size="xs" c="dimmed">No ratings yet</Text>
              </Group>
              <Group gap={4}>
                <IconDownload size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="xs" c="dimmed">— installs</Text>
              </Group>
            </Group>
          </Stack>
          

        </Group>
      </Card>
      
      {/* Screenshots Section */}
      <Box>
        <Group justify="space-between" mb="sm">
          <Text size="lg" fw={600}>Preview</Text>
          {hasScreenshots && screenshots.length > 3 && (
            <Button 
              variant="subtle" 
              size="xs" 
              rightSection={<IconChevronRight size={14} />}
              onClick={() => setShowAllScreenshots(!showAllScreenshots)}
            >
              {showAllScreenshots ? "Show less" : "See all"}
            </Button>
          )}
        </Group>
        
        {hasScreenshots ? (
          <ScrollArea>
            <Group gap="md" wrap="nowrap">
              {(showAllScreenshots ? screenshots : screenshots.slice(0, 4)).map((url, idx) => (
                <Image
                  key={idx}
                  src={url}
                  alt={`Screenshot ${idx + 1}`}
                  radius="md"
                  h={280}
                  w="auto"
                  fit="contain"
                  style={{ 
                    border: '1px solid #E8E8ED',
                    borderRadius: 12,
                    flexShrink: 0,
                  }}
                />
              ))}
            </Group>
          </ScrollArea>
        ) : (
          <Paper 
            withBorder 
            p="xl" 
            radius="md"
            style={{ 
              background: '#F5F5F7',
              border: '2px dashed #D2D2D7',
            }}
          >
            <Stack align="center" gap="sm">
              <ThemeIcon size="xl" variant="light" color="gray" radius="xl">
                <IconPhoto size={24} />
              </ThemeIcon>
              <Text size="sm" c="dimmed" ta="center">
                No screenshots available yet
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                App owners can add screenshots in Settings
              </Text>
            </Stack>
          </Paper>
        )}
      </Box>
      
      {/* Description Section */}
      <Box>
        <Text size="lg" fw={600} mb="sm">About this app</Text>
        <Card withBorder radius="md" p="lg">
          <Spoiler 
            maxHeight={120} 
            showLabel="Read more" 
            hideLabel="Show less"
            styles={{
              control: { color: '#1D1D1F' }
            }}
          >
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {app.description || "The developer hasn't provided a detailed description for this app yet. Check back later for more information about what this app does and how to use it."}
            </Text>
          </Spoiler>
          
          {app.tags && app.tags.length > 0 && (
            <Group gap={6} mt="md">
              {app.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" color="gray" size="sm" radius="sm">
                  {tag}
                </Badge>
              ))}
            </Group>
          )}
        </Card>
      </Box>
      
      {/* What's New Section */}
      <Box>
        <Text size="lg" fw={600} mb="sm">What's New</Text>
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="xs">
            <Badge variant="light" color="gray" size="sm">
              {app.currentVersion ? `Version ${app.currentVersion.slice(0, 8)}` : "Initial release"}
            </Badge>
            <Text size="xs" c="dimmed">{formatRelativeTime(app.updatedAt)}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {app.versionNotes || "No release notes available for this version."}
          </Text>
        </Card>
      </Box>
      
      {/* Information Grid */}
      <Box>
        <Text size="lg" fw={600} mb="sm">Information</Text>
        <Card withBorder radius="md" p={0}>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing={0}>
            <InfoItem 
              icon={<IconCategory size={18} />}
              label="Category"
              value={app.category || "Uncategorized"}
            />
            <InfoItem 
              icon={<IconCalendar size={18} />}
              label="Released"
              value={formatDate(app.createdAt)}
            />
            <InfoItem 
              icon={<IconCalendar size={18} />}
              label="Updated"
              value={formatDate(app.updatedAt)}
            />
            <InfoItem 
              icon={app.accessMode === "open" ? <IconWorld size={18} /> : <IconLock size={18} />}
              label="Access"
              value={app.accessMode === "open" ? "Open to all" : "Invite only"}
            />
            <InfoItem 
              icon={<IconUsers size={18} />}
              label="Collaborators"
              value={`${(app.collaborators?.length || 0) + 1} people`}
            />
            <InfoItem 
              icon={<IconCode size={18} />}
              label="App ID"
              value={app.id}
              copyable
            />
          </SimpleGrid>
        </Card>
      </Box>
      
      {/* Developer Section */}
      <Box>
        <Text size="lg" fw={600} mb="sm">Developer</Text>
        <Card withBorder radius="md" p="lg">
          <Group gap="md">
            <Avatar
              src={ownerProfile?.photoURL}
              alt={ownerProfile?.displayName || ownerDisplayName}
              size={56}
              radius="xl"
              color="gray"
            >
              {(ownerProfile?.displayName || ownerDisplayName || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text fw={500}>{ownerDisplayName}</Text>
              {ownerProfile?.bio && (
                <Text size="xs" c="dimmed" lineClamp={2}>{ownerProfile.bio}</Text>
              )}
            </Stack>
          </Group>
          
          {app.collaborators && app.collaborators.length > 0 && (
            <>
              <Text size="sm" fw={500} mt="lg" mb="sm">Team</Text>
              <Group gap="sm">
                {app.collaborators.map((uid) => {
                  const collab = collaboratorProfiles?.get(uid);
                  return (
                    <Tooltip key={uid} label={collab?.displayName || uid}>
                      <Avatar 
                        src={collab?.photoURL} 
                        size="md" 
                        radius="xl" 
                        color="gray"
                      >
                        {(collab?.displayName || "?").charAt(0).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  );
                })}
              </Group>
            </>
          )}
        </Card>
      </Box>
    </Stack>
  );
}

/**
 * Information grid item component
 * @param {{ icon: React.ReactNode, label: string, value: string, copyable?: boolean }} props
 */
function InfoItem({ icon, label, value, copyable }) {
  return (
    <Box 
      p="md" 
      style={{ 
        borderBottom: '1px solid #E8E8ED',
        borderRight: '1px solid #E8E8ED',
      }}
    >
      <Group gap="xs" mb={4}>
        <ThemeIcon size="sm" variant="transparent" color="dimmed">
          {icon}
        </ThemeIcon>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
          {label}
        </Text>
      </Group>
      <Group gap={4}>
        <Text size="sm" fw={500} truncate style={{ maxWidth: copyable ? '80%' : '100%' }}>
          {value}
        </Text>
        {copyable && (
          <ActionIcon 
            size="xs" 
            variant="subtle" 
            color="gray"
            onClick={() => {
              navigator.clipboard.writeText(value);
              showNotification({ message: `${label} copied!`, color: "teal" });
            }}
          >
            <IconCopy size={12} />
          </ActionIcon>
        )}
      </Group>
    </Box>
  );
}
