/**
 * List View - Horizontal tiles in vertical list
 */

import React, { useMemo } from "react";
import { Container, Title, Text, Card, Avatar, Stack, Group, Badge } from "@mantine/core";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

export function ListView() {
  const { user } = useAuth();

  const whereConditions = useMemo(() => {
    if (!user?.uid) return [["owner", "==", "___no_user___"]];
    return [["owner", "==", user.uid]];
  }, [user?.uid]);

  const { data: apps, loading } = useCollection(collections.apps, {
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
          <Title order={1}>Apps - List</Title>
          <Text c="dimmed" size="sm">
            Horizontal tiles in vertical list
          </Text>
        </div>

        <Stack gap="sm">
          {apps.map((app) => (
            <Card key={app.id} shadow="sm" padding="md" radius="md" withBorder>
              <Group wrap="nowrap">
                <Avatar src={app.logoURL} size={60} radius="md" />
                <div style={{ flex: 1 }}>
                  <Text fw={600}>{app.name}</Text>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {app.description || "No description"}
                  </Text>
                </div>
                <Badge color="blue" variant="light">
                  {app.status}
                </Badge>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

