/**
 * NotesBoard - Sticky notes board with drag-to-reorder
 */

import React, { useState, useEffect } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  ColorSwatch,
  Tooltip,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { NoteCard } from "./NoteCard.jsx";

const NOTE_COLORS = [
  { key: "yellow", value: "#fef9c3", label: "Yellow" },
  { key: "pink", value: "#fce7f3", label: "Pink" },
  { key: "blue", value: "#dbeafe", label: "Blue" },
  { key: "green", value: "#d1fae5", label: "Green" },
  { key: "orange", value: "#fed7aa", label: "Orange" },
  { key: "purple", value: "#e9d5ff", label: "Purple" },
];

export function NotesBoard() {
  const { user } = useAuth();
  const [draggedNote, setDraggedNote] = useState(null);
  const [selectedColor, setSelectedColor] = useState("yellow");

  const { data: notes, loading, error, add, update, remove } = useCollection(collections.notes);

  // Debug logging (only log once when loading changes or error appears)
  React.useEffect(() => {
    console.log('NotesBoard state:', { 
      collection: collections.notes,
      loading, 
      notesCount: notes.length,
      error: error?.message 
    });
  }, [loading, notes.length, error]);

  const handleAddNote = async () => {
    if (!user) return;

    // Place new notes in a staggered position
    const offset = notes.length * 20;

    await add({
      text: "Click to edit...",
      color: selectedColor,
      owner: user.uid,
      likes: [],
      x: 100 + offset,
      y: 100 + offset,
    });
  };

  const handleDragStart = (e, note) => {
    setDraggedNote(note);
    // Store the offset between mouse and note top-left corner
    const rect = e.currentTarget.getBoundingClientRect();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("offsetX", e.clientX - rect.left);
    e.dataTransfer.setData("offsetY", e.clientY - rect.top);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e) => {
    e.preventDefault();

    if (!draggedNote) return;

    // Get the canvas container position
    const canvas = e.currentTarget;
    const canvasRect = canvas.getBoundingClientRect();

    // Get stored offsets
    const offsetX = parseFloat(e.dataTransfer.getData("offsetX")) || 0;
    const offsetY = parseFloat(e.dataTransfer.getData("offsetY")) || 0;

    // Calculate new position relative to canvas
    const x = e.clientX - canvasRect.left - offsetX;
    const y = e.clientY - canvasRect.top - offsetY;

    // Update note position and timestamp (for z-index)
    await update(draggedNote.id, { x, y });

    setDraggedNote(null);
  };

  if (loading) {
    return (
      <Paper p="xl" withBorder>
        <Text size="lg" c="dimmed" ta="center">
          Loading notes...
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Sticky Notes Board</Title>
          <Text size="sm" c="dimmed">
            Create colorful notes, like them, and drag to reorder
          </Text>
        </div>
      </Group>

      {/* Add Note Section */}
      <Paper p="md" withBorder>
        <Group gap="md" align="center">
          <Text size="sm" fw={500}>
            New note color:
          </Text>
          <Group gap="xs">
            {NOTE_COLORS.map((color) => (
              <Tooltip key={color.key} label={color.label}>
                <ColorSwatch
                  color={color.value}
                  size={30}
                  style={{
                    cursor: "pointer",
                    border:
                      selectedColor === color.key ? "3px solid #228be6" : "2px solid #ddd",
                  }}
                  onClick={() => setSelectedColor(color.key)}
                />
              </Tooltip>
            ))}
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddNote}>
            Add Note
          </Button>
        </Group>
      </Paper>

      {/* Notes Canvas */}
      {notes.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text size="lg" c="dimmed" ta="center">
            No notes yet. Click "Add Note" to create one!
          </Text>
        </Paper>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            position: "relative",
            minHeight: "600px",
            border: "2px dashed #e9ecef",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          {notes
            .slice()
            .sort((a, b) => {
              const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
              const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
              return aTime - bTime; // Oldest first
            })
            .map((note, index) => {
            // Use index as z-index (1-100) so modals can appear on top
            const zIndex = index + 1;
            
            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note)}
                style={{
                  position: "absolute",
                  left: `${note.x || 0}px`,
                  top: `${note.y || 0}px`,
                  width: "200px",
                  cursor: "move",
                  zIndex,
                }}
              >
                <NoteCard
                  note={note}
                  onUpdate={update}
                  onDelete={remove}
                  isDragging={draggedNote?.id === note.id}
                />
              </div>
            );
          })}
        </div>
      )}
    </Stack>
  );
}

