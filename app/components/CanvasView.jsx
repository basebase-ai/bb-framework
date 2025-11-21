/**
 * Canvas View - Draggable vertical tiles on canvas
 */

import React, { useMemo, useState } from "react";
import { Container, Title, Text, Card, Stack, Box } from "@mantine/core";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

export function CanvasView() {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const whereConditions = useMemo(() => {
    if (!user?.uid) return [["owner", "==", "___no_user___"]];
    return [["owner", "==", user.uid]];
  }, [user?.uid]);

  const { data: apps, loading, update } = useCollection(collections.apps, {
    where: whereConditions,
    realtime: true,
  });

  const handleDragStart = (e, app) => {
    setDragging(app.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (!dragging) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    const newPosition = {
      x: Math.max(0, Math.min(x, rect.width - 200)),
      y: Math.max(0, Math.min(y, rect.height - 150))
    };

    await update(dragging, { position: newPosition });
    setDragging(null);
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
          <Title order={1}>Apps - Canvas</Title>
          <Text c="dimmed" size="sm">
            Drag tiles to reposition them on the canvas
          </Text>
        </div>

        <Box
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            position: "relative",
            height: "600px",
            border: "1px dashed #ddd",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {apps.map((app) => {
            const pos = app.position || { x: 0, y: 0 };
            return (
              <Card
                key={app.id}
                shadow="sm"
                padding="md"
                radius="md"
                withBorder
                draggable
                onDragStart={(e) => handleDragStart(e, app)}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: "200px",
                  cursor: "move",
                }}
              >
                <Stack gap="xs">
                  <Text fw={600} size="sm">{app.name}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {app.description || "No description"}
                  </Text>
                </Stack>
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Container>
  );
}

