/**
 * DocumentEditor - Rich text editor with real-time collaboration
 *
 * Uses TipTap (built on ProseMirror) for the editing experience
 * with Firestore for real-time sync
 */

import React, { useEffect, useCallback, useRef } from "react";
import {
  Stack,
  Group,
  Text,
  TextInput,
  Button,
  ActionIcon,
  Paper,
  Loader,
  Badge,
  Tooltip,
  Divider,
  Box,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconShare,
  IconHistory,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconQuote,
  IconCode,
  IconClearFormatting,
  IconArrowBackUp,
  IconArrowForwardUp,
} from "@tabler/icons-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";
import { useDocumentSync } from "../hooks/useDocumentSync.js";
import { usePresence } from "../hooks/usePresence.js";
import { PresenceAvatars } from "./PresenceAvatars.jsx";
import { VersionHistoryPanel } from "./VersionHistoryPanel.jsx";
import { SharePanel } from "./SharePanel.jsx";

/**
 * Toolbar button component
 * @param {{ icon: React.ComponentType, label: string, active?: boolean, onClick: () => void, disabled?: boolean }} props
 */
function ToolbarButton({ icon: Icon, label, active, onClick, disabled }) {
  return (
    <Tooltip label={label} position="bottom" withArrow>
      <ActionIcon
        variant={active ? "filled" : "subtle"}
        color={active ? "blue" : "gray"}
        onClick={onClick}
        disabled={disabled}
        size="md"
      >
        <Icon size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

/**
 * Editor toolbar component
 * @param {{ editor: import('@tiptap/react').Editor | null }} props
 */
function EditorToolbar({ editor }) {
  if (!editor) return null;

  return (
    <Paper p="xs" withBorder>
      <Group gap="xs">
        {/* History */}
        <ToolbarButton
          icon={IconArrowBackUp}
          label="Undo (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={IconArrowForwardUp}
          label="Redo (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />

        <Divider orientation="vertical" />

        {/* Text formatting */}
        <ToolbarButton
          icon={IconBold}
          label="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={IconItalic}
          label="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={IconStrikethrough}
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <Divider orientation="vertical" />

        {/* Headings */}
        <ToolbarButton
          icon={IconH1}
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />
        <ToolbarButton
          icon={IconH2}
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          icon={IconH3}
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />

        <Divider orientation="vertical" />

        {/* Lists */}
        <ToolbarButton
          icon={IconList}
          label="Bullet List"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={IconListNumbers}
          label="Numbered List"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <Divider orientation="vertical" />

        {/* Blocks */}
        <ToolbarButton
          icon={IconQuote}
          label="Block Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={IconCode}
          label="Code Block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />

        <Divider orientation="vertical" />

        {/* Clear formatting */}
        <ToolbarButton
          icon={IconClearFormatting}
          label="Clear Formatting"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        />
      </Group>
    </Paper>
  );
}

/**
 * Main document editor component
 */
export function DocumentEditor() {
  const { user } = useAuth();
  const activeDocumentId = useAppStore((state) => state.activeDocumentId);
  const closeDocument = useAppStore((state) => state.closeDocument);
  const historyPanelOpen = useAppStore((state) => state.historyPanelOpen);
  const sharePanelOpen = useAppStore((state) => state.sharePanelOpen);
  const toggleHistoryPanel = useAppStore((state) => state.toggleHistoryPanel);
  const toggleSharePanel = useAppStore((state) => state.toggleSharePanel);
  const previewVersion = useAppStore((state) => state.previewVersion);

  // Document metadata
  const {
    data: docMeta,
    loading: loadingMeta,
    update: updateMeta,
  } = useDocument(collections.documents, activeDocumentId);

  // Document content sync
  const {
    content,
    loading: loadingContent,
    saving,
    hasUnsavedChanges,
    saveContent,
    flushChanges,
  } = useDocumentSync(activeDocumentId);

  // Presence tracking
  const { otherUsers, updateCursor, setTyping } = usePresence(activeDocumentId);

  // Track if we're currently updating from remote
  /** @type {React.MutableRefObject<boolean>} */
  const isRemoteUpdateRef = useRef(false);

  /** @type {React.MutableRefObject<Object | null>} */
  const lastContentRef = useRef(null);

  // Check if user can edit
  const canEdit =
    docMeta?.owner === user?.uid ||
    docMeta?.permissions?.[user?.uid] === "edit";

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: {
          depth: 100,
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    editable: canEdit && previewVersion === null,
    onUpdate: ({ editor }) => {
      if (isRemoteUpdateRef.current) return;

      const json = editor.getJSON();

      // Avoid saving if content hasn't actually changed
      if (JSON.stringify(json) === JSON.stringify(lastContentRef.current)) {
        return;
      }

      lastContentRef.current = json;
      setTyping(true);
      saveContent(json);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      updateCursor({ anchor: from, head: to });
    },
  });

  // Update editor editable state when permissions change
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit && previewVersion === null);
    }
  }, [editor, canEdit, previewVersion]);

  // Update editor content when remote content changes
  useEffect(() => {
    if (!editor || !content?.content) return;

    // Don't update if this is our own save
    if (!content._isRemoteUpdate && lastContentRef.current) {
      return;
    }

    // Mark as remote update to prevent triggering save
    isRemoteUpdateRef.current = true;

    // Get current cursor position
    const { from, to } = editor.state.selection;

    // Update content
    editor.commands.setContent(content.content);
    lastContentRef.current = content.content;

    // Try to restore cursor position
    try {
      const docLength = editor.state.doc.content.size;
      const safeFrom = Math.min(from, docLength - 1);
      const safeTo = Math.min(to, docLength - 1);
      if (safeFrom >= 0 && safeTo >= 0) {
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      }
    } catch (e) {
      // Cursor restoration failed, that's okay
    }

    // Reset remote update flag
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 0);
  }, [editor, content]);

  // Update title
  const handleTitleChange = useCallback(
    (newTitle) => {
      if (docMeta && canEdit) {
        updateMeta({ title: newTitle });
      }
    },
    [docMeta, canEdit, updateMeta]
  );

  // Flush changes before closing
  const handleClose = useCallback(async () => {
    await flushChanges();
    closeDocument();
  }, [flushChanges, closeDocument]);

  // Loading state
  if (loadingMeta || loadingContent) {
    return (
      <Stack align="center" justify="center" h={400}>
        <Loader size="lg" />
        <Text c="dimmed">Loading document...</Text>
      </Stack>
    );
  }

  // Document not found
  if (!docMeta) {
    return (
      <Stack align="center" justify="center" h={400}>
        <Text c="dimmed">Document not found</Text>
        <Button onClick={closeDocument}>Back to Documents</Button>
      </Stack>
    );
  }

  return (
    <Box style={{ display: "flex", height: "100%" }}>
      {/* Main Editor Area */}
      <Stack gap="md" style={{ flex: 1, overflow: "hidden" }}>
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <ActionIcon variant="subtle" onClick={handleClose}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <TextInput
              value={docMeta.title || "Untitled Document"}
              onChange={(e) => handleTitleChange(e.target.value)}
              variant="unstyled"
              size="lg"
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: "1.5rem",
                },
              }}
              disabled={!canEdit}
            />
            {saving && (
              <Badge color="gray" variant="light" size="sm">
                Saving...
              </Badge>
            )}
            {hasUnsavedChanges && !saving && (
              <Badge color="yellow" variant="light" size="sm">
                Unsaved
              </Badge>
            )}
            {!hasUnsavedChanges && !saving && (
              <Badge color="green" variant="light" size="sm">
                Saved
              </Badge>
            )}
          </Group>

          <Group>
            {/* Active users */}
            <PresenceAvatars users={otherUsers} />

            {/* Actions */}
            <Tooltip label="Version History">
              <ActionIcon
                variant={historyPanelOpen ? "filled" : "subtle"}
                color={historyPanelOpen ? "blue" : "gray"}
                onClick={toggleHistoryPanel}
              >
                <IconHistory size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Share">
              <ActionIcon
                variant={sharePanelOpen ? "filled" : "subtle"}
                color={sharePanelOpen ? "blue" : "gray"}
                onClick={toggleSharePanel}
              >
                <IconShare size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Toolbar */}
        {canEdit && previewVersion === null && <EditorToolbar editor={editor} />}

        {/* Preview mode banner */}
        {previewVersion !== null && (
          <Paper p="sm" bg="yellow.1" withBorder>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Viewing version {previewVersion}
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => useAppStore.getState().setPreviewVersion(null)}
              >
                Exit Preview
              </Button>
            </Group>
          </Paper>
        )}

        {/* Read-only banner */}
        {!canEdit && previewVersion === null && (
          <Paper p="sm" bg="gray.1" withBorder>
            <Text size="sm" c="dimmed">
              You have view-only access to this document
            </Text>
          </Paper>
        )}

        {/* Editor */}
        <Paper
          p="xl"
          withBorder
          style={{
            flex: 1,
            overflow: "auto",
            minHeight: 400,
          }}
        >
          <EditorContent
            editor={editor}
            style={{
              minHeight: "100%",
            }}
          />
        </Paper>
      </Stack>

      {/* Side Panels */}
      {historyPanelOpen && (
        <VersionHistoryPanel
          documentId={activeDocumentId}
          onClose={toggleHistoryPanel}
        />
      )}

      {sharePanelOpen && (
        <SharePanel
          documentId={activeDocumentId}
          document={docMeta}
          onClose={toggleSharePanel}
        />
      )}
    </Box>
  );
}
