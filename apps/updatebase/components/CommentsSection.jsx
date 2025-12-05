/**
 * CommentsSection - Comments for each update
 */

import React, { useState, useMemo } from "react";
import {
  Stack,
  Paper,
  Group,
  Text,
  Avatar,
  Textarea,
  Button,
  ActionIcon,
  Divider,
  Loader,
  Center,
} from "@mantine/core";
import { IconSend, IconX } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useUserProfile } from "../../../framework/hooks/useUserProfile.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} updateId
 * @property {string} authorId
 * @property {string | undefined} authorName
 * @property {string | undefined} authorPhotoURL
 * @property {string} content
 * @property {Object | null} createdAt
 */

/**
 * Single comment component
 * @param {{ comment: Comment, onDelete: (id: string) => void }} props
 */
function Comment({ comment, onDelete }) {
  const { profiles } = useUserProfiles([comment.authorId]);
  const { user } = useAuth();
  const authorProfile = profiles.get(comment.authorId);

  const canDelete = user?.uid === comment.authorId;

  const formattedDate = comment.createdAt?.toDate
    ? new Date(comment.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <Avatar
              src={authorProfile?.photoURL || comment.authorPhotoURL}
              alt={authorProfile?.displayName || comment.authorName || "User"}
              size="sm"
              radius="xl"
            />
            <div>
              <Text size="sm" fw={500}>
                {authorProfile?.displayName || comment.authorName || "Anonymous"}
              </Text>
              <Text size="xs" c="dimmed">
                {formattedDate}
              </Text>
            </div>
          </Group>
          {canDelete && (
            <ActionIcon
              color="red"
              variant="subtle"
              size="sm"
              onClick={() => onDelete(comment.id)}
            >
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>

        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {comment.content}
        </Text>
      </Stack>
    </Paper>
  );
}

/**
 * Comments section component
 * @param {{ updateId: string, orgId: string }} props
 */
export function CommentsSection({ updateId, orgId }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  // Memoize where clause to prevent infinite re-renders
  const whereClause = useMemo(() => {
    return updateId ? [["updateId", "==", updateId]] : [["updateId", "==", "__none__"]];
  }, [updateId]);

  const {
    data: commentsData,
    loading,
    add: addComment,
    remove: removeComment,
  } = useCollection(collections.comments, {
    where: whereClause,
  });

  // Sort comments client-side (oldest first)
  /** @type {Comment[]} */
  const comments = useMemo(() => {
    return [...commentsData].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });
  }, [commentsData]);

  const handlePostComment = async () => {
    if (!user || !commentText.trim()) return;

    setPosting(true);

    try {
      await addComment({
        orgId,
        updateId,
        authorId: user.uid,
        authorName: profile?.displayName || user.email || "Anonymous",
        authorEmail: user.email || null,
        authorPhotoURL: profile?.photoURL || null,
        content: commentText.trim(),
        parentId: null,
        replyCount: 0,
        isApproved: true,
        isHidden: false,
      });

      setCommentText("");
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await removeComment(commentId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePostComment();
    }
  };

  return (
    <Stack gap="md" pt="md" style={{ borderTop: "1px solid #e9ecef" }}>
      {/* Comments List */}
      {loading ? (
        <Center py="md">
          <Loader size="sm" />
        </Center>
      ) : comments.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No comments yet. Be the first to comment!
        </Text>
      ) : (
        <Stack gap="sm">
          {comments.map((comment) => (
            <Comment key={comment.id} comment={comment} onDelete={handleDeleteComment} />
          ))}
        </Stack>
      )}

      <Divider />

      {/* Add Comment Form */}
      {user ? (
        <Stack gap="sm">
          <Group gap="sm" align="flex-start">
            <Avatar
              src={profile?.photoURL}
              alt={profile?.displayName || user.email || "You"}
              size="sm"
              radius="xl"
            />
            <Textarea
              placeholder="Write a comment... (Ctrl+Enter to submit)"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              minRows={2}
              maxRows={4}
              style={{ flex: 1 }}
            />
          </Group>

          <Group justify="flex-end">
            <Button
              leftSection={<IconSend size={14} />}
              onClick={handlePostComment}
              disabled={!commentText.trim() || posting}
              loading={posting}
              size="sm"
            >
              Comment
            </Button>
          </Group>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" ta="center">
          Please sign in to leave a comment.
        </Text>
      )}
    </Stack>
  );
}
