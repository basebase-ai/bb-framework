/**
 * TaskViewer - Real-time task execution viewer
 */

import React from "react";
import {
  Modal,
  Stack,
  Text,
  Badge,
  Paper,
  Group,
  Code,
  ScrollArea,
  Divider,
  Loader,
} from "@mantine/core";
import { useDocument } from "../../../framework/hooks/useDocument.js";

export function TaskViewer({ taskId, opened, onClose }) {
  const { data: task, loading } = useDocument("tasks", taskId);

  if (!taskId) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "failed":
        return "red";
      case "running":
        return "blue";
      case "pending":
        return "yellow";
      default:
        return "gray";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Task Execution Details"
      size="xl"
    >
      <Stack gap="md">
        {loading && !task ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text>Loading task details...</Text>
          </Group>
        ) : task ? (
          <>
            {/* Status */}
            <Paper p="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Status</Text>
                <Badge color={getStatusColor(task.status)} size="lg">
                  {task.status?.toUpperCase() || "UNKNOWN"}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Task ID: {taskId}
              </Text>
            </Paper>

            {/* Function Info */}
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text fw={600}>Function Information</Text>
                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">
                      Function
                    </Text>
                    <Text size="sm">{task.functionId || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      App ID
                    </Text>
                    <Text size="sm">{task.appId || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      User ID
                    </Text>
                    <Text size="sm" style={{ maxWidth: 200 }} truncate>
                      {task.userId || "N/A"}
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Paper>

            {/* Timestamps */}
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text fw={600}>Timestamps</Text>
                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">
                      Created
                    </Text>
                    <Text size="sm">{formatDate(task.createdAt)}</Text>
                  </div>
                  {task.startedAt && (
                    <div>
                      <Text size="xs" c="dimmed">
                        Started
                      </Text>
                      <Text size="sm">{formatDate(task.startedAt)}</Text>
                    </div>
                  )}
                  {task.completedAt && (
                    <div>
                      <Text size="xs" c="dimmed">
                        Completed
                      </Text>
                      <Text size="sm">{formatDate(task.completedAt)}</Text>
                    </div>
                  )}
                </Group>
                {task.startedAt && task.completedAt && (
                  <Text size="xs" c="dimmed">
                    Duration:{" "}
                    {(
                      (new Date(task.completedAt) -
                        new Date(task.startedAt)) /
                      1000
                    ).toFixed(2)}
                    s
                  </Text>
                )}
              </Stack>
            </Paper>

            {/* Parameters */}
            {task.params && (
              <Paper p="md" withBorder>
                <Text fw={600} mb="xs">
                  Parameters
                </Text>
                <ScrollArea h={150}>
                  <Code block>{JSON.stringify(task.params, null, 2)}</Code>
                </ScrollArea>
              </Paper>
            )}

            {/* Result */}
            {task.result && (
              <Paper p="md" withBorder>
                <Text fw={600} mb="xs">
                  Result
                </Text>
                <ScrollArea h={300}>
                  <Code block>{JSON.stringify(task.result, null, 2)}</Code>
                </ScrollArea>
              </Paper>
            )}

            {/* Error */}
            {task.error && (
              <Paper p="md" withBorder bg="red.0">
                <Text fw={600} c="red" mb="xs">
                  Error
                </Text>
                <ScrollArea h={200}>
                  <Code block color="red">
                    {typeof task.error === "string"
                      ? task.error
                      : JSON.stringify(task.error, null, 2)}
                  </Code>
                </ScrollArea>
              </Paper>
            )}

            {/* Logs */}
            {task.logs && task.logs.length > 0 && (
              <Paper p="md" withBorder>
                <Text fw={600} mb="xs">
                  Logs ({task.logs.length})
                </Text>
                <ScrollArea h={200}>
                  <Stack gap="xs">
                    {task.logs.map((log, idx) => (
                      <Paper key={idx} p="xs" withBorder bg="gray.0">
                        <Text size="xs" c="dimmed">
                          {formatDate(log.timestamp)}
                        </Text>
                        <Text size="sm">{log.message}</Text>
                        {log.data && (
                          <Code block mt="xs">
                            {JSON.stringify(log.data, null, 2)}
                          </Code>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>
              </Paper>
            )}
          </>
        ) : (
          <Text c="dimmed">Task not found</Text>
        )}
      </Stack>
    </Modal>
  );
}

