/**
 * Reorderable View - Draggable horizontal tiles for reordering
 */

import React, { useMemo, useState } from "react";
import { Container, Title, Text, Card, Avatar, Stack, Group } from "@mantine/core";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

export function ReorderableView() {
  const { user } = useAuth();
  const [draggedIndex, setDraggedIndex] = useState(null);

  const whereConditions = useMemo(() => {
    if (!user?.uid) return [["owner", "==", "___no_user___"]];
    return [["owner", "==", user.uid]];
  }, [user?.uid]);

  const { data: apps, loading, update } = useCollection(collections.apps, {
    where: whereConditions,
    realtime: true,
  });

  // Assign default order values based on index if missing
  const orderedApps = useMemo(() => {
    return [...apps]
      .map((app, idx) => ({
        ...app,
        order: app.order !== undefined ? app.order : idx * 1000
      }))
      .sort((a, b) => a.order - b.order);
  }, [apps]);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDrop = async (dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const draggedApp = orderedApps[draggedIndex];
    
    // Calculate new order value between neighbors
    let newOrder;
    if (dropIndex === 0) {
      newOrder = orderedApps[0].order - 1000;
    } else if (dropIndex === orderedApps.length - 1) {
      newOrder = orderedApps[orderedApps.length - 1].order + 1000;
    } else {
      const prevOrder = orderedApps[dropIndex - 1].order;
      const nextOrder = orderedApps[dropIndex + 1].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    await update(draggedApp.id, { order: newOrder });
    setDraggedIndex(null);
  };

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
          <Title order={1}>Apps - Reorderable</Title>
          <Text c="dimmed" size="sm">
            Drag tiles up and down to reorder them
          </Text>
        </div>

        <Stack gap="sm">
          {orderedApps.map((app, index) => (
            <Card
              key={app.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              style={{ cursor: "move" }}
            >
              <Group wrap="nowrap">
                <Avatar src={app.logoURL} size={60} radius="md" />
                <div style={{ flex: 1 }}>
                  <Text fw={600}>{app.name}</Text>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {app.description || "No description"}
                  </Text>
                </div>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

