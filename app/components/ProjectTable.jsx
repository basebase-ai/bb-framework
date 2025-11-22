/**
 * ProjectTable - Dense table view with drag-to-reorder rows and inline editing
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  TextInput,
  Checkbox,
  Stack,
  Group,
  Badge,
  Menu,
  ActionIcon,
  Text,
  Paper,
  Box,
} from "@mantine/core";
import { IconGripVertical, IconPlus, IconTrash, IconDots, IconSettings } from "@tabler/icons-react";
import { useCollection } from "../../framework/hooks/useCollection.js";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { ProjectSettings } from "./ProjectSettings.jsx";

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

function StatusBadge({ value, onChange }) {
  return (
    <Menu position="bottom-start" withinPortal>
      <Menu.Target>
        <Badge
          color={STATUS_CONFIG[value]?.color || "gray"}
          style={{ cursor: "pointer" }}
          size="sm"
        >
          {STATUS_CONFIG[value]?.label || value}
        </Badge>
      </Menu.Target>
      <Menu.Dropdown>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Menu.Item
            key={key}
            onClick={() => onChange(key)}
            leftSection={
              <Badge color={config.color} size="xs">
                {config.label}
              </Badge>
            }
          >
            {config.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function PriorityBadge({ value, onChange }) {
  return (
    <Menu position="bottom-start" withinPortal>
      <Menu.Target>
        <Badge
          color={PRIORITY_CONFIG[value]?.color || "gray"}
          style={{ cursor: "pointer" }}
          size="sm"
          variant="light"
        >
          {PRIORITY_CONFIG[value]?.label || value}
        </Badge>
      </Menu.Target>
      <Menu.Dropdown>
        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
          <Menu.Item
            key={key}
            onClick={() => onChange(key)}
            leftSection={
              <Badge color={config.color} size="xs" variant="light">
                {config.label}
              </Badge>
            }
          >
            {config.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function TodoRow({ item, onUpdate, onDelete, onDragStart, onDragOver, onDrop, isDragging, onComplete }) {
  const [title, setTitle] = useState(item.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    setTitle(item.title);
  }, [item.title]);

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== item.title) {
      await onUpdate(item.id, { title: title.trim() });
    } else {
      setTitle(item.title); // Revert if empty
    }
  };

  const handleStatusChange = async (newStatus) => {
    await onUpdate(item.id, { status: newStatus });
  };

  const handlePriorityChange = async (newPriority) => {
    await onUpdate(item.id, { priority: newPriority });
  };

  const handleCompletedChange = async (checked) => {
    if (checked && !item.completed) {
      // Trigger unicorn animation when completing a task
      onComplete?.();
    }
    await onUpdate(item.id, { completed: checked });
  };

  return (
    <Table.Tr
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, item)}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
        backgroundColor: isDragging ? "#f5f5f5" : "transparent",
      }}
    >
      <Table.Td style={{ width: 30 }}>
        <IconGripVertical size={16} style={{ cursor: "grab" }} />
      </Table.Td>
      <Table.Td style={{ width: 40 }}>
        <Checkbox
          checked={item.completed}
          onChange={(e) => handleCompletedChange(e.currentTarget.checked)}
        />
      </Table.Td>
      <Table.Td style={{ minWidth: 250 }}>
        {isEditingTitle ? (
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleBlur();
              if (e.key === "Escape") {
                setTitle(item.title);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
            size="xs"
            styles={{
              input: {
                border: "none",
                padding: 0,
                height: "auto",
              },
            }}
          />
        ) : (
          <Text
            size="sm"
            style={{
              cursor: "text",
              textDecoration: item.completed ? "line-through" : "none",
              color: item.completed ? "#888" : "inherit",
            }}
            onClick={() => setIsEditingTitle(true)}
          >
            {item.title}
          </Text>
        )}
      </Table.Td>
      <Table.Td style={{ width: 120 }}>
        <StatusBadge value={item.status} onChange={handleStatusChange} />
      </Table.Td>
      <Table.Td style={{ width: 120 }}>
        <PriorityBadge value={item.priority} onChange={handlePriorityChange} />
      </Table.Td>
      <Table.Td style={{ width: 40 }}>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => onDelete(item.id)}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  );
}

export function ProjectTable({ projectId }) {
  const { user } = useAuth();
  const [draggedItem, setDraggedItem] = useState(null);
  const [showUnicorn, setShowUnicorn] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);

  // Memoize the where clause to prevent infinite re-renders
  const whereClause = useMemo(() => {
    return projectId ? [["projectId", "==", projectId]] : [["projectId", "==", "__none__"]];
  }, [projectId]);

  const {
    data: todoItems,
    loading,
    add,
    update,
    remove,
  } = useCollection(collections.todoItems, {
    where: whereClause,
  });

  // Split into active and completed, then sort each
  const { activeTodoItems, completedTodoItems } = useMemo(() => {
    const active = todoItems.filter((item) => !item.completed);
    const completed = todoItems.filter((item) => item.completed);
    
    return {
      activeTodoItems: active.sort((a, b) => (a.order || 0) - (b.order || 0)),
      completedTodoItems: completed.sort((a, b) => (a.order || 0) - (b.order || 0)),
    };
  }, [todoItems]);

  const handleAddTodo = async () => {
    if (!user || !projectId) return;

    const maxOrder = activeTodoItems.length > 0
      ? Math.max(...activeTodoItems.map((item) => item.order || 0))
      : 0;

    await add({
      projectId,
      title: "New task",
      description: "",
      completed: false,
      status: "todo",
      priority: "medium",
      order: maxOrder + 1,
      owner: user.uid,
    });
  };

  const triggerUnicornAnimation = () => {
    setShowUnicorn(true);
    setTimeout(() => setShowUnicorn(false), 2000);
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetItem, isCompletedSection) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    // Get the items from the appropriate section
    const itemsInSection = isCompletedSection ? completedTodoItems : activeTodoItems;
    
    const draggedIndex = itemsInSection.findIndex((item) => item.id === draggedItem.id);
    const targetIndex = itemsInSection.findIndex((item) => item.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder items
    const reorderedItems = [...itemsInSection];
    const [removed] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, removed);

    // Update order values for all affected items
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      order: index,
    }));

    // Update all items with new order
    await Promise.all(
      updates.map((item) => update(item.id, { order: item.order }))
    );

    setDraggedItem(null);
  };

  if (!projectId) {
    return (
      <Paper p="xl" withBorder>
        <Text size="lg" c="dimmed" ta="center">
          Select a project from the sidebar to view its tasks
        </Text>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Paper p="xl" withBorder>
        <Text size="lg" c="dimmed" ta="center">
          Loading tasks...
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md" style={{ position: "relative" }}>
      {/* Unicorn animation */}
      {showUnicorn && (
        <div
          style={{
            position: "fixed",
            bottom: "-50px",
            left: "-50px",
            fontSize: "60px",
            animation: "unicornFly 2s ease-out forwards",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          🦄
        </div>
      )}
      
      <style>
        {`
          @keyframes unicornFly {
            0% {
              bottom: -50px;
              left: -50px;
              transform: rotate(0deg);
            }
            100% {
              bottom: calc(100vh + 50px);
              left: calc(100vw + 50px);
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      {/* Project Settings Modal */}
      {projectId && (
        <ProjectSettings
          projectId={projectId}
          opened={settingsOpened}
          onClose={() => setSettingsOpened(false)}
        />
      )}

      <Group justify="space-between">
        <Group gap="xs">
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddTodo}>
            Add Task
          </Button>
          <ActionIcon
            size="lg"
            variant="light"
            onClick={() => setSettingsOpened(true)}
            title="Project Settings"
          >
            <IconSettings size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Active Tasks */}
      {activeTodoItems.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text size="lg" c="dimmed" ta="center">
            No tasks yet. Click "Add Task" to create one!
          </Text>
        </Paper>
      ) : (
        <Box style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 30 }}></Table.Th>
                <Table.Th style={{ width: 40 }}>Done</Table.Th>
                <Table.Th style={{ minWidth: 250 }}>Task</Table.Th>
                <Table.Th style={{ width: 120 }}>Status</Table.Th>
                <Table.Th style={{ width: 120 }}>Priority</Table.Th>
                <Table.Th style={{ width: 40 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeTodoItems.map((item) => (
                <TodoRow
                  key={item.id}
                  item={item}
                  onUpdate={update}
                  onDelete={remove}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={(e, target) => handleDrop(e, target, false)}
                  isDragging={draggedItem?.id === item.id}
                  onComplete={triggerUnicornAnimation}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}

      {/* Completed Tasks */}
      {completedTodoItems.length > 0 && (
        <>
          <Text size="lg" fw={600} mt="xl">
            Completed
          </Text>
          <Box style={{ overflowX: "auto" }}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 30 }}></Table.Th>
                  <Table.Th style={{ width: 40 }}>Done</Table.Th>
                  <Table.Th style={{ minWidth: 250 }}>Task</Table.Th>
                  <Table.Th style={{ width: 120 }}>Status</Table.Th>
                  <Table.Th style={{ width: 120 }}>Priority</Table.Th>
                  <Table.Th style={{ width: 40 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {completedTodoItems.map((item) => (
                  <TodoRow
                    key={item.id}
                    item={item}
                    onUpdate={update}
                    onDelete={remove}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={(e, target) => handleDrop(e, target, true)}
                    isDragging={draggedItem?.id === item.id}
                    onComplete={triggerUnicornAnimation}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </>
      )}
    </Stack>
  );
}

