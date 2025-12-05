/**
 * AssignedToMeView - Shows all tasks assigned to the current user across all projects
 */

import React, { useState, useMemo } from "react";
import {
  Table,
  Text,
  Paper,
  Box,
  Stack,
  Badge,
  Checkbox,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { TaskDetailsPanel } from "./TaskDetailsPanel.jsx";

const STATUS_CONFIG = {
  backlog: { color: "gray", label: "Backlog" },
  todo: { color: "blue", label: "To Do" },
  "in-progress": { color: "yellow", label: "In Progress" },
  done: { color: "green", label: "Done" },
};

const PRIORITY_CONFIG = {
  low: { color: "gray", label: "Low" },
  medium: { color: "blue", label: "Medium" },
  high: { color: "orange", label: "High" },
  urgent: { color: "red", label: "Urgent" },
};

export function AssignedToMeView() {
  const { user } = useAuth();
  const [detailsPanelTask, setDetailsPanelTask] = useState(null);

  // Query for all tasks assigned to the current user
  const whereClause = useMemo(() => {
    return user ? [["assigneeId", "==", user.uid]] : [["assigneeId", "==", "__none__"]];
  }, [user?.uid]);

  const {
    data: assignedItems,
    loading,
    update,
    remove,
  } = useCollection(collections.todoItems, {
    where: whereClause,
  });

  // Get all projects to show project names
  const projectWhereClause = useMemo(() => {
    return user ? [["memberIds", "array-contains", user.uid]] : [["memberIds", "array-contains", "__none__"]];
  }, [user?.uid]);

  const { data: projects } = useCollection(collections.projects, {
    where: projectWhereClause,
  });

  // Create a map of project IDs to names
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  // Split into active and completed, then sort
  const { activeItems, completedItems } = useMemo(() => {
    const active = assignedItems
      .filter((item) => !item.completed)
      .sort((a, b) => {
        // Sort by priority (urgent first), then by creation date
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority] ?? 2;
        const bPriority = priorityOrder[b.priority] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
    
    const completed = assignedItems
      .filter((item) => item.completed)
      .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    
    return { activeItems: active, completedItems: completed };
  }, [assignedItems]);

  const handleCompletedChange = async (itemId, checked) => {
    await update(itemId, { completed: checked });
  };

  if (!user) {
    return (
      <Paper p="xl" withBorder>
        <Text size="lg" c="dimmed" ta="center">
          Please sign in to view your assigned tasks
        </Text>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Paper p="xl" withBorder>
        <Text size="lg" c="dimmed" ta="center">
          Loading your tasks...
        </Text>
      </Paper>
    );
  }

  const renderTable = (items, showCompleted = false) => {
    if (items.length === 0) return null;

    return (
      <Box style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}>Done</Table.Th>
              <Table.Th style={{ minWidth: 250 }}>Task</Table.Th>
              <Table.Th style={{ width: 150 }}>Project</Table.Th>
              <Table.Th style={{ width: 120 }}>Status</Table.Th>
              <Table.Th style={{ width: 120 }}>Priority</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => {
              const project = projectMap.get(item.projectId);
              return (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Checkbox
                      checked={item.completed}
                      onChange={(e) => handleCompletedChange(item.id, e.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Text
                        size="sm"
                        style={{
                          flex: 1,
                          textDecoration: item.completed ? "line-through" : "none",
                          color: item.completed ? "#888" : "inherit",
                        }}
                      >
                        {item.title || "Untitled"}
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => setDetailsPanelTask(item)}
                        style={{ opacity: 0.5 }}
                      >
                        <IconChevronRight size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray" size="sm">
                      {project?.name || "Unknown"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={STATUS_CONFIG[item.status]?.color || "gray"}
                      size="sm"
                    >
                      {STATUS_CONFIG[item.status]?.label || item.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={PRIORITY_CONFIG[item.priority]?.color || "gray"}
                      size="sm"
                      variant="light"
                    >
                      {PRIORITY_CONFIG[item.priority]?.label || item.priority}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    );
  };

  return (
    <Stack gap="md">
      {/* Task Details Panel */}
      <TaskDetailsPanel
        opened={!!detailsPanelTask}
        onClose={() => setDetailsPanelTask(null)}
        task={detailsPanelTask}
        onUpdate={update}
        onDelete={remove}
        customFields={[]}
      />

      <Text size="xl" fw={600}>
        Assigned to Me
      </Text>

      {activeItems.length === 0 && completedItems.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text size="lg" c="dimmed" ta="center">
            No tasks assigned to you yet!
          </Text>
        </Paper>
      ) : (
        <>
          {activeItems.length > 0 && (
            <>
              <Text size="sm" c="dimmed">
                {activeItems.length} active task{activeItems.length !== 1 ? "s" : ""}
              </Text>
              {renderTable(activeItems)}
            </>
          )}

          {completedItems.length > 0 && (
            <Box mt="xl">
              <Text size="lg" fw={600} mb="xs">
                Completed
              </Text>
              {renderTable(completedItems, true)}
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}
