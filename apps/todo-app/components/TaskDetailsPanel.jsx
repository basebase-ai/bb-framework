/**
 * TaskDetailsPanel - Slide-out panel for editing task details
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
  Select,
  ActionIcon,
  Badge,
  Divider,
  Menu,
  Paper,
  Image,
} from "@mantine/core";
import { IconCheck, IconTrash, IconDots, IconFile, IconDownload, IconX } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { FileUploader } from "../../../framework/components/FileUploader.jsx";
import { TaskComments } from "./TaskComments.jsx";
import { AssigneePicker } from "./AssigneePicker.jsx";
import { APP_ID } from "../schema.js";

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function TaskDetailsPanel({ opened, onClose, task, onUpdate, onDelete, customFields }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState(null);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  
  const { upload, uploading, progress, deleteFile: deleteStorageFile } = useStorage(APP_ID);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setAssigneeId(task.assigneeId || null);
      setCustomFieldValues(task.customFieldValues || {});
      setAttachments(task.attachments || []);
    }
  }, [task]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced autosave
  const debouncedSave = (updates) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!task || Object.keys(updates).length === 0) return;
      
      setIsSaving(true);
      try {
        await onUpdate(task.id, updates);
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        setIsSaving(false);
      }
    }, 500); // 500ms debounce
  };

  const handleDelete = async () => {
    if (!task) return;
    
    if (confirm(`Are you sure you want to delete "${task.title || 'this task'}"?`)) {
      await onDelete(task.id);
      onClose();
    }
  };

  const handleMarkComplete = async () => {
    if (!task) return;
    await onUpdate(task.id, { completed: !task.completed });
  };

  // Autosave on field changes
  useEffect(() => {
    if (!task) return;
    
    const updates = {};
    if (title !== (task.title || "")) updates.title = title;
    if (description !== (task.description || "")) updates.description = description;
    if (status !== (task.status || "todo")) updates.status = status;
    if (priority !== (task.priority || "medium")) updates.priority = priority;
    if (assigneeId !== (task.assigneeId || null)) updates.assigneeId = assigneeId;
    
    const taskCustomFieldValues = task.customFieldValues || {};
    if (JSON.stringify(customFieldValues) !== JSON.stringify(taskCustomFieldValues)) {
      updates.customFieldValues = customFieldValues;
    }

    if (Object.keys(updates).length > 0) {
      debouncedSave(updates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, status, priority, assigneeId, customFieldValues]);

  const handleCustomFieldChange = (fieldId, value) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleFileUpload = async (file) => {
    if (!task) return;

    try {
      // Upload file to storage with task ID in path
      const path = `tasks/${task.id}/${Date.now()}_${file.name}`;
      const result = await upload(file, path);

      // Add attachment to task
      const newAttachment = {
        url: result.url,
        name: file.name,
        path: result.path,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const updatedAttachments = [...(task.attachments || []), newAttachment];
      await onUpdate(task.id, { attachments: updatedAttachments });
      setAttachments(updatedAttachments);
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Failed to upload file. Please try again.");
    }
  };

  const handleDeleteAttachment = async (attachment, index) => {
    if (!task) return;

    if (!confirm(`Are you sure you want to delete "${attachment.name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      await deleteStorageFile(attachment.path);

      // Remove from task
      const updatedAttachments = attachments.filter((_, i) => i !== index);
      await onUpdate(task.id, { attachments: updatedAttachments });
      setAttachments(updatedAttachments);
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      alert("Failed to delete attachment. Please try again.");
    }
  };

  const isImage = (type) => {
    return type?.startsWith("image/");
  };

  if (!task) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      title={
        <Group justify="space-between" style={{ width: "100%" }}>
          <Text size="lg" fw={500}>Task Details</Text>
          <Group gap="xs">
            {isSaving && <Text size="xs" c="dimmed">Saving...</Text>}
            <Button
              size="xs"
              variant={task?.completed ? "light" : "filled"}
              color={task?.completed ? "gray" : "green"}
              leftSection={<IconCheck size={14} />}
              onClick={handleMarkComplete}
            >
              {task?.completed ? "Mark Incomplete" : "Mark Complete"}
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleDelete}
                >
                  Delete Task
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      }
      styles={{
        body: { padding: 0 },
        header: { padding: "16px 24px" },
      }}
    >
      <Stack gap="lg" p="md" style={{ height: "calc(100vh - 80px)", overflow: "auto" }}>
        {/* Title */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Task Name
          </Text>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task name"
            size="md"
          />
        </div>

        {/* Status */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Status
          </Text>
          <Select
            value={status}
            onChange={(value) => setStatus(value || "todo")}
            data={STATUS_OPTIONS}
            size="sm"
          />
        </div>

        {/* Priority */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Priority
          </Text>
          <Select
            value={priority}
            onChange={(value) => setPriority(value || "medium")}
            data={PRIORITY_OPTIONS}
            size="sm"
          />
        </div>

        {/* Assignee */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Assignee
          </Text>
          <AssigneePicker
            value={assigneeId}
            onChange={setAssigneeId}
          />
        </div>

        {/* Custom Fields */}
        {customFields && customFields.length > 0 && (
          <>
            <Divider />
            <div>
              <Text size="sm" fw={500} mb="xs">
                Custom Fields
              </Text>
              <Stack gap="md">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <Text size="sm" fw={500} mb="xs">
                      {field.name}
                    </Text>
                    {field.type === "text" && (
                      <TextInput
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                        size="sm"
                      />
                    )}
                    {field.type === "date" && (
                      <DateInput
                        value={customFieldValues[field.id] ? new Date(customFieldValues[field.id]) : null}
                        onChange={(date) => handleCustomFieldChange(field.id, date ? date.toISOString() : "")}
                        placeholder={`Select ${field.name.toLowerCase()}`}
                        size="sm"
                        clearable
                      />
                    )}
                    {field.type === "dropdown" && (
                      <Select
                        value={customFieldValues[field.id] || null}
                        onChange={(value) => handleCustomFieldChange(field.id, value || "")}
                        data={field.options?.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                        })) || []}
                        placeholder={`Select ${field.name.toLowerCase()}`}
                        size="sm"
                        clearable
                        renderOption={({ option }) => {
                          const opt = field.options?.find((o) => o.value === option.value);
                          return (
                            <Badge color={opt?.color} variant="light">
                              {option.label}
                            </Badge>
                          );
                        }}
                      />
                    )}
                  </div>
                ))}
              </Stack>
            </div>
          </>
        )}

        <Divider />

        {/* Description */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Description
          </Text>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            minRows={6}
            autosize
            maxRows={15}
          />
        </div>

        <Divider />

        {/* Attachments */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Attachments
          </Text>
          
          {attachments.length > 0 && (
            <Stack gap="xs" mb="md">
              {attachments.map((attachment, index) => (
                <Paper key={index} p="sm" withBorder>
                  <Group justify="space-between">
                    <Group gap="sm">
                      {isImage(attachment.type) ? (
                        <Image
                          src={attachment.url}
                          alt={attachment.name}
                          width={40}
                          height={40}
                          fit="cover"
                          radius="sm"
                        />
                      ) : (
                        <IconFile size={24} />
                      )}
                      <div>
                        <Text size="sm">{attachment.name}</Text>
                        <Text size="xs" c="dimmed">
                          {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : "Unknown size"}
                        </Text>
                      </div>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon
                        component="a"
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="subtle"
                        size="sm"
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment, index)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}

          <FileUploader
            onUpload={handleFileUpload}
            uploading={uploading}
            progress={progress}
            maxSize={10 * 1024 * 1024} // 10MB
            accept="*"
            multiple={false}
            preview={false}
          />
        </div>

        <Divider />

        {/* Comments */}
        <TaskComments task={task} onUpdateTask={onUpdate} />

        <Divider />

        {/* Metadata */}
        <div>
          <Text size="xs" c="dimmed">
            Created: {task.createdAt?.toDate ? new Date(task.createdAt.toDate()).toLocaleString() : "Unknown"}
          </Text>
          {task.updatedAt && (
            <Text size="xs" c="dimmed">
              Updated: {task.updatedAt?.toDate ? new Date(task.updatedAt.toDate()).toLocaleString() : "Unknown"}
            </Text>
          )}
        </div>
      </Stack>
    </Drawer>
  );
}

