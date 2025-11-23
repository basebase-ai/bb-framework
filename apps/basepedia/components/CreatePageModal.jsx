/**
 * CreatePageModal - Modal for creating a new wiki page
 */

import React, { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";

export function CreatePageModal({ opened, onClose, onPageCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Remove consecutive hyphens
  };

  const handleCreate = async () => {
    if (!user) {
      notifications.show({
        title: "Authentication required",
        message: "Please sign in to create pages",
        color: "red",
      });
      return;
    }

    if (!title.trim()) {
      notifications.show({
        title: "Title required",
        message: "Please enter a page title",
        color: "red",
      });
      return;
    }

    setIsCreating(true);
    try {
      const slug = generateSlug(title);

      // Check if slug already exists
      const pagesRef = collection(db, collections.pages);
      const q = query(pagesRef, where("slug", "==", slug));
      const existingPages = await getDocs(q);

      if (!existingPages.empty) {
        notifications.show({
          title: "Page already exists",
          message: "A page with this title already exists",
          color: "red",
        });
        setIsCreating(false);
        return;
      }

      // Create the page
      await addDoc(pagesRef, {
        title: title.trim(),
        slug,
        content: "",
        createdBy: user.uid,
        contributors: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      notifications.show({
        title: "Success",
        message: "Page created successfully",
        color: "green",
      });

      setTitle("");
      onClose();
      onPageCreated(slug);
    } catch (error) {
      console.error("Error creating page:", error);
      notifications.show({
        title: "Error",
        message: "Failed to create page",
        color: "red",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setTitle("");
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create New Page"
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Page Title"
          placeholder="e.g., Introduction to Machine Learning"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreate();
            }
          }}
          disabled={isCreating}
        />

        {title.trim() && (
          <Text size="xs" c="dimmed">
            URL will be: /{generateSlug(title)}
          </Text>
        )}

        <Button
          onClick={handleCreate}
          loading={isCreating}
          fullWidth
        >
          Create Page
        </Button>
      </Stack>
    </Modal>
  );
}

