/**
 * CreateDocModal - Modal for creating new documentation pages
 */

import React, { useState } from "react";
import {
  Modal,
  TextInput,
  Select,
  Button,
  Stack,
  NumberInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DOC_CATEGORIES } from "../schema.js";

/**
 * @param {{
 *   opened: boolean;
 *   onClose: () => void;
 *   onCreate: (data: { slug: string; title: string; category: string; order: number }) => Promise<void>;
 * }} props
 */
export function CreateDocModal({ opened, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [order, setOrder] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // Auto-generate slug from title
  const generateSlug = (/** @type {string} */ text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (/** @type {string} */ value) => {
    setTitle(value);
    // Only auto-update slug if it hasn't been manually edited
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      notifications.show({
        title: "Error",
        message: "Title is required",
        color: "red",
      });
      return;
    }

    if (!slug.trim()) {
      notifications.show({
        title: "Error",
        message: "Slug is required",
        color: "red",
      });
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        slug: slug.trim(),
        category,
        order,
      });
      
      // Reset form
      setTitle("");
      setSlug("");
      setCategory(DOC_CATEGORIES[0]);
      setOrder(0);
      onClose();
      
      notifications.show({
        title: "Success",
        message: "Document created",
        color: "green",
      });
    } catch (error) {
      console.error("Error creating doc:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create document",
        color: "red",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setTitle("");
      setSlug("");
      setCategory(DOC_CATEGORIES[0]);
      setOrder(0);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create New Document"
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="e.g., Getting Started"
          value={title}
          onChange={(e) => handleTitleChange(e.currentTarget.value)}
          required
        />

        <TextInput
          label="Slug"
          description="URL-friendly identifier"
          placeholder="e.g., getting-started"
          value={slug}
          onChange={(e) => setSlug(e.currentTarget.value)}
          required
        />

        <Select
          label="Category"
          data={DOC_CATEGORIES}
          value={category}
          onChange={(val) => setCategory(val || DOC_CATEGORIES[0])}
          required
        />

        <NumberInput
          label="Order"
          description="Sort order within category (lower = first)"
          value={order}
          onChange={(val) => setOrder(typeof val === 'number' ? val : 0)}
          min={0}
        />

        <Button
          onClick={handleCreate}
          loading={isCreating}
          fullWidth
          mt="md"
        >
          Create Document
        </Button>
      </Stack>
    </Modal>
  );
}

