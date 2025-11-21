/**
 * Grid View - Responsive grid with vertical tiles
 */

import React, { useMemo } from "react";
import { Container, Title, Text, SimpleGrid, Card, Avatar, Stack, Group } from "@mantine/core";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";

export function GridView() {
  const { user } = useAuth();

  const whereConditions = useMemo(() => {
    if (!user?.uid) return [["owner", "==", "___no_user___"]];
    return [["owner", "==", user.uid]];
  }, [user?.uid]);

  const { data: apps, loading } = useCollection("apps", {
    where: whereConditions,
    realtime: true,
  });

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Text>Loading apps...</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <div>
          <Title order={1}>Apps - Grid</Title>
          <Text c="dimmed" size="sm">
            Responsive grid with vertical tiles
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {apps.map((app) => (
            <Card key={app.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Text fw={600} size="lg">{app.name}</Text>
                <Text size="sm" c="dimmed" lineClamp={3}>
                  {app.description || "No description"}
                </Text>
                <Group gap="xs" mt="auto">
                  <Avatar src={app.logoURL} size="sm" radius="xl" />
                  <Text size="xs" c="dimmed">{user.displayName || user.email}</Text>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

