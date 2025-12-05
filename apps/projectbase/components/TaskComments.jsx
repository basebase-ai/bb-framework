/**
 * TaskComments - Comments section for tasks
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
  Image,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { IconSend, IconPaperclip, IconX, IconFile, IconDownload } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useUserProfiles } from "../../../framework/hooks/useUserProfiles.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { collections, APP_ID } from "../schema.js";

function CommentAttachment({ attachment }) {
  const isImage = attachment.type?.startsWith("image/");

  return (
    <Paper p="xs" withBorder>
      <Group gap="xs">
        {isImage ? (
          <Image
            src={attachment.url}
            alt={attachment.name}
            width={60}
            height={60}
            fit="cover"
            radius="sm"
            style={{ cursor: "pointer" }}
            onClick={() => window.open(attachment.url, "_blank")}
          />
        ) : (
          <Group gap="xs">
            <IconFile size={20} />
            <Text size="xs">{attachment.name}</Text>
          </Group>
        )}
        <ActionIcon
          component="a"
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="subtle"
          size="sm"
        >
          <IconDownload size={14} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

function Comment({ comment, onDelete }) {
  const { profiles } = useUserProfiles([comment.authorId]);
  const { user } = useAuth();
  const authorProfile = profiles.get(comment.authorId);

  const canDelete = user?.uid === comment.authorId;

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <Avatar
              src={authorProfile?.photoURL}
              alt={authorProfile?.displayName || "User"}
              size="md"
              radius="xl"
            />
            <div>
              <Text size="sm" fw={500}>
                {authorProfile?.displayName || authorProfile?.email || "Unknown User"}
              </Text>
              <Text size="xs" c="dimmed">
                {comment.createdAt?.toDate
                  ? new Date(comment.createdAt.toDate()).toLocaleString()
                  : "Just now"}
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
          {comment.text}
        </Text>

        {comment.attachments && comment.attachments.length > 0 && (
          <Group gap="xs">
            {comment.attachments.map((attachment, index) => (
              <CommentAttachment key={index} attachment={attachment} />
            ))}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

export function TaskComments({ task, onUpdateTask }) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [posting, setPosting] = useState(false);

  const { upload, uploading, progress } = useStorage(APP_ID);

  // Memoize where clause
  const whereClause = useMemo(() => {
    return task ? [["taskId", "==", task.id]] : [["taskId", "==", "__none__"]];
  }, [task?.id]);

  const { data: commentsData, add: addComment, remove: removeComment } = useCollection(
    collections.comments,
    {
      where: whereClause,
    }
  );

  // Sort comments client-side to avoid composite index
  const comments = useMemo(() => {
    return [...commentsData].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime; // asc order (oldest first)
    });
  }, [commentsData]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostComment = async () => {
    if (!user || !task || (!commentText.trim() && selectedFiles.length === 0)) return;

    setPosting(true);

    try {
      // 1. Upload files
      const uploadedAttachments = await Promise.all(
        selectedFiles.map(async (file) => {
          const path = `tasks/${task.id}/comments/${Date.now()}_${file.name}`;
          const result = await upload(file, path);
          return {
            url: result.url,
            name: file.name,
            path: result.path,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
          };
        })
      );

      // 2. Create comment
      const newComment = await addComment({
        taskId: task.id,
        projectId: task.projectId,
        text: commentText.trim(),
        authorId: user.uid,
        attachments: uploadedAttachments,
      });

      // 3. Add attachments to task with commentId reference
      if (uploadedAttachments.length > 0) {
        const taskAttachmentsWithCommentId = uploadedAttachments.map((att) => ({
          ...att,
          commentId: newComment,
        }));

        await onUpdateTask(task.id, {
          attachments: [...(task.attachments || []), ...taskAttachmentsWithCommentId],
        });
      }

      // Clear form
      setCommentText("");
      setSelectedFiles([]);
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
      // Find comment to get its attachments
      const comment = comments.find((c) => c.id === commentId);

      // Delete comment
      await removeComment(commentId);

      // Remove comment's attachments from task
      if (comment?.attachments && comment.attachments.length > 0 && task) {
        const updatedAttachments = (task.attachments || []).filter(
          (att) => att.commentId !== commentId
        );

        await onUpdateTask(task.id, {
          attachments: updatedAttachments,
        });
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };

  if (!task) return null;

  return (
    <Stack gap="md">
      <Text size="sm" fw={500}>
        Comments ({comments.length})
      </Text>

      {/* Comments List */}
      <Stack gap="sm" style={{ maxHeight: "400px", overflowY: "auto" }}>
        {comments.length === 0 ? (
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed" ta="center">
              No comments yet. Be the first to comment!
            </Text>
          </Paper>
        ) : (
          comments.map((comment) => (
            <Comment key={comment.id} comment={comment} onDelete={handleDeleteComment} />
          ))
        )}
      </Stack>

      <Divider />

      {/* Add Comment Form */}
      <Stack gap="sm">
        <Textarea
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          minRows={2}
          maxRows={6}
        />

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <Stack gap="xs">
            {selectedFiles.map((file, index) => (
              <Paper key={index} p="xs" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconFile size={16} />
                    <Text size="xs">{file.name}</Text>
                  </Group>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}

        <Group justify="space-between">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconPaperclip size={14} />}
            component="label"
            disabled={posting || uploading}
          >
            Attach Files
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </Button>

          <Button
            leftSection={<IconSend size={14} />}
            onClick={handlePostComment}
            disabled={(!commentText.trim() && selectedFiles.length === 0) || posting}
            loading={posting || uploading}
            size="sm"
          >
            {uploading ? `Uploading... ${Math.round(progress)}%` : "Comment"}
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}

