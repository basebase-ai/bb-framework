/**
 * Activities - Task and activity management
 */

import React, { useState } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  Badge,
  Modal,
  TextInput,
  Select,
  Textarea,
  Checkbox,
  ActionIcon,
  Menu,
  Card,
  SimpleGrid,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconDots, IconCheck } from "@tabler/icons-react";
import { DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

const ACTIVITY_TYPES = [
  { value: "call", label: "Call", color: "blue" },
  { value: "email", label: "Email", color: "cyan" },
  { value: "meeting", label: "Meeting", color: "grape" },
  { value: "task", label: "Task", color: "orange" },
  { value: "note", label: "Note", color: "gray" },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned", color: "yellow" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "cancelled", label: "Cancelled", color: "red" },
];

/**
 * @typedef {Object} ActivitiesProps
 * @property {string | null} orgId - Organization ID to scope data
 */

/**
 * @param {ActivitiesProps} props
 */
export function Activities({ orgId }) {
  const { user, loading: authLoading } = useAuth();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Query by organization ID
  const { data: activitiesRaw, loading, add, update, remove } = useCollection(
    collections.activities,
    {
      where: [["orgId", "==", orgId || ""]],
      realtime: !!orgId,
    }
  );

  // Sort client-side by dueDate ascending
  const activities = React.useMemo(() => {
    return [...(activitiesRaw || [])].sort((a, b) => {
      const aTime = a.dueDate?.seconds || 0;
      const bTime = b.dueDate?.seconds || 0;
      return aTime - bTime; // asc order (earliest first)
    });
  }, [activitiesRaw]);

  const [formData, setFormData] = useState({
    type: "task",
    subject: "",
    description: "",
    status: "planned",
    dueDate: null,
  });

  const handleOpenModal = (activity = null) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        type: activity.type || "task",
        subject: activity.subject || "",
        description: activity.description || "",
        status: activity.status || "planned",
        dueDate: activity.dueDate?.toDate ? activity.dueDate.toDate() : null,
      });
    } else {
      setEditingActivity(null);
      setFormData({
        type: "task",
        subject: "",
        description: "",
        status: "planned",
        dueDate: new Date(),
      });
    }
    setModalOpened(true);
  };

  const handleSubmit = async () => {
    if (!formData.subject) {
      notifications.show({
        title: "Error",
        message: "Subject is required",
        color: "red",
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        dueDate: formData.dueDate || null,
      };

      if (editingActivity) {
        await update(editingActivity.id, dataToSave);
        notifications.show({
          title: "Success",
          message: "Activity updated successfully",
          color: "green",
        });
      } else {
        await add({
          ...dataToSave,
          orgId,
          owner: user.uid,
        });
        notifications.show({
          title: "Success",
          message: "Activity created successfully",
          color: "green",
        });
      }
      setModalOpened(false);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  const handleDelete = async (activityId) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      try {
        await remove(activityId);
        notifications.show({
          title: "Success",
          message: "Activity deleted successfully",
          color: "green",
        });
      } catch (error) {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      }
    }
  };

  const handleToggleComplete = async (activity) => {
    const newStatus = activity.status === "completed" ? "planned" : "completed";
    try {
      await update(activity.id, {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date() : null,
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  const filteredActivities = filterStatus === "all"
    ? activities
    : activities.filter(a => a.status === filterStatus);

  const getTypeBadge = (type) => {
    const typeConfig = ACTIVITY_TYPES.find(t => t.value === type);
    return (
      <Badge color={typeConfig?.color || "gray"} variant="light" size="sm">
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge color={statusConfig?.color || "gray"} variant="dot" size="sm">
        {statusConfig?.label || status}
      </Badge>
    );
  };

  if (authLoading || (loading && !user)) {
    return (
      <Paper p="xl" withBorder>
        <Text ta="center" c="dimmed">Loading activities...</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Activities</Title>
          <Text size="sm" c="dimmed">
            Manage your tasks and activities
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Add Activity
        </Button>
      </Group>

      {/* Filter by status */}
      <Group gap="xs">
        <Button
          variant={filterStatus === "all" ? "filled" : "light"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          All ({activities.length})
        </Button>
        {STATUS_OPTIONS.map(status => {
          const count = activities.filter(a => a.status === status.value).length;
          return (
            <Button
              key={status.value}
              variant={filterStatus === status.value ? "filled" : "light"}
              size="sm"
              color={status.color}
              onClick={() => setFilterStatus(status.value)}
            >
              {status.label} ({count})
            </Button>
          );
        })}
      </Group>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            {filterStatus === "all"
              ? "No activities yet. Click 'Add Activity' to create one!"
              : `No ${filterStatus} activities found.`}
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} p="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Group gap="xs" style={{ flex: 1 }}>
                    <Checkbox
                      checked={activity.status === "completed"}
                      onChange={() => handleToggleComplete(activity)}
                      size="sm"
                    />
                    <div style={{ flex: 1 }}>
                      <Text
                        size="sm"
                        fw={500}
                        td={activity.status === "completed" ? "line-through" : "none"}
                        c={activity.status === "completed" ? "dimmed" : undefined}
                      >
                        {activity.subject}
                      </Text>
                    </div>
                  </Group>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm">
                        <IconDots size={14} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => handleOpenModal(activity)}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCheck size={14} />}
                        onClick={() => handleToggleComplete(activity)}
                      >
                        {activity.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleDelete(activity.id)}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Group gap="xs">
                  {getTypeBadge(activity.type)}
                  {getStatusBadge(activity.status)}
                </Group>

                {activity.description && (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {activity.description}
                  </Text>
                )}

                {activity.dueDate && (
                  <Text size="xs" c="dimmed">
                    Due: {new Date(activity.dueDate.seconds * 1000).toLocaleString()}
                  </Text>
                )}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingActivity ? "Edit Activity" : "Add New Activity"}
        size="lg"
      >
        <Stack gap="md">
          <Group grow>
            <Select
              label="Type"
              data={ACTIVITY_TYPES}
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
            />
            <Select
              label="Status"
              data={STATUS_OPTIONS}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
          </Group>

          <TextInput
            label="Subject"
            placeholder="Call with prospect"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />

          <DateTimePicker
            label="Due Date"
            placeholder="Pick date and time"
            value={formData.dueDate}
            onChange={(value) => setFormData({ ...formData, dueDate: value })}
          />

          <Textarea
            label="Description"
            placeholder="Additional details..."
            minRows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingActivity ? "Update" : "Create"} Activity
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
