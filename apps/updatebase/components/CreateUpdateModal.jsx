/**
 * CreateUpdateModal - Create/edit updates with text, images, and videos
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Group,
  Button,
  Text,
  Paper,
  ActionIcon,
  Image,
  SimpleGrid,
  Progress,
  Badge,
} from "@mantine/core";
import { IconUpload, IconX, IconPhoto, IconVideo, IconFile } from "@tabler/icons-react";
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { APP_ID, VISIBILITY_OPTIONS } from "../schema.js";

/**
 * @typedef {Object} MediaItem
 * @property {'image' | 'video'} type
 * @property {string} url
 * @property {string | null} thumbnailUrl
 * @property {string} name
 * @property {string} path
 * @property {number} size
 * @property {string} mimeType
 */

/**
 * @typedef {Object} Update
 * @property {string | undefined} id
 * @property {string} title
 * @property {string} content
 * @property {string} visibility
 * @property {MediaItem[]} media
 */

/**
 * @param {{ opened: boolean, onClose: () => void, onSave: (data: Partial<Update>) => Promise<void>, update: Update | null, orgId: string }} props
 */
export function CreateUpdateModal({ opened, onClose, onSave, update, orgId }) {
  const { user } = useAuth();
  const { upload, uploading, progress } = useStorage(APP_ID);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("draft");
  /** @type {[MediaItem[], React.Dispatch<React.SetStateAction<MediaItem[]>>]} */
  const [media, setMedia] = useState([]);
  /** @type {[File[], React.Dispatch<React.SetStateAction<File[]>>]} */
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes or update changes
  useEffect(() => {
    if (opened) {
      if (update) {
        setTitle(update.title || "");
        setContent(update.content || "");
        setVisibility(update.visibility || "draft");
        setMedia(update.media || []);
      } else {
        setTitle("");
        setContent("");
        setVisibility("draft");
        setMedia([]);
      }
      setPendingFiles([]);
    }
  }, [opened, update]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter valid files (images and videos)
    /** @type {File[]} */
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/") || file.type.startsWith("video/");
      const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(
          `File "${file.name}" is too large. Max size: ${file.type.startsWith("video/") ? "100MB" : "10MB"}`
        );
        return false;
      }
      return isValid;
    });

    setPendingFiles((prev) => [...prev, ...validFiles]);
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (index) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    setSaving(true);

    try {
      // Upload pending files
      /** @type {MediaItem[]} */
      const uploadedMedia = await Promise.all(
        pendingFiles.map(async (file) => {
          const timestamp = Date.now();
          const path = `updates/${user?.uid}/${timestamp}_${file.name}`;
          const result = await upload(file, path);

          return {
            type: file.type.startsWith("video/") ? "video" : "image",
            url: result.url,
            thumbnailUrl: null,
            name: file.name,
            path: result.path,
            size: file.size,
            mimeType: file.type,
          };
        })
      );

      // Combine existing and new media
      const allMedia = [...media, ...uploadedMedia];

      // Create excerpt from content (first 200 chars)
      const excerpt = content.substring(0, 200) + (content.length > 200 ? "..." : "");

      await onSave({
        title: title.trim(),
        content: content.trim(),
        excerpt,
        visibility,
        media: allMedia,
        // Set publishedAt if publishing
        ...(visibility !== "draft" && !update?.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      });

      onClose();
    } catch (error) {
      console.error("Failed to save update:", error);
      alert("Failed to save update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isImage = (file) => file.type?.startsWith("image/") || false;
  const isVideo = (file) => file.type?.startsWith("video/") || false;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={update ? "Edit Update" : "Create Update"}
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="What's the headline?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Content"
          placeholder="Share your progress, milestones, challenges, and wins..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minRows={6}
          maxRows={12}
          required
        />

        <Select
          label="Visibility"
          data={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(val) => setVisibility(val || "draft")}
        />

        {/* Existing Media */}
        {media.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Attached Media
            </Text>
            <SimpleGrid cols={3} spacing="sm">
              {media.map((item, index) => (
                <Paper key={index} p="xs" withBorder style={{ position: "relative" }}>
                  {item.type === "image" ? (
                    <Image src={item.url} alt={item.name} height={80} fit="cover" radius="sm" />
                  ) : (
                    <Group gap="xs" p="sm">
                      <IconVideo size={20} />
                      <Text size="xs" lineClamp={1}>
                        {item.name}
                      </Text>
                    </Group>
                  )}
                  <ActionIcon
                    color="red"
                    variant="filled"
                    size="xs"
                    style={{ position: "absolute", top: 4, right: 4 }}
                    onClick={() => removeExistingMedia(index)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        )}

        {/* Pending Files */}
        {pendingFiles.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Files to Upload
            </Text>
            {pendingFiles.map((file, index) => (
              <Paper key={index} p="xs" withBorder>
                <Group justify="space-between">
                  <Group gap="sm">
                    {isImage(file) ? (
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        width={40}
                        height={40}
                        fit="cover"
                        radius="sm"
                      />
                    ) : isVideo(file) ? (
                      <IconVideo size={24} />
                    ) : (
                      <IconFile size={24} />
                    )}
                    <div>
                      <Text size="sm">{file.name}</Text>
                      <Text size="xs" c="dimmed">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon color="red" variant="subtle" onClick={() => removePendingFile(index)}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Stack gap="xs">
            <Progress value={progress} size="sm" animated />
            <Text size="xs" c="dimmed" ta="center">
              Uploading... {Math.round(progress)}%
            </Text>
          </Stack>
        )}

        {/* File Upload Button */}
        <Button
          variant="outline"
          leftSection={<IconUpload size={16} />}
          component="label"
          disabled={saving || uploading}
        >
          Add Images or Videos
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </Button>

        <Group gap="xs">
          <Badge variant="light" color="gray" size="xs">
            <IconPhoto size={10} /> Images: max 10MB
          </Badge>
          <Badge variant="light" color="gray" size="xs">
            <IconVideo size={10} /> Videos: max 100MB
          </Badge>
        </Group>

        {/* Actions */}
        <Group justify="flex-end" pt="md">
          <Button variant="subtle" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving || uploading}>
            {update ? "Save Changes" : "Create Update"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
