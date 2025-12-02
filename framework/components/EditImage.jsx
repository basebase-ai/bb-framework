/**
 * EditImage - Image uploader with preview and clear
 * Upload image to Firebase Storage and return URL
 */

import React, { useState } from "react";
import {
  Stack,
  Group,
  Button,
  Avatar,
  Text,
  Progress,
  Paper,
} from "@mantine/core";
import { IconUpload, IconX, IconPhoto } from "@tabler/icons-react";

export function EditImage({
  value,
  onChange,
  onUpload,
  uploading = false,
  progress = 0,
  size = 100,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    
    // Validate file size
    if (file.size > maxSize) {
      alert(`Image is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return;
    }
    
    if (onUpload) {
      await onUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    if (onChange) {
      onChange("");
    }
  };

  return (
    <Stack gap="md" align="center">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: "none" }}
      />

      {/* Avatar Preview */}
      <Paper
        p="md"
        withBorder
        style={{
          borderStyle: dragOver ? "solid" : "dashed",
          borderColor: dragOver ? "#228be6" : "#ced4da",
          borderWidth: 2,
          backgroundColor: dragOver ? "#f0f7ff" : "transparent",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Stack align="center" gap="sm">
          <Avatar src={value} size={size} radius="xl">
            <IconPhoto size={size / 2} />
          </Avatar>
          {!uploading && (
            <Text size="xs" c="dimmed" ta="center">
              {value ? "Click to change" : "Click or drag to upload"}
            </Text>
          )}
        </Stack>
      </Paper>

      {/* Upload Progress */}
      {uploading && (
        <Stack gap="xs" style={{ width: "100%" }}>
          <Progress value={progress} size="sm" animated />
          <Text size="xs" c="dimmed" ta="center">
            Uploading... {Math.round(progress)}%
          </Text>
        </Stack>
      )}

      {/* Actions */}
      {!uploading && (
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconUpload size={14} />}
            onClick={handleClick}
          >
            {value ? "Change Photo" : "Upload Photo"}
          </Button>
          {value && (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconX size={14} />}
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </Group>
      )}

      <Text size="xs" c="dimmed" ta="center">
        Max size: {maxSize / 1024 / 1024}MB
      </Text>
    </Stack>
  );
}

