/**
 * PreviewPanel - Renders the app preview in an iframe using production framework
 * Uses ?draft=true parameter to load from Firestore drafts collection
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Stack,
  Group,
  Text,
  Paper,
  ActionIcon,
  Tooltip,
  Center,
  Loader,
  Badge,
} from "@mantine/core";
import { IconRefresh, IconExternalLink, IconCode } from "@tabler/icons-react";
import { useBuilderStore } from "../stores/builderStore.js";
import { getPreviewUrl } from "../utils/draftSync.js";

export function PreviewPanel() {
  const { files, currentAppId, previewKey, lintErrors } = useBuilderStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const iframeRef = useRef(/** @type {HTMLIFrameElement | null} */ (null));
  const [iframeKey, setIframeKey] = useState(0);

  // Get the preview URL for the current app
  const previewUrl = currentAppId ? getPreviewUrl(currentAppId) : null;

  // Check for critical lint errors
  const criticalErrors = lintErrors.filter((e) => e.severity === "error");
  const hasErrors = criticalErrors.length > 0;

  // Refresh the iframe
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Increment key to force iframe remount
    setIframeKey((k) => k + 1);
  }, []);

  // Refresh when previewKey changes (triggered by file edits)
  useEffect(() => {
    if (currentAppId && Object.keys(files).length > 0 && !hasErrors) {
      handleRefresh();
    }
  }, [previewKey, currentAppId, hasErrors]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setError("Failed to load preview");
  }, []);

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  }, [previewUrl]);

  if (!currentAppId) {
    return (
      <Center h="100%" bg="gray.0">
        <Stack align="center" gap="sm">
          <IconCode size={48} color="gray" />
          <Text c="dimmed">No app selected</Text>
        </Stack>
      </Center>
    );
  }

  if (Object.keys(files).length === 0) {
    return (
      <Center h="100%" bg="gray.0">
        <Stack align="center" gap="sm">
          <IconCode size={48} color="gray" />
          <Text c="dimmed">No files yet</Text>
          <Text size="xs" c="dimmed">
            Ask the AI to create some files
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack h="100%" gap={0}>
      {/* Header */}
      <Paper
        p="xs"
        withBorder
        style={{ borderTop: 0, borderLeft: 0, borderRight: 0 }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm" fw={500}>
              Preview
            </Text>
            {hasErrors && (
              <Badge size="xs" color="red" variant="light">
                {criticalErrors.length} error(s)
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label="Refresh preview">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleRefresh}
                loading={isLoading}
                disabled={hasErrors}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Open in new tab">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleOpenExternal}
                disabled={!previewUrl || hasErrors}
              >
                <IconExternalLink size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Preview Frame */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {isLoading && !hasErrors && (
          <Center
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255,255,255,0.8)",
              zIndex: 10,
            }}
          >
            <Stack align="center" gap="xs">
              <Loader size="sm" />
              <Text size="xs" c="dimmed">
                Loading preview...
              </Text>
            </Stack>
          </Center>
        )}

        {hasErrors ? (
          <Center h="100%" bg="red.0" p="md">
            <Stack align="center" gap="sm">
              <Text c="red" fw={500}>
                Preview Blocked
              </Text>
              <Text size="sm" c="red.7" ta="center">
                {criticalErrors.length} syntax error(s) must be fixed
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                Fix the errors and the preview will update automatically
              </Text>
            </Stack>
          </Center>
        ) : error ? (
          <Center h="100%" bg="red.0" p="md">
            <Stack align="center" gap="sm">
              <Text c="red" fw={500}>
                Preview Error
              </Text>
              <Text size="sm" c="red.7" ta="center">
                {error}
              </Text>
              <ActionIcon variant="light" onClick={handleRefresh}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Stack>
          </Center>
        ) : previewUrl ? (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={previewUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              backgroundColor: "white",
            }}
            title="App Preview"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        ) : (
          <Center h="100%" bg="gray.0">
            <Loader size="sm" />
          </Center>
        )}
      </div>
    </Stack>
  );
}
