/**
 * ProjectTable - Dense table view with drag-to-reorder rows and inline editing
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { IconGripVertical, IconPlus, IconSettings, IconChevronRight, IconX } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { ProjectSettings } from "./ProjectSettings.jsx";
import { TaskDetailsPanel } from "./TaskDetailsPanel.jsx";
import { AssigneePicker } from "./AssigneePicker.jsx";

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

function CustomFieldCell({ field, value, onChange }) {
  if (field.type === "text") {
    return (
      <Text size="sm" c={value ? "inherit" : "dimmed"}>
        {value || "—"}
      </Text>
    );
  }

  if (field.type === "date") {
    return (
      <Text size="sm" c={value ? "inherit" : "dimmed"}>
        {value ? new Date(value).toLocaleDateString() : "—"}
      </Text>
    );
  }

  if (field.type === "dropdown") {
    if (!value) {
      return <Text size="sm" c="dimmed">—</Text>;
    }
    const option = field.options?.find((opt) => opt.value === value);
    if (!option) {
      return <Text size="sm" c="dimmed">—</Text>;
    }
    return (
      <Badge color={option.color} size="sm">
        {option.label}
      </Badge>
    );
  }

  return <Text size="sm" c="dimmed">—</Text>;
}

function TodoRow({ item, onUpdate, onDelete, onDragStart, onDragOver, onDrop, isDragging, onComplete, startInEditMode, onOpenDetails, customFields, users }) {
  const [title, setTitle] = useState(item.title);
  const [isEditingTitle, setIsEditingTitle] = useState(startInEditMode || false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTitle(item.title);
  }, [item.title]);

  // Focus input when starting in edit mode
  useEffect(() => {
    if (startInEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [startInEditMode]);

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== item.title) {
      await onUpdate(item.id, { title: title.trim() });
    } else if (!title.trim() && item.title) {
      // Revert if empty and had a previous title
      setTitle(item.title);
    } else if (!title.trim() && !item.title) {
      // Delete if empty and was newly created
      setTitle("New task");
      await onUpdate(item.id, { title: "New task" });
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
        <Group gap={4} wrap="nowrap" style={{ width: "100%" }}>
          <div style={{ flex: 1 }}>
        {isEditingTitle ? (
          <TextInput
                ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleBlur();
              if (e.key === "Escape") {
                    setTitle(item.title || "");
                setIsEditingTitle(false);
              }
            }}
                placeholder="New task"
            autoFocus
                size="sm"
            styles={{
              input: {
                border: "none",
                padding: 0,
                    height: "21px",
                    minHeight: "21px",
                    fontSize: "14px",
                    lineHeight: "21px",
              },
            }}
          />
        ) : (
          <Text
            size="sm"
            style={{
              cursor: "text",
              textDecoration: item.completed ? "line-through" : "none",
                  color: item.completed ? "#888" : item.title ? "inherit" : "#aaa",
                  lineHeight: "21px",
                  minHeight: "21px",
            }}
            onClick={() => setIsEditingTitle(true)}
          >
                {item.title || "New task"}
          </Text>
        )}
          </div>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(item);
            }}
            style={{
              opacity: 0.5,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.5";
            }}
          >
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
      <Table.Td style={{ width: 120 }}>
        <StatusBadge value={item.status} onChange={handleStatusChange} />
      </Table.Td>
      <Table.Td style={{ width: 120 }}>
        <PriorityBadge value={item.priority} onChange={handlePriorityChange} />
      </Table.Td>
      <Table.Td style={{ width: 180 }}>
        <AssigneePicker
          value={item.assigneeId || null}
          onChange={(userId) => onUpdate(item.id, { assigneeId: userId })}
        />
      </Table.Td>
      {/* Custom Fields */}
      {customFields?.filter(f => f.showInTable !== false).map((field) => (
        <Table.Td key={field.id} style={{ width: 150 }}>
          <CustomFieldCell
            field={field}
            value={item.customFieldValues?.[field.id]}
            onChange={(newValue) => onUpdate(item.id, {
              customFieldValues: {
                ...(item.customFieldValues || {}),
                [field.id]: newValue,
              },
            })}
          />
      </Table.Td>
      ))}
    </Table.Tr>
  );
}

/**
 * SectionDropZone - Drop zone that appears between sections for reordering
 */
function SectionDropZone({ onDrop, isFirst }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    // Only accept section drags (not task drags)
    if (e.dataTransfer.types.includes("application/x-section")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  return (
    <Box
      mt={isFirst ? 0 : "md"}
      mb="md"
      style={{
        height: isDragOver ? 40 : 8,
        backgroundColor: isDragOver ? "#e3f2fd" : "transparent",
        border: isDragOver ? "2px dashed #1976d2" : "2px dashed transparent",
        borderRadius: 4,
        transition: "all 0.15s",
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(e);
      }}
    />
  );
}

/**
 * SectionHeader - Renders a section with its header and tasks
 * Supports inline editing of section name, delete on hover, and drag to reorder
 */
function SectionHeader({ 
  section, 
  activeItems, 
  onAddTask, 
  onDropOnSection, 
  renderTaskTable,
  onRename,
  onDelete,
  isNewSection,
  onDragStart,
  isDragging,
}) {
  const [isDragOverSection, setIsDragOverSection] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(isNewSection || false);
  const [editName, setEditName] = useState(section.name);
  const inputRef = useRef(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveName = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== section.name) {
      onRename(section.id, trimmedName);
    } else {
      setEditName(section.name);
    }
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Delete section "${section.name}"? Tasks in this section will become unsectioned.`)) {
      onDelete(section.id);
    }
  };

  const handleSectionDragStart = (e) => {
    // Set a custom type so drop zones can identify section drags
    e.dataTransfer.setData("application/x-section", section.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(section);
  };

  return (
    <Box style={{ opacity: isDragging ? 0.5 : 1 }}>
      {/* Section Header */}
      <Paper
        p="sm"
        mb="xs"
        draggable={!isEditing}
        onDragStart={handleSectionDragStart}
        style={{
          backgroundColor: isDragOverSection ? "#e3f2fd" : "#f8f9fa",
          border: isDragOverSection ? "2px dashed #1976d2" : "1px solid #dee2e6",
          transition: "background-color 0.15s, border 0.15s",
          cursor: isEditing ? "default" : "grab",
        }}
        onDragOver={(e) => {
          // Only highlight for task drops, not section drops
          if (!e.dataTransfer.types.includes("application/x-section")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDragOverSection(true);
          }
        }}
        onDragLeave={() => setIsDragOverSection(false)}
        onDrop={(e) => {
          setIsDragOverSection(false);
          // Only handle task drops here
          if (!e.dataTransfer.types.includes("application/x-section")) {
            onDropOnSection(e, section.id);
          }
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
            <IconGripVertical 
              size={16} 
              style={{ 
                cursor: "grab", 
                flexShrink: 0,
                opacity: isHovering ? 1 : 0.3,
                transition: "opacity 0.15s",
              }} 
            />
            {isEditing ? (
              <TextInput
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setEditName(section.name);
                    setIsEditing(false);
                  }
                }}
                size="sm"
                styles={{
                  input: {
                    fontWeight: 600,
                    padding: "0 8px",
                    height: "28px",
                    minHeight: "28px",
                  },
                }}
                style={{ flex: 1, maxWidth: 300 }}
              />
            ) : (
              <Text 
                size="md" 
                fw={600} 
                style={{ cursor: "pointer" }}
                onClick={() => setIsEditing(true)}
              >
                {section.name}
              </Text>
            )}
            {isHovering && !isEditing && (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={handleDelete}
                title="Delete section"
              >
                <IconX size={14} />
              </ActionIcon>
            )}
          </Group>
          <Button 
            size="xs" 
            variant="subtle" 
            leftSection={<IconPlus size={14} />}
            onClick={onAddTask}
          >
            Add
          </Button>
        </Group>
      </Paper>
      
      {/* Section's active tasks */}
      {activeItems.length > 0 ? (
        renderTaskTable(activeItems, section.id)
      ) : (
        <Paper p="md" withBorder style={{ borderStyle: "dashed" }}>
          <Text size="sm" c="dimmed" ta="center">
            No tasks in this section
          </Text>
        </Paper>
      )}
    </Box>
  );
}

export function ProjectTable({ projectId }) {
  const { user } = useAuth();
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedSection, setDraggedSection] = useState(null);
  const [showUnicorn, setShowUnicorn] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [newlyCreatedItemId, setNewlyCreatedItemId] = useState(null);
  const [newlyCreatedSectionId, setNewlyCreatedSectionId] = useState(null);
  const [detailsPanelTask, setDetailsPanelTask] = useState(null);

  // Get project to access custom fields and sections
  const { data: project, update: updateProject } = useDocument(collections.projects, projectId);

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

  // Get sorted sections from project
  const sortedSections = useMemo(() => {
    const sections = project?.sections || [];
    return [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [project?.sections]);

  // Group items by section, then split into active and completed
  const { unsectionedActive, unsectionedCompleted, sectionedItems } = useMemo(() => {
    const active = todoItems.filter((item) => !item.completed);
    const completed = todoItems.filter((item) => item.completed);
    
    // Items with no section (null or undefined)
    const unsectionedActive = active
      .filter((item) => !item.sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const unsectionedCompleted = completed
      .filter((item) => !item.sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Group sectioned items by sectionId
    const sectionedItems = new Map();
    for (const section of sortedSections) {
      const sectionActive = active
        .filter((item) => item.sectionId === section.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const sectionCompleted = completed
        .filter((item) => item.sectionId === section.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      sectionedItems.set(section.id, { active: sectionActive, completed: sectionCompleted });
    }
    
    return { unsectionedActive, unsectionedCompleted, sectionedItems };
  }, [todoItems, sortedSections]);

  // Legacy: keep these for backward compatibility with existing drag logic
  const activeTodoItems = useMemo(() => {
    return todoItems.filter((item) => !item.completed).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [todoItems]);
  
  const completedTodoItems = useMemo(() => {
    return todoItems.filter((item) => item.completed).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [todoItems]);

  const handleAddTodo = async (sectionId = null) => {
    if (!user || !projectId) return;

    // Get items in the target section to find min order
    const targetItems = sectionId 
      ? (sectionedItems.get(sectionId)?.active || [])
      : unsectionedActive;

    // Find the minimum order value (we want new tasks at top)
    const minOrder = targetItems.length > 0
      ? Math.min(...targetItems.map((item) => item.order || 0))
      : 1;

    const newItemId = await add({
      projectId,
      sectionId: sectionId || null,
      title: "",
      description: "",
      completed: false,
      status: "todo",
      priority: "medium",
      order: minOrder - 1,
      owner: user.uid,
    });

    // Track this as newly created so it starts in edit mode
    setNewlyCreatedItemId(newItemId);
  };

  const triggerUnicornAnimation = () => {
    setShowUnicorn(true);
    setTimeout(() => setShowUnicorn(false), 2000);
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    // Set task data so it can be dropped onto projects in the sidebar
    e.dataTransfer.setData("application/json", JSON.stringify({
      taskId: item.id,
      sourceProjectId: projectId,
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetItem, targetSectionId) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const draggedSectionId = draggedItem.sectionId || null;
    const isMovingSection = draggedSectionId !== targetSectionId;

    // Get items in the target section
    const getItemsInSection = (secId, completed) => {
      if (completed) {
        return secId ? (sectionedItems.get(secId)?.completed || []) : unsectionedCompleted;
      }
      return secId ? (sectionedItems.get(secId)?.active || []) : unsectionedActive;
    };

    const targetItems = getItemsInSection(targetSectionId, targetItem.completed);
    const targetIndex = targetItems.findIndex((item) => item.id === targetItem.id);

    if (targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    if (isMovingSection) {
      // Moving to a different section - update sectionId and insert at target position
      const newOrder = targetIndex;
      await update(draggedItem.id, { 
        sectionId: targetSectionId, 
        order: newOrder - 0.5 // Place just before target
      });
    } else {
      // Same section - just reorder
      const sourceItems = getItemsInSection(draggedSectionId, draggedItem.completed);
      const draggedIndex = sourceItems.findIndex((item) => item.id === draggedItem.id);

      if (draggedIndex === -1) {
        setDraggedItem(null);
        return;
      }

      const reorderedItems = [...sourceItems];
      const [removed] = reorderedItems.splice(draggedIndex, 1);
      reorderedItems.splice(targetIndex, 0, removed);

      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        order: index,
      }));

      await Promise.all(
        updates.map((item) => update(item.id, { order: item.order }))
      );
    }

    setDraggedItem(null);
  };

  // Handle dropping on a section header (moves item to top of that section)
  const handleDropOnSection = async (e, sectionId) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const targetSectionId = sectionId || null;
    if (draggedItem.sectionId === targetSectionId) {
      setDraggedItem(null);
      return;
    }

    // Move to top of the section
    const targetItems = targetSectionId 
      ? (sectionedItems.get(targetSectionId)?.active || [])
      : unsectionedActive;
    
    const minOrder = targetItems.length > 0
      ? Math.min(...targetItems.map((item) => item.order || 0))
      : 1;

    await update(draggedItem.id, { 
      sectionId: targetSectionId, 
      order: minOrder - 1 
    });

    setDraggedItem(null);
  };

  // Section management functions
  const handleAddSection = async () => {
    if (!project) return;
    
    const sections = project.sections || [];
    const maxOrder = sections.length > 0 
      ? Math.max(...sections.map(s => s.order || 0)) 
      : -1;
    
    const newSectionId = `section_${Date.now()}`;
    const newSection = {
      id: newSectionId,
      name: "New Section",
      order: maxOrder + 1,
    };
    
    await updateProject({ sections: [...sections, newSection] });
    setNewlyCreatedSectionId(newSectionId);
  };

  const handleRenameSection = async (sectionId, newName) => {
    if (!project) return;
    
    const sections = project.sections || [];
    const updatedSections = sections.map(s => 
      s.id === sectionId ? { ...s, name: newName } : s
    );
    
    await updateProject({ sections: updatedSections });
    setNewlyCreatedSectionId(null);
  };

  const handleDeleteSection = async (sectionId) => {
    if (!project) return;
    
    const sections = project.sections || [];
    const updatedSections = sections.filter(s => s.id !== sectionId);
    
    await updateProject({ sections: updatedSections });
  };

  const handleSectionDragStart = (section) => {
    setDraggedSection(section);
  };

  const handleSectionDrop = async (targetIndex) => {
    if (!draggedSection || !project) {
      setDraggedSection(null);
      return;
    }

    const sections = project.sections || [];
    const draggedIndex = sortedSections.findIndex(s => s.id === draggedSection.id);
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedSection(null);
      return;
    }

    // Reorder sections
    const reordered = [...sortedSections];
    const [removed] = reordered.splice(draggedIndex, 1);
    
    // Adjust target index if dragging from before target
    const adjustedIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    reordered.splice(adjustedIndex, 0, removed);

    // Update order values
    const updatedSections = reordered.map((s, index) => ({ ...s, order: index }));
    
    await updateProject({ sections: updatedSections });
    setDraggedSection(null);
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
      {/* Task Details Panel */}
      <TaskDetailsPanel
        opened={!!detailsPanelTask}
        onClose={() => setDetailsPanelTask(null)}
        task={detailsPanelTask}
        onUpdate={update}
        onDelete={remove}
        customFields={project?.customFields || []}
      />

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
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleAddTodo(null)}>
            Add Task
          </Button>
          <Button 
            leftSection={<IconPlus size={16} />} 
            variant="light"
            onClick={handleAddSection}
          >
            Add Section
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

      {/* Helper function to render a task table */}
      {(() => {
        const renderTaskTable = (items, sectionId) => {
          if (items.length === 0) return null;
          return (
            <Box style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 30 }}></Table.Th>
                    <Table.Th style={{ width: 40 }}>Done</Table.Th>
                    <Table.Th style={{ minWidth: 250 }}>Task</Table.Th>
                    <Table.Th style={{ width: 120 }}>Status</Table.Th>
                    <Table.Th style={{ width: 120 }}>Priority</Table.Th>
                    <Table.Th style={{ width: 180 }}>Assignee</Table.Th>
                    {project?.customFields?.filter(f => f.showInTable !== false).map((field) => (
                      <Table.Th key={field.id} style={{ width: 150 }}>
                        {field.name}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item) => (
                    <TodoRow
                      key={item.id}
                      item={item}
                      onUpdate={update}
                      onDelete={remove}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={(e, target) => handleDrop(e, target, sectionId)}
                      isDragging={draggedItem?.id === item.id}
                      onComplete={triggerUnicornAnimation}
                      startInEditMode={item.id === newlyCreatedItemId}
                      onOpenDetails={setDetailsPanelTask}
                      customFields={project?.customFields}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          );
        };

        const hasTasks = activeTodoItems.length > 0;
        const hasSections = sortedSections.length > 0;

        return (
          <>
            {/* No tasks message */}
            {!hasTasks && (
              <Paper p="xl" withBorder>
                <Text size="lg" c="dimmed" ta="center">
                  No tasks yet. Click "Add Task" to create one!
                </Text>
              </Paper>
            )}

            {/* Unsectioned active tasks (shown first, no header) */}
            {unsectionedActive.length > 0 && renderTaskTable(unsectionedActive, null)}

            {/* Sections with their tasks */}
            {sortedSections.length > 0 && (
              <>
                {/* Drop zone before first section */}
                <SectionDropZone 
                  isFirst={unsectionedActive.length === 0}
                  onDrop={() => handleSectionDrop(0)} 
                />
                
                {sortedSections.map((section, index) => {
                  const sectionItems = sectionedItems.get(section.id);
                  const activeItems = sectionItems?.active || [];

                  return (
                    <React.Fragment key={section.id}>
                      <SectionHeader
                        section={section}
                        activeItems={activeItems}
                        onAddTask={() => handleAddTodo(section.id)}
                        onDropOnSection={handleDropOnSection}
                        renderTaskTable={renderTaskTable}
                        onRename={handleRenameSection}
                        onDelete={handleDeleteSection}
                        isNewSection={section.id === newlyCreatedSectionId}
                        onDragStart={handleSectionDragStart}
                        isDragging={draggedSection?.id === section.id}
                      />
                      {/* Drop zone after each section */}
                      <SectionDropZone 
                        onDrop={() => handleSectionDrop(index + 1)} 
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}

            {/* Completed Tasks (all at bottom) */}
            {completedTodoItems.length > 0 && (
              <Box mt="xl">
                <Text size="lg" fw={600} mb="xs">
                  Completed
                </Text>
                {renderTaskTable(completedTodoItems, null)}
              </Box>
            )}
          </>
        );
      })()}
    </Stack>
  );
}

