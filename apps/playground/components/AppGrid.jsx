import React, { useState, useMemo } from "react";
import {
  Title,
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

export default function AppGrid({ 
  apps, 
  loading, 
  onOpenApp, 
  onShowDetails, 
  onCreateApp 
}) {
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

  // Public apps
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
        <Stack gap={4} align="center">
          <Title
            order={2}
            size={rem(28)}
            weight={700}
            style={{
              background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Basebase Playground
          </Title>
          <Text size="xs" color="dimmed" weight={500}>
            Discover and build amazing apps
          </Text>
        </Stack>

        {/* Search and Create */}
        <Group gap="xs">
          <TextInput
            placeholder="Search apps..."
            leftSection={<IconSearch size={14} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
            styles={(theme) => ({
              input: {
                borderColor: "rgba(147, 51, 234, 0.3)",
                "&:focus": {
                  borderColor: theme.colors.violet[6],
                  boxShadow: `0 0 0 2px rgba(147, 51, 234, 0.1)`,
                },
              },
            })}
          />
          <Button
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            leftSection={<IconPlus size={14} />}
            onClick={onCreateApp}
            style={{ boxShadow: "0 4px 12px rgba(147, 51, 234, 0.2)" }}
          >
            Create App
          </Button>
        </Group>

        {/* Stats */}
        <Grid gutter="xs">
          <Grid.Col span={4}>
            <Card
              style={{
                background: !showMyApps 
                  ? "linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.15) 100%)"
                  : "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                border: !showMyApps 
                  ? "2px solid rgba(147, 51, 234, 0.5)"
                  : "1px solid rgba(147, 51, 234, 0.2)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setShowMyApps(false)}
            >
              <Group gap={6}>
                <IconRocket size={16} color="var(--mantine-color-violet-6)" />
                <div>
                  <Text size="sm" weight={700}>{publicApps.length}</Text>
                  <Text size="xs" color="dimmed">Public Apps</Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card
              style={{
                background: showMyApps 
                  ? "linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.15) 100%)"
                  : "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                border: showMyApps 
                  ? "2px solid rgba(147, 51, 234, 0.5)"
                  : "1px solid rgba(147, 51, 234, 0.2)",
                cursor: user ? "pointer" : "default",
                transition: "all 0.2s ease",
              }}
              onClick={() => user && setShowMyApps(true)}
            >
              <Group gap={6}>
                <IconCode size={16} color="var(--mantine-color-violet-6)" />
                <div>
                  <Text size="sm" weight={700}>{myApps.length}</Text>
                  <Text size="xs" color="dimmed">Your Apps</Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card
              style={{
                background: "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)",
                border: "1px solid rgba(147, 51, 234, 0.2)",
              }}
            >
              <Group gap={6}>
                <IconUsers size={16} color="var(--mantine-color-violet-6)" />
                <div>
                  <Text size="sm" weight={700}>
                    {new Set(publicApps.map((a) => a.owner)).size}
                  </Text>
                  <Text size="xs" color="dimmed">Developers</Text>
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
            background: "linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)",
            border: "1px solid rgba(147, 51, 234, 0.2)",
            textAlign: "center",
          }}
        >
          <Stack align="center" gap="xs">
            <IconRocket size={40} color="var(--mantine-color-violet-6)" opacity={0.5} />
            <div>
              <Text size="sm" weight={600} mb="xs">
                {searchQuery 
                  ? "No apps found" 
                  : showMyApps 
                    ? "No apps yet" 
                    : "No public apps yet"}
              </Text>
              <Text size="xs" color="dimmed">
                {searchQuery
                  ? "Try adjusting your search query"
                  : showMyApps
                    ? "Create your first app to get started"
                    : "Be the first to publish a public app!"}
              </Text>
            </div>
            {!searchQuery && (
              <Button
                variant="gradient"
                gradient={{ from: "violet", to: "grape", deg: 135 }}
                leftSection={<IconPlus size={14} />}
                onClick={onCreateApp}
                mt="xs"
              >
                Create App
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <Grid gutter="xs">
          {filteredApps.map((app) => (
            <Grid.Col key={app.id} span={{ base: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
              <AppCard 
                app={app}
                ownerProfile={ownerProfiles.get(app.owner)}
                onOpen={onOpenApp} 
                onDetails={onShowDetails}
              />
            </Grid.Col>
          ))}
        </Grid>
      )}
    </>
  );
}

