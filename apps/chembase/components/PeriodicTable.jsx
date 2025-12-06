/**
 * PeriodicTable
 * Visual grid of elements
 */

import React from "react";
import { Paper, SimpleGrid, UnstyledButton, Text, Group, Badge, Tooltip } from "@mantine/core";
import { elements } from "../data/elements.js";

export function PeriodicTable({ onSelectElement }) {
  // Simple grid for MVP (just 1-20)
  // In a real app, we'd use a CSS grid with specific coordinates for proper layout
  
  return (
    <Paper p="md" withBorder>
      <Text size="sm" c="dimmed" mb="md">Select an element to build it:</Text>
      <SimpleGrid cols={{ base: 3, sm: 5, md: 8, lg: 10 }} spacing="xs">
        {Object.entries(elements).map(([num, data]) => (
          <UnstyledButton
            key={num}
            onClick={() => onSelectElement(num)}
            style={{
              border: "1px solid #373a40",
              borderRadius: "4px",
              padding: "8px",
              textAlign: "center",
              transition: "all 0.2s",
              backgroundColor: "#25262b",
            }}
          >
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">{num}</Text>
              <Text size="xs" c="dimmed">{data.mass.toFixed(1)}</Text>
            </Group>
            <Text size="xl" fw={700} c="blue.4">{data.symbol}</Text>
            <Text size="xs" lineClamp={1}>{data.name}</Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Paper>
  );
}

