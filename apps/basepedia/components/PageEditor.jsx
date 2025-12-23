/**
 * PageEditor - View and edit wiki pages with markdown support
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Button,
  Paper,
  Stack,
  Text,
  Group,
  ActionIcon,
  Textarea,
  Badge,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useRoute } from "../../../framework/hooks/useRoute.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { collections } from "../schema.js";
import { updateDoc, doc, deleteDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { marked } from "marked";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function PageEditor() {
  const { user, authenticated, promptSignIn } = useAuth();
  const { params, navigate } = useRoute();
  const slug = params.slug || "";
  
  const { data: pages, loading } = useCollection(collections.pages);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const page = pages?.find((p) => p.slug === slug);

  // Get all unique user IDs
  const userIds = page
    ? [page.createdBy, ...(page.contributors || [])].filter(Boolean)
    : [];
  const { profiles } = useUserProfiles(userIds);

  useEffect(() => {
    if (page && isEditing) {
      setEditContent(page.content || "");
    }
  }, [page, isEditing]);

  const handleStartEdit = () => {
    if (!authenticated) {
      promptSignIn();
      return;
    }
    setEditContent(page?.content || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user || !page) return;

    setIsSaving(true);
    try {
      const pageRef = doc(db, collections.pages, page.id);
      
      // Add current user to contributors if not already there
      /** @type {Record<string, unknown>} */
      const updates = {
        content: editContent,
        updatedAt: new Date(),
      };

      // Add to contributors array if not already included
      if (!page.contributors?.includes(user.uid) && page.createdBy !== user.uid) {
        updates.contributors = arrayUnion(user.uid);
      }

      await updateDoc(pageRef, updates);

      setIsEditing(false);
      notifications.show({
        title: "Success",
        message: "Page updated successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error saving page:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save page",
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !page) return;
    if (page.createdBy !== user.uid) {
      notifications.show({
        title: "Permission denied",
        message: "Only the creator can delete this page",
        color: "red",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${page.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const pageRef = doc(db, collections.pages, page.id);
      await deleteDoc(pageRef);

      notifications.show({
        title: "Success",
        message: "Page deleted successfully",
        color: "green",
      });

      navigate("/");
    } catch (error) {
      console.error("Error deleting page:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete page",
        color: "red",
      });
      setIsDeleting(false);
    }
  };

  const getDisplayName = (/** @type {string} */ uid) => {
    const profile = profiles.get(uid);
    return profile?.displayName || profile?.email || "Unknown";
  };

  const renderMarkdown = (/** @type {string | undefined} */ content) => {
    if (!content) return "<p><em>This page is empty. Click Edit to add content.</em></p>";
    return marked(content);
  };

  if (loading) {
    return (
      <Center style={{ height: "80vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!page) {
    return (
      <Container size="md" py="xl">
        <Paper p="xl" withBorder>
          <Stack gap="md" align="center">
            <Text size="lg" c="dimmed">
              Page not found
            </Text>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => navigate("/")}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={1}>{page.title}</Title>
              <Text size="sm" c="dimmed">
                Created by {getDisplayName(page.createdBy)}
                {page.updatedAt && (
                  <> • Last updated {page.updatedAt.toDate().toLocaleDateString()}</>
                )}
              </Text>
            </div>
          </Group>

          <Group>
            {!isEditing && (
              <>
                <Button
                  leftSection={<IconEdit size={16} />}
                  onClick={handleStartEdit}
                  variant="light"
                >
                  Edit
                </Button>
                {authenticated && page.createdBy === user?.uid && (
                  <ActionIcon
                    color="red"
                    variant="light"
                    size="lg"
                    onClick={handleDelete}
                    loading={isDeleting}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                )}
              </>
            )}
            {isEditing && (
              <Group>
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
              </Group>
            )}
          </Group>
        </Group>

        {/* Contributors */}
        {page.contributors && page.contributors.length > 0 && (
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Contributors:
            </Text>
            {page.contributors.map((/** @type {string} */ uid) => (
              <Badge key={uid} variant="light" size="sm">
                {getDisplayName(uid)}
              </Badge>
            ))}
          </Group>
        )}

        {/* Content */}
        <Paper p="xl" withBorder>
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.currentTarget.value)}
              placeholder="Write your content in markdown..."
              minRows={15}
              autosize
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "14px",
                },
              }}
            />
          ) : (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(page.content),
              }}
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
              }}
            />
          )}
        </Paper>

        {/* Markdown hint */}
        {isEditing && (
          <Text size="xs" c="dimmed">
            Tip: You can use Markdown formatting (# headers, **bold**, *italic*,
            [links](url), etc.)
          </Text>
        )}
      </Stack>

      <style>{`
        .markdown-content h1 { font-size: 2em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .markdown-content h2 { font-size: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .markdown-content h3 { font-size: 1.25em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .markdown-content p { margin-bottom: 1em; }
        .markdown-content ul, .markdown-content ol { margin-bottom: 1em; padding-left: 2em; }
        .markdown-content code { 
          background-color: #f5f5f5; 
          padding: 2px 6px; 
          border-radius: 3px; 
          font-family: monospace;
        }
        .markdown-content pre { 
          background-color: #f5f5f5; 
          padding: 1em; 
          border-radius: 5px; 
          overflow-x: auto;
          margin-bottom: 1em;
        }
        .markdown-content pre code {
          background: none;
          padding: 0;
        }
        .markdown-content blockquote {
          border-left: 3px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          color: #666;
        }
        .markdown-content a {
          color: #1c7ed6;
          text-decoration: none;
        }
        .markdown-content a:hover {
          text-decoration: underline;
        }
      `}</style>
    </Container>
  );
}
