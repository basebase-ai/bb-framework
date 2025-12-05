/**
 * ProjectManager - Shows list of projects and allows creating new ones
 */

import React, { useState, useMemo } from "react";
import { 
  Stack, 
  Button, 
  TextInput, 
  Modal, 
  Group,
  Text,
  Paper,
  Divider
} from "@mantine/core";
import { IconPlus, IconUser } from "@tabler/icons-react";

// Special view ID for "Assigned to Me"
export const ASSIGNED_TO_ME_VIEW = "__assigned_to_me__";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * Individual project item that can receive dropped tasks
 */
function ProjectItem({ project, isSelected, onSelect, onMoveTask }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      
      const { taskId, sourceProjectId } = JSON.parse(data);
      
      // Don't move if dropping on the same project
      if (sourceProjectId === project.id) return;
      
      onMoveTask(taskId, project.id);
    } catch (err) {
      console.error("Error handling drop:", err);
    }
  };

  return (
    <Paper
      p="xs"
      withBorder
      style={{
        cursor: "pointer",
        backgroundColor: isDragOver 
          ? "#e3f2fd" 
          : isSelected 
            ? "#f0f0f0" 
            : "transparent",
        border: isDragOver ? "2px dashed #1976d2" : undefined,
        transition: "background-color 0.15s, border 0.15s",
      }}
      onClick={() => onSelect(project.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Text size="sm" truncate>
        {project.name}
      </Text>
    </Paper>
  );
}

export function ProjectManager({ onSelectProject, selectedProjectId, onMoveTask }) {
  const { user } = useAuth();
  const [opened, setOpened] = useState(false);
  const [projectName, setProjectName] = useState("");
  
  // Memoize the where clause to prevent infinite re-renders
  const whereClause = useMemo(() => {
    return user ? [["memberIds", "array-contains", user.uid]] : [["memberIds", "array-contains", "__none__"]];
  }, [user?.uid]);
  
  const { 
    data: projects, 
    loading, 
    add 
  } = useCollection(collections.projects, {
    where: whereClause,
  });

  // Sort projects client-side to avoid needing a composite index
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime; // desc order
    });
  }, [projects]);

  const handleCreateProject = async () => {
    if (!projectName.trim() || !user) return;
    
    try {
      const newProject = await add({
        name: projectName,
        memberIds: [user.uid],
        owner: user.uid,
      });
      setProjectName("");
      setOpened(false);
      
      // Automatically select the newly created project
      if (newProject?.id) {
        onSelectProject(newProject.id);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  if (!user) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          Please sign in to view projects
        </Text>
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="md">
        {/* Assigned to Me - prominent tab */}
        <Paper
          p="sm"
          withBorder
          style={{
            cursor: "pointer",
            backgroundColor: selectedProjectId === ASSIGNED_TO_ME_VIEW 
              ? "#e3f2fd" 
              : "transparent",
            borderColor: selectedProjectId === ASSIGNED_TO_ME_VIEW 
              ? "#1976d2" 
              : undefined,
          }}
          onClick={() => onSelectProject(ASSIGNED_TO_ME_VIEW)}
        >
          <Group gap="xs">
            <IconUser size={18} color="#1976d2" />
            <Text size="sm" fw={600} c="#1976d2">
              Assigned to Me
            </Text>
          </Group>
        </Paper>

        <Divider />

        <Text size="sm" fw={500}>
          Projects
        </Text>

        <Button 
          leftSection={<IconPlus size={16} />}
          onClick={() => setOpened(true)}
          fullWidth
          variant="light"
        >
          New Project
        </Button>

        {loading && (
          <Text size="sm" c="dimmed">
            Loading projects...
          </Text>
        )}

        {!loading && sortedProjects.length === 0 && (
          <Paper p="sm" withBorder>
            <Text size="sm" c="dimmed" ta="center">
              No projects yet.
              <br />
              Click "New Project" to create one!
            </Text>
          </Paper>
        )}

        {sortedProjects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onSelect={onSelectProject}
            onMoveTask={onMoveTask}
          />
        ))}
      </Stack>

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setProjectName("");
        }}
        title="Create New Project"
        size="sm"
      >
        <Stack>
          <TextInput
            label="Project Name"
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateProject();
              }
            }}
            autoFocus
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setOpened(false);
                setProjectName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={!projectName.trim()}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

