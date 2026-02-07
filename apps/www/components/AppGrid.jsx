import React, { useState, useMemo } from "react";
import {
  Text,
  TextInput,
  Button,
  Grid,
  Card,
  Group,
  Stack,
  rem,
} from "@mantine/core";
import { IconSearch, IconPlus, IconRocket, IconCode, IconUsers } from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import AppCard from "./AppCard.jsx";

const BUILDER_URL = "https://builder.basebase.com";

/** @type {Record<string, Record<string, string>>} */
const THEMES = {
  light: {
    bg: "#faf9f7",
    bgCard: "#FFFFFF",
    bgCardActive: "#fff0ed",
    border: "#f5f3eb",
    borderActive: "#ff715b",
    text: "#416165",
    textMuted: "#5a7a7e",
    accent: "#ff715b",
    accentAlt: "#17bebb",
    accentYellow: "#fed766",
  },
  dark: {
    bg: "#0a0a0a",
    bgCard: "#111111",
    bgCardActive: "#1a2e1a",
    border: "#2a2a2a",
    borderActive: "#22c55e",
    text: "#e5e5e5",
    textMuted: "#888888",
    accent: "#22c55e",
    accentAlt: "#ec4899",
    accentYellow: "#a855f7",
  },
};

/**
 * @param {{
 *   apps: Array<any>;
 *   loading: boolean;
 *   onShowDetails: (app: any) => void;
 *   onCreateApp: () => void;
 *   darkMode?: boolean;
 * }} props
 */
export default function AppGrid({ 
  apps, 
  loading, 
  onShowDetails, 
  onCreateApp,
  darkMode = false,
}) {
  const colors = darkMode ? THEMES.dark : THEMES.light;
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyApps, setShowMyApps] = useState(false);

  // All apps where user is owner or collaborator
  const myApps = useMemo(() => {
    if (!user) return [];
    return apps.filter(app => 
      app.owner === user.uid || 
      (app.collaborators && app.collaborators.includes(user.uid))
    );
  }, [apps, user]);

  // Public apps (must explicitly set publicUse: true)
  const publicApps = useMemo(() => {
    return apps.filter(app => app.publicUse === true);
  }, [apps]);

  // Apps to display based on filter mode
  const displayApps = showMyApps ? myApps : publicApps;
  
  // Get all unique owner IDs and fetch their profiles
  const ownerIds = useMemo(() => {
    return [...new Set(displayApps.map(app => app.owner).filter(Boolean))];
  }, [displayApps]);
  
  const { profiles: ownerProfiles } = useUserProfiles(ownerIds);

  // Filter apps by search
  const filteredApps = useMemo(() => {
    if (!displayApps || !searchQuery.trim()) return displayApps || [];
    
    const query = searchQuery.toLowerCase();
    return displayApps.filter((app) => {
      return (
        app.name?.toLowerCase().includes(query) ||
        app.description?.toLowerCase().includes(query) ||
        app.category?.toLowerCase().includes(query) ||
        app.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [displayApps, searchQuery]);

  return (
    <>
      {/* Header */}
      <Stack gap="sm" mb={rem(20)}>
        {/* Search and Create */}
        <Group gap="xs">
          <TextInput
            placeholder="Search apps..."
            leftSection={<IconSearch size={14} color={colors.textMuted} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
            styles={{
              input: {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
                color: colors.text,
                "&::placeholder": { color: colors.textMuted },
                "&:focus": {
                  borderColor: colors.accent,
                  boxShadow: `0 0 0 2px ${colors.accent}22`,
                },
              },
            }}
          />
          <Button
            variant="filled"
            leftSection={<IconPlus size={14} />}
            onClick={() => onCreateApp?.()}
            style={{
              backgroundColor: colors.accent,
              color: darkMode ? "#0a0a0a" : "#FFFFFF",
            }}
          >
            Create App
          </Button>
        </Group>

        {/* Stats */}
        <Grid gutter="xs">
          <Grid.Col span={4}>
            <Card
              style={{
                background: !showMyApps ? colors.bgCardActive : colors.bgCard,
                border: !showMyApps ? `2px solid ${colors.borderActive}` : `1px solid ${colors.border}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setShowMyApps(false)}
            >
              <Group gap={6}>
                <IconRocket size={16} color={colors.accent} />
                <div>
                  <Text size="sm" fw={600} style={{ color: colors.text }}>{publicApps.length}</Text>
                  <Text size="xs" style={{ color: colors.textMuted }}>Public Apps</Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card
              style={{
                background: showMyApps ? colors.bgCardActive : colors.bgCard,
                border: showMyApps ? `2px solid ${colors.borderActive}` : `1px solid ${colors.border}`,
                cursor: user ? "pointer" : "default",
                transition: "all 0.2s ease",
              }}
              onClick={() => user && setShowMyApps(true)}
            >
              <Group gap={6}>
                <IconCode size={16} color={colors.accentAlt} />
                <div>
                  <Text size="sm" fw={600} style={{ color: colors.text }}>{myApps.length}</Text>
                  <Text size="xs" style={{ color: colors.textMuted }}>Your Apps</Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card
              style={{
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Group gap={6}>
                <IconUsers size={16} color={colors.accentYellow} />
                <div>
                  <Text size="sm" fw={600} style={{ color: colors.text }}>
                    {new Set(publicApps.map((a) => a.owner)).size}
                  </Text>
                  <Text size="xs" style={{ color: colors.textMuted }}>Developers</Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>

      {/* App Grid */}
      {filteredApps.length === 0 ? (
        <Card
          padding="md"
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            textAlign: "center",
          }}
        >
          <Stack align="center" gap="xs">
            <IconRocket size={40} color={colors.textMuted} opacity={0.5} />
            <div>
              <Text size="sm" fw={600} mb="xs" style={{ color: colors.text }}>
                {searchQuery 
                  ? "No apps found" 
                  : showMyApps 
                    ? "No apps yet" 
                    : "No public apps yet"}
              </Text>
              <Text size="xs" style={{ color: colors.textMuted }}>
                {searchQuery
                  ? "Try adjusting your search query"
                  : showMyApps
                    ? "Create your first app to get started"
                    : "Be the first to publish a public app!"}
              </Text>
            </div>
            {!searchQuery && (
              <Button
                variant="filled"
                leftSection={<IconPlus size={14} />}
                onClick={onCreateApp}
                mt="xs"
                style={{
                  backgroundColor: colors.accent,
                  color: darkMode ? "#0a0a0a" : "#FFFFFF",
                }}
              >
                Create App
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <Grid gutter="xs">
          {filteredApps.map((app) => {
            const ownerProfile = ownerProfiles.get(app.owner);
            const ownerDisplayName = user
              ? (ownerProfile?.displayName || "Unknown User")
              : "Sign in to view";
            return (
              <Grid.Col key={app.id} span={{ base: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
                <AppCard 
                  app={app}
                  ownerProfile={ownerProfile}
                  ownerDisplayName={ownerDisplayName}
                  onDetails={onShowDetails}
                  onFork={() => window.open(`${BUILDER_URL}/?fork=${app.id}`, "_blank")}
                  darkMode={darkMode}
                />
              </Grid.Col>
            );
          })}
        </Grid>
      )}
    </>
  );
}

