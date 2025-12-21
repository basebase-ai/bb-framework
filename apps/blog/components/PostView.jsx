import React, { useEffect, useState } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Paper,
  Avatar,
  Divider,
  Box,
  Skeleton,
} from "@mantine/core";
import { IconArrowLeft, IconEdit, IconClock } from "@tabler/icons-react";
import { marked } from "marked";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { usePublicAuthor } from "../hooks/usePublicAuthor.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * PostView - Single post reading view
 * Clean, distraction-free reading experience inspired by Ghost
 */
export function PostView({ slug, onNavigateHome, onEdit }) {
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch the post by slug from public collection (published posts)
  // Using realtime: false to avoid watch stream issues during auth state changes
  const { data: posts, loading } = useCollection(collections.postsPublic, {
    where: [["slug", "==", slug]],
    limit: 1,
    realtime: false,
  });

  useEffect(() => {
    if (posts && posts.length > 0) {
      setPost(posts[0]);
      setHasLoaded(true);
    } else if (!loading && posts?.length === 0) {
      setHasLoaded(true);
    }
  }, [posts, loading]);

  const { author: authorProfile, loading: authorLoading } = usePublicAuthor(post?.authorId);

  if (loading && !hasLoaded) {
    return (
      <Container size="md" py="xl">
        <Text c="dimmed" ta="center">
          Loading post...
        </Text>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container size="md" py="xl">
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Title order={2}>Post not found</Title>
            <Text c="dimmed">The post you're looking for doesn't exist.</Text>
            <Button onClick={onNavigateHome} leftSection={<IconArrowLeft size={16} />}>
              Back to home
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Check if user can view this post
  const canView = post.status === "published" || user?.uid === post.authorId;
  if (!canView) {
    return (
      <Container size="md" py="xl">
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Title order={2}>Private Post</Title>
            <Text c="dimmed">This post is not published yet.</Text>
            <Button onClick={onNavigateHome} leftSection={<IconArrowLeft size={16} />}>
              Back to home
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const isAuthor = user?.uid === post.authorId;
  const authorName = authorProfile?.displayName || "Unknown Author";

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderMarkdown = (content) => {
    if (!content) return "<p><em>No content yet...</em></p>";
    return marked(content);
  };

  return (
    <Box style={{ minHeight: "100vh" }}>
      <Container size="md" py="xl">
        <Stack gap="xl">
          {/* Back button and edit */}
          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={onNavigateHome}
              leftSection={<IconArrowLeft size={16} />}
            >
              All posts
            </Button>
            {isAuthor && (
              <Button
                variant="light"
                onClick={() => onEdit(post)}
                leftSection={<IconEdit size={16} />}
              >
                Edit
              </Button>
            )}
          </Group>

          {/* Post header */}
          <Stack gap="md">
            {/* Status badges */}
            {post.status === "draft" && (
              <Badge color="gray" variant="light" size="lg">
                Draft
              </Badge>
            )}

            {/* Title */}
            <Title
              order={1}
              style={{
                fontSize: "3rem",
                lineHeight: "1.2",
                fontWeight: 800,
              }}
            >
              {post.title}
            </Title>

            {/* Excerpt */}
            {post.excerpt && (
              <Text size="xl" c="dimmed" style={{ lineHeight: "1.6" }}>
                {post.excerpt}
              </Text>
            )}

            {/* Author and metadata */}
            <Group
              gap="md"
              wrap="nowrap"
              style={{
                opacity: authorLoading ? 0.3 : 1,
                transition: 'opacity 0.2s ease-in-out'
              }}
            >
              <Avatar
                src={authorProfile?.photoURL}
                alt={authorName}
                size="md"
                radius="xl"
              >
                {authorName.charAt(0).toUpperCase()}
              </Avatar>
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {authorName}
                </Text>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {formatDate(post.publishedAt || post.createdAt)}
                  </Text>
                  {post.readingTime > 0 && (
                    <>
                      <Text size="xs" c="dimmed">
                        •
                      </Text>
                      <Group gap={4}>
                        <IconClock size={12} style={{ color: "#868e96" }} />
                        <Text size="xs" c="dimmed">
                          {post.readingTime} min read
                        </Text>
                      </Group>
                    </>
                  )}
                </Group>
              </Box>
            </Group>
          </Stack>

          <Divider />

          {/* Post content */}
          <div
            className="post-content"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(post.content),
            }}
          />

          <Divider />

          {/* Author bio */}
          <Paper p="lg" withBorder bg="gray.0">
            <Group gap="md" align="flex-start">
              <Avatar
                src={authorProfile?.photoURL}
                alt={authorName}
                size="lg"
                radius="xl"
              >
                {authorName.charAt(0).toUpperCase()}
              </Avatar>
              <Box style={{ flex: 1 }}>
                <Text fw={600} size="lg" mb="xs">
                  {authorName}
                </Text>
                <Text size="sm" c="dimmed">
                  Author
                </Text>
              </Box>
            </Group>
          </Paper>

          {/* Back to home */}
          <Group justify="center">
            <Button
              variant="light"
              size="lg"
              onClick={onNavigateHome}
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to all posts
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Custom CSS for post content */}
      <style>{`
        .post-content {
          font-size: 1.125rem;
          line-height: 1.8;
          color: #1a1a1a;
        }
        .post-content h1,
        .post-content h2,
        .post-content h3,
        .post-content h4,
        .post-content h5,
        .post-content h6 {
          margin-top: 2em;
          margin-bottom: 0.75em;
          font-weight: 700;
          line-height: 1.3;
          color: #000;
        }
        .post-content h1 { font-size: 2.5em; }
        .post-content h2 { font-size: 2em; }
        .post-content h3 { font-size: 1.5em; }
        .post-content h4 { font-size: 1.25em; }
        .post-content p {
          margin-bottom: 1.5em;
        }
        .post-content ul,
        .post-content ol {
          margin-bottom: 1.5em;
          padding-left: 2em;
        }
        .post-content li {
          margin-bottom: 0.5em;
        }
        .post-content code {
          background: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .post-content pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 1.5em;
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 1.5em;
          line-height: 1.5;
        }
        .post-content pre code {
          background: none;
          color: inherit;
          padding: 0;
        }
        .post-content blockquote {
          border-left: 4px solid #228be6;
          padding-left: 1.5em;
          margin-left: 0;
          margin-right: 0;
          margin-bottom: 1.5em;
          color: #495057;
          font-style: italic;
        }
        .post-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 2em 0;
        }
        .post-content a {
          color: #228be6;
          text-decoration: none;
          border-bottom: 1px solid #228be6;
        }
        .post-content a:hover {
          color: #1971c2;
          border-bottom-color: #1971c2;
        }
        .post-content hr {
          border: none;
          border-top: 2px solid #e9ecef;
          margin: 3em 0;
        }
        .post-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5em;
        }
        .post-content table th,
        .post-content table td {
          padding: 0.75em;
          border: 1px solid #dee2e6;
        }
        .post-content table th {
          background: #f8f9fa;
          font-weight: 600;
        }
      `}</style>
    </Box>
  );
}
