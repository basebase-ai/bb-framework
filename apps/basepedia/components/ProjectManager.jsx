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
  Paper
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

export function ProjectManager({ onSelectProject, selectedProjectId }) {
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
          <Paper
            key={project.id}
            p="xs"
            withBorder
            style={{
              cursor: "pointer",
              backgroundColor: selectedProjectId === project.id ? "#f0f0f0" : "transparent",
            }}
            onClick={() => onSelectProject(project.id)}
          >
            <Text size="sm" truncate>
              {project.name}
            </Text>
          </Paper>
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

