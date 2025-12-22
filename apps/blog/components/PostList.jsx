import React, { useState, useMemo } from "react";
import {
  Stack,
  Paper,
  Title,
  Text,
  Group,
  Badge,
  TextInput,
  Button,
  Container,
  Box,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconEye,
} from "@tabler/icons-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollectionOnce } from "../hooks/useCollectionOnce.js";
import { usePublicAuthors } from "../hooks/usePublicAuthors.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * PostList - Homepage/archive view showing all posts
 * Inspired by Ghost's clean blog design
 */
export function PostList({ onNavigate, onCreatePost, onEditPost }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch published posts from public collection (anyone can read)
  // Using one-time fetch to avoid watch stream issues during auth state changes
  const { data: publishedPosts, loading: loadingPublished, error: errorPublished } = useCollectionOnce(
    collections.postsPublic,
    {
      orderBy: ["updatedAt", "desc"],
    }
  );

  // Fetch user's own posts from private collection (if logged in)
  const { data: myPosts, loading: loadingMy, error: errorMy } = useCollectionOnce(
    collections.posts,
    user ? {
      where: [["authorId", "==", user.uid]],
      orderBy: ["updatedAt", "desc"],
    } : null
  );

  // Combine posts: user's own posts (including drafts) + published posts from others
  const allPosts = useMemo(() => {
    const posts = [];
    const seenIds = new Set();

    // Add user's own posts first (includes drafts and published)
    if (myPosts) {
      myPosts.forEach(post => {
        posts.push(post);
        seenIds.add(post.id);
      });
    }

    // Add published posts from others (avoid duplicates)
    if (publishedPosts) {
      publishedPosts.forEach(post => {
        if (!seenIds.has(post.id)) {
          posts.push(post);
        }
      });
    }

    // Sort by updatedAt descending
    posts.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis() || 0;
      const bTime = b.updatedAt?.toMillis() || 0;
      return bTime - aTime;
    });

    return posts;
  }, [myPosts, publishedPosts]);

  const loading = loadingPublished || loadingMy;
  const error = errorPublished || errorMy;

  // Get unique author IDs for profile loading
  const authorIds = useMemo(() => {
    if (!allPosts) return [];
    return [...new Set(allPosts.map((post) => post.authorId))];
  }, [allPosts]);

  const { authors } = usePublicAuthors(authorIds);

  // Filter posts based on search
  const filteredPosts = useMemo(() => {
    if (!allPosts) return [];

    let posts = allPosts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query)
      );
    }

    return posts;
  }, [allPosts, searchQuery]);

  // Separate featured posts
  const featuredPosts = useMemo(() => {
    return filteredPosts.filter((post) => post.featured && post.status === "published");
  }, [filteredPosts]);

  const regularPosts = useMemo(() => {
    return filteredPosts.filter((post) => !post.featured || post.status !== "published");
  }, [filteredPosts]);

  const handleDelete = async (post) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        // Delete from private collection
        const privateDocRef = doc(db, collections.posts, post.id);
        await deleteDoc(privateDocRef);

        // If published, also delete from public collection
        if (post.status === "published") {
          const publicDocRef = doc(db, collections.postsPublic, post.id);
          await deleteDoc(publicDocRef);
        }
      } catch (e) {
        console.error("Error deleting post:", e);
        alert("Failed to delete post: " + e.message);
      }
    }
  };

  const getAuthorName = (authorId) => {
    const author = authors.get(authorId);
    return author?.displayName || "Unknown Author";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Show error state
  if (error) {
    return (
      <Container size="md" py="xl">
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text size="lg" fw={500}>
              Unable to load posts
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              There was an error loading the blog posts. Please refresh the page or try again later.
            </Text>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Only show loading on initial load (when we have no data yet)
  if (loading && !allPosts) {
    return (
      <Container size="md" py="xl">
        <Text c="dimmed" ta="center">
          Loading posts...
        </Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header with search and create */}
        <Group justify="space-between" align="center">
          <TextInput
            placeholder="Search posts..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          {user && (
            <Button leftSection={<IconPlus size={16} />} onClick={onCreatePost}>
              New Post
            </Button>
          )}
        </Group>


        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <Stack gap="md">
            <Title order={3}>Featured</Title>
            {featuredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                authorName={getAuthorName(post.authorId)}
                formatDate={formatDate}
                onNavigate={onNavigate}
                onEdit={onEditPost}
                onDelete={handleDelete}
                currentUserId={user?.uid}
                featured
              />
            ))}
          </Stack>
        )}

        {/* Regular Posts */}
        {regularPosts.length > 0 ? (
          <Stack gap="md">
            {featuredPosts.length > 0 && <Title order={3}>All Posts</Title>}
            {regularPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                authorName={getAuthorName(post.authorId)}
                formatDate={formatDate}
                onNavigate={onNavigate}
                onEdit={onEditPost}
                onDelete={handleDelete}
                currentUserId={user?.uid}
              />
            ))}
          </Stack>
        ) : (
          <Paper p="xl" withBorder>
            <Stack align="center" gap="md">
              <Text size="lg" c="dimmed">
                {user ? "No posts found" : "No published posts yet"}
              </Text>
              <Text size="sm" c="dimmed">
                {user
                  ? "Get started by creating your first blog post"
                  : "Check back soon for new content"}
              </Text>
              {user && (
                <Button leftSection={<IconPlus size={16} />} onClick={onCreatePost}>
                  Create your first post
                </Button>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

/**
 * PostCard - Individual post preview card
 */
function PostCard({
  post,
  authorName,
  formatDate,
  onNavigate,
  onEdit,
  onDelete,
  currentUserId,
  featured = false,
}) {
  const isAuthor = currentUserId === post.authorId;

  return (
    <Paper
      p="lg"
      withBorder
      style={{
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        borderLeft: featured ? "4px solid #228be6" : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
      }}
      onClick={() => onNavigate(post.slug)}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              {post.status === "draft" && (
                <Badge color="gray" variant="light" size="sm">
                  Draft
                </Badge>
              )}
              {featured && (
                <Badge color="blue" variant="light" size="sm">
                  Featured
                </Badge>
              )}
            </Group>

            <Title order={2} size="h3" mb="xs">
              {post.title}
            </Title>

            {post.excerpt && (
              <Text c="dimmed" lineClamp={2} mb="xs">
                {post.excerpt}
              </Text>
            )}

            <Group gap="md">
              <Text size="sm" c="dimmed">
                {authorName}
              </Text>
              <Text size="sm" c="dimmed">
                {formatDate(post.publishedAt || post.createdAt)}
              </Text>
              {post.readingTime > 0 && (
                <Text size="sm" c="dimmed">
                  {post.readingTime} min read
                </Text>
              )}
            </Group>
          </Box>

          {isAuthor && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEye size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(post.slug);
                  }}
                >
                  View
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconEdit size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(post);
                  }}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(post);
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
