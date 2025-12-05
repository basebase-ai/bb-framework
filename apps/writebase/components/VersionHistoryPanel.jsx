/**
 * VersionHistoryPanel - View and restore document versions
 */

import React, { useState, useEffect } from "react";
import {
  Stack,
  Group,
  Title,
  Text,
  Paper,
  ScrollArea,
  ActionIcon,
  Button,
  Badge,
  Avatar,
  Loader,
  Divider,
  Timeline,
  ThemeIcon,
  Tooltip,
  Modal,
} from "@mantine/core";
import {
  IconX,
  IconHistory,
  IconRestore,
  IconEye,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import { useVersionHistory } from "../hooks/useVersionHistory.js";
import { useAppStore } from "../stores/appStore.js";

/**
 * Format date for display
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Group operations by time period
 * @param {Array} operations
 * @returns {Object}
 */
function groupOperationsByTime(operations) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  
  operations.forEach(op => {
    const opDate = op.timestamp;
    if (!opDate) {
      groups.older.push(op);
      return;
    }
    
    if (opDate >= today) {
      groups.today.push(op);
    } else if (opDate >= yesterday) {
      groups.yesterday.push(op);
    } else if (opDate >= weekAgo) {
      groups.thisWeek.push(op);
    } else {
      groups.older.push(op);
    }
  });
  
  return groups;
}

/**
 * Version item component
 * @param {{ version: Object, onPreview: () => void, onRestore: () => void, isActive: boolean }} props
 */
function VersionItem({ version, onPreview, onRestore, isActive }) {
  return (
    <Paper 
      p="sm" 
      withBorder 
      bg={isActive ? 'blue.0' : undefined}
      style={{ cursor: 'pointer' }}
      onClick={onPreview}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2}>
          <Group gap="xs">
            <Text size="sm" fw={500}>
              Version {version.version}
            </Text>
            {version.isRestore && (
              <Badge size="xs" color="orange" variant="light">
                Restored
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Avatar size="xs" src={null}>
              {version.createdByName?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Text size="xs" c="dimmed">
              {version.createdByName}
            </Text>
            <Text size="xs" c="dimmed">
              • {formatDate(version.createdAt)}
            </Text>
          </Group>
          {version.changesSummary && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {version.changesSummary}
            </Text>
          )}
        </Stack>
        
        <Group gap="xs">
          <Tooltip label="Preview">
            <ActionIcon 
              variant={isActive ? "filled" : "subtle"} 
              color="blue" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <IconEye size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Restore">
            <ActionIcon 
              variant="subtle" 
              color="green" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRestore();
              }}
            >
              <IconRestore size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
}

/**
 * Operation timeline item
 * @param {{ operation: Object }} props
 */
function OperationItem({ operation }) {
  return (
    <Timeline.Item
      bullet={
        <ThemeIcon size={20} radius="xl" color="blue" variant="light">
          <IconHistory size={12} />
        </ThemeIcon>
      }
      title={
        <Group gap="xs">
          <Text size="sm" fw={500}>Edit</Text>
          <Text size="xs" c="dimmed">
            v{operation.version}
          </Text>
        </Group>
      }
    >
      <Group gap="xs">
        <Avatar size="xs" src={null}>
          {operation.userName?.charAt(0)?.toUpperCase() || '?'}
        </Avatar>
        <Text size="xs" c="dimmed">
          {operation.userName}
        </Text>
        <Text size="xs" c="dimmed">
          • {formatDate(operation.timestamp)}
        </Text>
      </Group>
    </Timeline.Item>
  );
}

/**
 * VersionHistoryPanel component
 * @param {{ documentId: string, onClose: () => void }} props
 */
export function VersionHistoryPanel({ documentId, onClose }) {
  const [activeTab, setActiveTab] = useState('versions');
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState(null);
  
  const previewVersion = useAppStore((state) => state.previewVersion);
  const setPreviewVersion = useAppStore((state) => state.setPreviewVersion);
  
  const {
    versions,
    operations,
    loading,
    error,
    restoreVersion,
    loadVersions,
    loadOperations,
  } = useVersionHistory(documentId);

  // Load data on mount
  useEffect(() => {
    loadVersions();
    loadOperations();
  }, [loadVersions, loadOperations]);

  const handlePreview = (version) => {
    setPreviewVersion(version.version);
  };

  const handleRestore = async () => {
    if (!versionToRestore) return;
    
    const success = await restoreVersion(versionToRestore);
    if (success) {
      setRestoreModalOpen(false);
      setVersionToRestore(null);
      setPreviewVersion(null);
    }
  };

  const groupedOperations = groupOperationsByTime(operations);

  return (
    <>
      <Paper 
        withBorder 
        p="md" 
        style={{ 
          width: 350, 
          height: '100%',
          borderLeft: '1px solid var(--mantine-color-gray-3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconHistory size={20} />
            <Title order={5}>Version History</Title>
          </Group>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={18} />
          </ActionIcon>
        </Group>

        {/* Loading state */}
        {loading && (
          <Stack align="center" justify="center" style={{ flex: 1 }}>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading history...</Text>
          </Stack>
        )}

        {/* Error state */}
        {error && (
          <Paper p="md" bg="red.0" withBorder>
            <Text size="sm" c="red">
              Failed to load history: {error.message}
            </Text>
          </Paper>
        )}

        {/* Content */}
        {!loading && !error && (
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="sm">
              {/* Version Snapshots */}
              <Text size="sm" fw={500} c="dimmed">
                Saved Versions ({versions.length})
              </Text>
              
              {versions.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No saved versions yet
                </Text>
              ) : (
                versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isActive={previewVersion === version.version}
                    onPreview={() => handlePreview(version)}
                    onRestore={() => {
                      setVersionToRestore(version);
                      setRestoreModalOpen(true);
                    }}
                  />
                ))
              )}
              
              <Divider my="md" />
              
              {/* Recent Activity */}
              <Text size="sm" fw={500} c="dimmed">
                Recent Activity
              </Text>
              
              {operations.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No activity yet
                </Text>
              ) : (
                <Timeline bulletSize={24} lineWidth={2}>
                  {/* Today */}
                  {groupedOperations.today.length > 0 && (
                    <>
                      <Text size="xs" c="dimmed" fw={500} mb="xs">Today</Text>
                      {groupedOperations.today.slice(0, 10).map((op) => (
                        <OperationItem key={op.id} operation={op} />
                      ))}
                    </>
                  )}
                  
                  {/* Yesterday */}
                  {groupedOperations.yesterday.length > 0 && (
                    <>
                      <Text size="xs" c="dimmed" fw={500} mt="md" mb="xs">Yesterday</Text>
                      {groupedOperations.yesterday.slice(0, 5).map((op) => (
                        <OperationItem key={op.id} operation={op} />
                      ))}
                    </>
                  )}
                  
                  {/* This Week */}
                  {groupedOperations.thisWeek.length > 0 && (
                    <>
                      <Text size="xs" c="dimmed" fw={500} mt="md" mb="xs">This Week</Text>
                      {groupedOperations.thisWeek.slice(0, 5).map((op) => (
                        <OperationItem key={op.id} operation={op} />
                      ))}
                    </>
                  )}
                </Timeline>
              )}
            </Stack>
          </ScrollArea>
        )}
      </Paper>

      {/* Restore Confirmation Modal */}
      <Modal
        opened={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        title="Restore Version"
        centered
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to restore to version {versionToRestore?.version}?
          </Text>
          <Text size="xs" c="dimmed">
            This will replace the current document content. The current version will be saved in history.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setRestoreModalOpen(false)}>
              Cancel
            </Button>
            <Button color="green" onClick={handleRestore}>
              Restore
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
