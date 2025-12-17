/**
 * DocViewer - View and edit documentation with markdown support
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Textarea,
  TextInput,
  Select,
  Switch,
  Paper,
  Loader,
  Center,
  ActionIcon,
  NumberInput,
} from "@mantine/core";
import {
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { marked } from "marked";
import { DOC_CATEGORIES } from "../schema.js";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * @typedef {Object} Doc
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} content
 * @property {string} category
 * @property {number} order
 * @property {boolean} published
 * @property {{ toDate: () => Date }} [updatedAt]
 */

/**
 * @param {{
 *   doc: Doc | null;
 *   loading: boolean;
 *   isAdmin: boolean;
 *   onSave: (id: string, data: Partial<Doc>) => Promise<void>;
 *   onDelete: (id: string) => Promise<void>;
 * }} props
 */
export function DocViewer({ doc, loading, isAdmin, onSave, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    content: "",
    category: "",
    order: 0,
    published: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (doc) {
      setEditData({
        title: doc.title || "",
        content: doc.content || "",
        category: doc.category || DOC_CATEGORIES[0],
        order: doc.order || 0,
        published: doc.published || false,
      });
    }
  }, [doc]);

  const handleStartEdit = () => {
    if (!doc) return;
    setEditData({
      title: doc.title || "",
      content: doc.content || "",
      category: doc.category || DOC_CATEGORIES[0],
      order: doc.order || 0,
      published: doc.published || false,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!doc) return;

    setIsSaving(true);
    try {
      await onSave(doc.id, editData);
      setIsEditing(false);
      notifications.show({
        title: "Success",
        message: "Document saved",
        color: "green",
      });
    } catch (error) {
      console.error("Error saving doc:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save document",
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm(`Are you sure you want to delete "${doc.title}"?`)) return;

    try {
      await onDelete(doc.id);
      notifications.show({
        title: "Success",
        message: "Document deleted",
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting doc:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete document",
        color: "red",
      });
    }
  };

  const renderMarkdown = (/** @type {string} */ content) => {
    if (!content) return "<p><em>This document is empty.</em></p>";
    return marked(content);
  };

  if (loading) {
    return (
      <Center style={{ height: "50vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!doc) {
    return (
      <Center style={{ height: "50vh" }}>
        <Stack align="center" gap="md">
          <Text size="xl" c="dimmed">Select a document from the sidebar</Text>
          <Text size="sm" c="dimmed">Or search to find what you're looking for</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Box p="xl" maw={900} mx="auto">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            {isEditing ? (
              <Stack gap="sm">
                <TextInput
                  label="Title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.currentTarget.value })}
                  size="md"
                />
                <Group>
                  <Select
                    label="Category"
                    data={DOC_CATEGORIES}
                    value={editData.category}
                    onChange={(val) => setEditData({ ...editData, category: val || DOC_CATEGORIES[0] })}
                    size="sm"
                    style={{ width: 200 }}
                  />
                  <NumberInput
                    label="Order"
                    value={editData.order}
                    onChange={(val) => setEditData({ ...editData, order: typeof val === 'number' ? val : 0 })}
                    size="sm"
                    style={{ width: 100 }}
                    min={0}
                  />
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>Published</Text>
                    <Switch
                      checked={editData.published}
                      onChange={(e) => setEditData({ ...editData, published: e.currentTarget.checked })}
                    />
                  </Stack>
                </Group>
              </Stack>
            ) : (
              <>
                <Title order={1} mb="xs">{doc.title}</Title>
                {doc.updatedAt && (
                  <Text size="sm" c="dimmed">
                    Last updated {doc.updatedAt.toDate().toLocaleDateString()}
                  </Text>
                )}
              </>
            )}
          </Box>

          {isAdmin && (
            <Group>
              {!isEditing ? (
                <>
                  <Button
                    leftSection={<IconEdit size={16} />}
                    onClick={handleStartEdit}
                    variant="light"
                  >
                    Edit
                  </Button>
                  <ActionIcon
                    color="red"
                    variant="light"
                    size="lg"
                    onClick={handleDelete}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </>
              ) : (
                <>
                  <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={handleSave}
                    loading={isSaving}
                  >
                    Save
                  </Button>
                  <Button
                    leftSection={<IconX size={16} />}
                    variant="subtle"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </Group>
          )}
        </Group>

        {/* Content */}
        {isEditing ? (
          <Stack gap="xs">
            <Textarea
              value={editData.content}
              onChange={(e) => setEditData({ ...editData, content: e.currentTarget.value })}
              placeholder="Write your documentation in markdown..."
              minRows={20}
              autosize
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "14px",
                },
              }}
            />
            <Text size="xs" c="dimmed">
              Tip: Use Markdown formatting (# headers, **bold**, *italic*, `code`, [links](url), etc.)
            </Text>
          </Stack>
        ) : (
          <Paper p="md" radius="sm" style={{ background: "transparent" }}>
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(doc.content),
              }}
            />
          </Paper>
        )}
      </Stack>

      <style>{`
        .markdown-content {
          font-size: 16px;
          line-height: 1.7;
          color: #333;
        }
        .markdown-content h1 { 
          font-size: 1.8em; 
          margin-top: 1.5em; 
          margin-bottom: 0.5em; 
          font-weight: 600;
          border-bottom: 1px solid #e8eced;
          padding-bottom: 0.3em;
        }
        .markdown-content h2 { 
          font-size: 1.4em; 
          margin-top: 1.5em; 
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        .markdown-content h3 { 
          font-size: 1.15em; 
          margin-top: 1.2em; 
          margin-bottom: 0.4em;
          font-weight: 600;
        }
        .markdown-content p { 
          margin-bottom: 1em; 
        }
        .markdown-content ul, .markdown-content ol { 
          margin-bottom: 1em; 
          padding-left: 1.5em; 
        }
        .markdown-content li {
          margin-bottom: 0.3em;
        }
        .markdown-content code { 
          background-color: #f5f5f5; 
          padding: 2px 6px; 
          border-radius: 4px; 
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.9em;
          color: #e83e8c;
        }
        .markdown-content pre { 
          background-color: #1e1e1e; 
          padding: 1em; 
          border-radius: 8px; 
          overflow-x: auto;
          margin-bottom: 1em;
        }
        .markdown-content pre code {
          background: none;
          padding: 0;
          color: #d4d4d4;
          font-size: 0.85em;
        }
        .markdown-content blockquote {
          border-left: 4px solid #17bebb;
          padding-left: 1em;
          margin-left: 0;
          margin-bottom: 1em;
          color: #555;
          background: #f8f9fa;
          padding: 0.5em 1em;
          border-radius: 0 4px 4px 0;
        }
        .markdown-content a {
          color: #ff715b;
          text-decoration: none;
        }
        .markdown-content a:hover {
          text-decoration: underline;
        }
        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        .markdown-content th, .markdown-content td {
          border: 1px solid #e8eced;
          padding: 8px 12px;
          text-align: left;
        }
        .markdown-content th {
          background: #f5f5f5;
          font-weight: 600;
        }
        .markdown-content hr {
          border: none;
          border-top: 1px solid #e8eced;
          margin: 2em 0;
        }
      `}</style>
    </Box>
  );
}

