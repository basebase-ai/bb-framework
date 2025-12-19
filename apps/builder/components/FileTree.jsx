/**
 * FileTree - Displays the current app files
 */

import React from "react";
import {
  Stack,
  Group,
  Text,
  Paper,
  ThemeIcon,
  Badge,
  ScrollArea,
  Tooltip,
  Box,
} from "@mantine/core";
import {
  IconFile,
  IconFolder,
  IconFileCode,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useBuilderStore } from "../stores/builderStore.js";

/**
 * Get icon for file type
 * @param {string} fileName
 */
function getFileIcon(fileName) {
  if (fileName.endsWith(".jsx") || fileName.endsWith(".tsx")) {
    return <IconFileCode size={14} />;
  }
  if (fileName.endsWith(".js") || fileName.endsWith(".ts")) {
    return <IconFileCode size={14} />;
  }
  return <IconFile size={14} />;
}

/**
 * Get color for file type
 * @param {string} fileName
 */
function getFileColor(fileName) {
  if (fileName.endsWith(".jsx") || fileName.endsWith(".tsx")) {
    return "cyan";
  }
  if (fileName.endsWith(".js") || fileName.endsWith(".ts")) {
    return "yellow";
  }
  return "gray";
}

/**
 * Organize files into a tree structure
 * @param {Record<string, string>} files
 * @returns {Array<{ path: string, name: string, isDir: boolean, children?: any[], content?: string }>}
 */
function buildTree(files) {
  const tree = [];
  const dirs = new Map();

  // Sort files
  const sortedPaths = Object.keys(files).sort((a, b) => {
    // Directories first, then alphabetically
    const aIsDir = a.includes("/");
    const bIsDir = b.includes("/");
    if (aIsDir !== bIsDir) return aIsDir ? 1 : -1;
    return a.localeCompare(b);
  });

  for (const path of sortedPaths) {
    const parts = path.split("/");

    if (parts.length === 1) {
      // Root file
      tree.push({
        path,
        name: path,
        isDir: false,
        content: files[path],
      });
    } else {
      // File in directory
      const dirName = parts[0];
      if (!dirs.has(dirName)) {
        dirs.set(dirName, []);
      }
      dirs.get(dirName).push({
        path,
        name: parts.slice(1).join("/"),
        isDir: false,
        content: files[path],
      });
    }
  }

  // Add directories to tree
  for (const [dirName, children] of dirs) {
    tree.push({
      path: dirName,
      name: dirName,
      isDir: true,
      children,
    });
  }

  // Sort: schema.js first, then app.jsx, then dirs, then other files
  return tree.sort((a, b) => {
    if (a.name === "schema.js") return -1;
    if (b.name === "schema.js") return 1;
    if (a.name === "app.jsx") return -1;
    if (b.name === "app.jsx") return 1;
    if (a.isDir !== b.isDir) return a.isDir ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * @param {{ item: any, depth?: number, lintErrors: any[], selectedFile: string | null, onSelectFile: (path: string) => void }} props
 */
function TreeItem({ item, depth = 0, lintErrors, selectedFile, onSelectFile }) {
  const hasError = lintErrors.some(
    (e) => e.file === item.path || e.file.startsWith(item.path + "/")
  );
  const lineCount = item.content ? item.content.split("\n").length : 0;
  const isSelected = selectedFile === item.path;

  if (item.isDir) {
    return (
      <Stack gap={2}>
        <Group gap="xs" pl={depth * 16}>
          <ThemeIcon size="xs" variant="light" color="blue">
            <IconFolder size={12} />
          </ThemeIcon>
          <Text size="xs" fw={500}>
            {item.name}/
          </Text>
          {hasError && (
            <ThemeIcon size="xs" variant="light" color="red">
              <IconAlertCircle size={10} />
            </ThemeIcon>
          )}
        </Group>
        {item.children?.map((child) => (
          <TreeItem
            key={child.path}
            item={child}
            depth={depth + 1}
            lintErrors={lintErrors}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </Stack>
    );
  }

  const fileErrors = lintErrors.filter((e) => e.file === item.path);

  return (
    <Tooltip
      label={fileErrors.length > 0 ? fileErrors.map((e) => e.message).join("\n") : `${lineCount} lines`}
      position="right"
      multiline
      maw={300}
    >
      <Group
        gap="xs"
        pl={depth * 16}
        py={2}
        px={4}
        style={{
          cursor: "pointer",
          borderRadius: 4,
          backgroundColor: isSelected ? "var(--mantine-color-blue-light)" : undefined,
        }}
        onClick={() => onSelectFile(item.path)}
      >
        <ThemeIcon size="xs" variant="light" color={getFileColor(item.name)}>
          {getFileIcon(item.name)}
        </ThemeIcon>
        <Text size="xs" c={hasError ? "red" : undefined} fw={isSelected ? 500 : undefined}>
          {item.name}
        </Text>
        {hasError && (
          <ThemeIcon size="xs" variant="light" color="red">
            <IconAlertCircle size={10} />
          </ThemeIcon>
        )}
        <Text size="xs" c="dimmed">
          ({lineCount})
        </Text>
      </Group>
    </Tooltip>
  );
}

export function FileTree() {
  const { files, currentAppId, lintErrors, selectedFile, selectFile } = useBuilderStore();

  if (!currentAppId) {
    return null;
  }

  const tree = buildTree(files);
  const totalFiles = Object.keys(files).length;
  const errorCount = lintErrors.filter((e) => e.severity === "error").length;
  const warningCount = lintErrors.filter((e) => e.severity === "warning").length;

  // Get selected file content
  const selectedContent = selectedFile ? files[selectedFile] : null;

  return (
    <Group gap={0} h="100%" align="stretch" wrap="nowrap">
      {/* File Tree */}
      <Paper
        p="sm"
        withBorder
        style={{
          width: 220,
          minWidth: 220,
          height: "100%",
          borderTop: 0,
          borderBottom: 0,
          borderLeft: 0,
          borderRadius: 0,
        }}
      >
        <Stack gap="sm" h="100%">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Files
            </Text>
            <Group gap="xs">
              <Badge size="xs" variant="light">
                {totalFiles}
              </Badge>
              {errorCount > 0 && (
                <Badge size="xs" color="red" variant="light">
                  {errorCount}
                </Badge>
              )}
            </Group>
          </Group>

          <ScrollArea style={{ flex: 1 }}>
            <Stack gap={4}>
              {tree.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  No files yet
                </Text>
              ) : (
                tree.map((item) => (
                  <TreeItem
                    key={item.path}
                    item={item}
                    lintErrors={lintErrors}
                    selectedFile={selectedFile}
                    onSelectFile={selectFile}
                  />
                ))
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </Paper>

      {/* Code Viewer */}
      <Box style={{ flex: 1, height: "100%", overflow: "hidden" }}>
        {selectedFile && selectedContent !== null ? (
          <Stack gap={0} h="100%">
            <Paper
              p="xs"
              style={{
                borderBottom: "1px solid var(--mantine-color-gray-3)",
                borderRadius: 0,
              }}
            >
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  {selectedFile}
                </Text>
                <Text size="xs" c="dimmed">
                  {selectedContent.split("\n").length} lines
                </Text>
              </Group>
            </Paper>
            <ScrollArea style={{ flex: 1 }} p="xs">
              <pre
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {selectedContent.split("\n").map((line, i) => (
                  <div key={i} style={{ display: "flex" }}>
                    <span
                      style={{
                        width: 40,
                        minWidth: 40,
                        textAlign: "right",
                        paddingRight: 12,
                        color: "var(--mantine-color-gray-5)",
                        userSelect: "none",
                      }}
                    >
                      {i + 1}
                    </span>
                    <code style={{ flex: 1 }}>{line || " "}</code>
                  </div>
                ))}
              </pre>
            </ScrollArea>
          </Stack>
        ) : (
          <Stack align="center" justify="center" h="100%" c="dimmed">
            <IconFile size={32} stroke={1.5} />
            <Text size="sm">Select a file to view</Text>
          </Stack>
        )}
      </Box>
    </Group>
  );
}
