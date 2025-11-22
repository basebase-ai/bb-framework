/**
 * NoteCard - A colorful sticky note component
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  Text,
  Textarea,
  ActionIcon,
  Group,
  Avatar,
  Tooltip,
} from "@mantine/core";
import { IconTrash, IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useAuth } from "../../framework/hooks/useAuth.js";
import { useUserProfile } from "../../framework/hooks/useUserProfile.js";

const NOTE_COLORS = {
  yellow: "#fef9c3",
  pink: "#fce7f3",
  blue: "#dbeafe",
  green: "#d1fae5",
  orange: "#fed7aa",
  purple: "#e9d5ff",
};

export function NoteCard({ note, onUpdate, onDelete, isDragging }) {
  const { user } = useAuth();
  const { profile: ownerProfile } = useUserProfile(note.owner);
  const [text, setText] = useState(note.text);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const handleBlur = async () => {
    setIsEditing(false);
    const trimmedText = text.trim();
    
    // If empty, set a default
    if (!trimmedText) {
      const defaultText = "Click to edit...";
      setText(defaultText);
      if (note.text !== defaultText) {
        await onUpdate(note.id, { text: defaultText });
      }
      return;
    }
    
    // If changed, update
    if (trimmedText !== note.text) {
      await onUpdate(note.id, { text: trimmedText });
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    // Clear placeholder text on first focus
    if (text === "Click to edit...") {
      setText("");
    }
  };

  const handleLike = async () => {
    const likes = note.likes || [];
    const hasLiked = likes.includes(user?.uid);
    
    const newLikes = hasLiked
      ? likes.filter(uid => uid !== user?.uid)
      : [...likes, user?.uid];
    
    await onUpdate(note.id, { likes: newLikes });
  };

  const isOwner = user?.uid === note.owner;
  const hasLiked = (note.likes || []).includes(user?.uid);
  const likeCount = (note.likes || []).length;

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{
        backgroundColor: NOTE_COLORS[note.color] || NOTE_COLORS.yellow,
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        height: "200px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Note Text */}
      <div style={{ flex: 1, marginBottom: "0.5rem" }}>
        {isEditing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setText(note.text);
                setIsEditing(false);
              }
            }}
            autoFocus
            minRows={4}
            maxRows={6}
            styles={{
              input: {
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
                fontSize: "0.875rem",
              },
            }}
          />
        ) : (
          <Text
            size="sm"
            style={{
              cursor: isOwner ? "text" : "default",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              color: text === "Click to edit..." ? "#aaa" : "inherit",
            }}
            onClick={() => isOwner && handleFocus()}
          >
            {note.text}
          </Text>
        )}
      </div>

      {/* Footer: Owner + Actions */}
      <Group justify="space-between" align="center">
        <Tooltip label={ownerProfile?.displayName || ownerProfile?.email || "Unknown"}>
          <Avatar
            src={ownerProfile?.photoURL}
            alt={ownerProfile?.displayName}
            size="xs"
            radius="xl"
          />
        </Tooltip>

        <Group gap={4}>
          {/* Like Button */}
          <ActionIcon
            variant="subtle"
            color={hasLiked ? "red" : "gray"}
            size="sm"
            onClick={handleLike}
          >
            {hasLiked ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
          </ActionIcon>
          {likeCount > 0 && (
            <Text size="xs" c="dimmed">
              {likeCount}
            </Text>
          )}

          {/* Delete Button (owner only) */}
          {isOwner && (
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => onDelete(note.id)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Card>
  );
}

