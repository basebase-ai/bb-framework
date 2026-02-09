import React, { useState, useEffect } from "react";
import {
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Container,
  Box,
  Switch,
  Paper,
  Title,
  Text,
  Tabs,
  Select,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconX,
  IconEye,
  IconSend,
} from "@tabler/icons-react";
import { marked } from "marked";
import { doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { notifications } from "@mantine/notifications";

/**
 * PostEditor - Create and edit blog posts
 * Ghost-inspired writing interface with markdown support
 */
export function PostEditor({ post = null, onClose, onSave }) {
  const { user } = useAuth();
  const { add, update } = useCollection(collections.posts, { realtime: false });

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [type, setType] = useState(post?.type || "other");
  const [featured, setFeatured] = useState(post?.featured || false);
  const [status, setStatus] = useState(post?.status || "draft");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  // Auto-generate slug from title
  useEffect(() => {
    if (!post && title && !slug) {
      const generatedSlug = generateSlug(title);
      setSlug(generatedSlug);
    }
  }, [title, slug, post]);

  // Calculate reading time
  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      notifications.show({
        title: "Error",
        message: "Title is required",
        color: "red",
      });
      return;
    }

    setIsSaving(true);
    try {
      const postData = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        excerpt: excerpt.trim(),
        content: content.trim(),
        type,
        featured,
        status: "draft",
        authorId: user.uid,
        readingTime: calculateReadingTime(content),
      };

      if (post?.id) {
        // Save draft - use setDoc to create/update in private collection
        const privateDocRef = doc(db, collections.posts, post.id);
        await setDoc(privateDocRef, {
          ...postData,
          createdAt: post.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
        }, { merge: true });

        // If it was previously published, remove from public collection
        if (post.status === "published") {
          const publicDocRef = doc(db, collections.postsPublic, post.id);
          await deleteDoc(publicDocRef);
        }

        notifications.show({
          title: "Success",
          message: "Draft saved (unpublished)",
          color: "green",
        });
      } else {
        // Create new draft
        await add(postData);
        notifications.show({
          title: "Success",
          message: "Draft created",
          color: "green",
        });
      }

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      notifications.show({
        title: "Error",
        message: "Title is required",
        color: "red",
      });
      return;
    }

    if (!content.trim()) {
      notifications.show({
        title: "Error",
        message: "Content cannot be empty",
        color: "red",
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = Timestamp.now();
      const postData = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        excerpt: excerpt.trim(),
        content: content.trim(),
        type,
        featured,
        status: "published",
        authorId: user.uid,
        readingTime: calculateReadingTime(content),
        publishedAt: post?.publishedAt || now,
        updatedAt: now,
      };

      let postId = post?.id;
      let createdAt = post?.createdAt || now;

      if (post?.id) {
        // Update/create post in private collection using setDoc
        const privateDocRef = doc(db, collections.posts, post.id);
        await setDoc(privateDocRef, {
          ...postData,
          createdAt: createdAt,
        }, { merge: true });
      } else {
        // Create new post in private collection and get its ID
        const result = await add(postData);
        postId = result.id;
        postData.createdAt = now;
      }

      // Sync to public collection (using same ID for easy tracking)
      if (postId) {
        const publicDocRef = doc(db, collections.postsPublic, postId);
        await setDoc(publicDocRef, {
          ...postData,
          createdAt: createdAt,
        });
      }

      notifications.show({
        title: "Success",
        message: "Post published",
        color: "green",
      });

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return "<p><em>Nothing to preview yet...</em></p>";
    return marked(text);
  };

  return (
    <Container size="lg" py="md">
      <Paper p="xl" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <Title order={2}>{post ? "Edit Post" : "New Post"}</Title>
            <Button variant="subtle" onClick={onClose} leftSection={<IconX size={16} />}>
              Cancel
            </Button>
          </Group>

          {/* Title */}
          <TextInput
            placeholder="Post title..."
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            size="xl"
            styles={{
              input: {
                fontSize: "2rem",
                fontWeight: 700,
                border: "none",
                padding: 0,
              },
            }}
          />

          {/* Slug */}
          <TextInput
            label="URL Slug"
            placeholder="post-url-slug"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            description={`Will be published at: /${slug || "post-slug"}`}
            size="sm"
          />

          {/* Excerpt */}
          <Textarea
            label="Excerpt"
            placeholder="Short description of your post..."
            value={excerpt}
            onChange={(e) => setExcerpt(e.currentTarget.value)}
            minRows={2}
            description="This will appear in post previews and social media shares"
          />

          {/* Content - Write/Preview tabs */}
          <Box>
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="write" leftSection={<IconEye size={16} />}>
                  Write
                </Tabs.Tab>
                <Tabs.Tab value="preview" leftSection={<IconEye size={16} />}>
                  Preview
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="write" pt="md">
                <Textarea
                  placeholder="Write your post in markdown..."
                  value={content}
                  onChange={(e) => setContent(e.currentTarget.value)}
                  minRows={20}
                  autosize
                  styles={{
                    input: {
                      fontFamily: "monospace",
                      fontSize: "14px",
                    },
                  }}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  Markdown supported. Estimated reading time:{" "}
                  {calculateReadingTime(content)} min
                </Text>
              </Tabs.Panel>

              <Tabs.Panel value="preview" pt="md">
                <Paper p="md" withBorder>
                  <div
                    className="markdown-content"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(content),
                    }}
                    style={{
                      fontSize: "16px",
                      lineHeight: "1.7",
                    }}
                  />
                </Paper>
              </Tabs.Panel>
            </Tabs>
          </Box>

          {/* Settings */}
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>Settings</Title>
              <Select
                label="Post type"
                description="Categorize your post with a colored indicator"
                data={[
                  { value: "news", label: "News" },
                  { value: "how-to", label: "How-to" },
                  { value: "commentary", label: "Commentary" },
                  { value: "other", label: "Other" },
                ]}
                value={type}
                onChange={(value) => setType(value)}
              />
              <Switch
                label="Feature this post"
                description="Featured posts appear at the top of the homepage"
                checked={featured}
                onChange={(e) => setFeatured(e.currentTarget.checked)}
              />
            </Stack>
          </Paper>

          {/* Actions */}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={handleSaveDraft}
              loading={isSaving}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              {post?.status === "published" ? "Save Draft & Unpublish" : "Save Draft"}
            </Button>
            <Button
              onClick={handlePublish}
              loading={isSaving}
              leftSection={<IconSend size={16} />}
            >
              {post?.status === "published" ? "Update Post" : "Publish"}
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Custom CSS for markdown rendering */}
      <style>{`
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        .markdown-content h1 { font-size: 2em; }
        .markdown-content h2 { font-size: 1.5em; }
        .markdown-content h3 { font-size: 1.25em; }
        .markdown-content p {
          margin-bottom: 1em;
        }
        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1em;
          padding-left: 2em;
        }
        .markdown-content code {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
        }
        .markdown-content pre {
          background: rgba(255, 255, 255, 0.05);
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
          border-left: 4px solid #4ade80;
          padding-left: 1em;
          margin-left: 0;
          opacity: 0.8;
        }
        .markdown-content img {
          max-width: 100%;
          height: auto;
        }
        .markdown-content a {
          color: #4ade80;
          text-decoration: none;
        }
        .markdown-content a:hover {
          text-decoration: underline;
        }
      `}</style>
    </Container>
  );
}

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
