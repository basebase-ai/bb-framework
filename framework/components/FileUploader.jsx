/**
 * Reusable File Uploader Component
 * Provides drag-and-drop and click-to-upload functionality
 */

import React, { useRef, useState } from "react";
import {
  Group,
  Text,
  Button,
  Paper,
  Stack,
  Progress,
  Badge,
  ActionIcon,
  Image,
} from "@mantine/core";
import { IconUpload, IconX, IconFile, IconPhoto } from "@tabler/icons-react";

export function FileUploader({
  onUpload,
  uploading = false,
  progress = 0,
  accept = "*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  preview = true,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    
    // Filter by size
    const validFiles = fileArray.filter((file) => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    if (!multiple && validFiles.length > 0) {
      validFiles.splice(1);
    }

    setSelectedFiles(validFiles);
    
    if (validFiles.length > 0 && onUpload) {
      onUpload(multiple ? validFiles : validFiles[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
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

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isImage = (file) => {
    return file.type.startsWith("image/");
  };

  return (
    <Stack gap="md">
      <Paper
        p="xl"
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
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          style={{ display: "none" }}
        />

        <Stack align="center" gap="sm">
          <IconUpload size={32} color="#adb5bd" />
          <Text size="sm" ta="center">
            {dragOver ? "Drop files here" : "Click to upload or drag and drop"}
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            {accept !== "*" && `Accepted formats: ${accept}`}
            {maxSize && ` • Max size: ${maxSize / 1024 / 1024}MB`}
          </Text>
        </Stack>
      </Paper>

      {uploading && (
        <Stack gap="xs">
          <Progress value={progress} size="sm" animated />
          <Text size="xs" c="dimmed" ta="center">
            Uploading... {Math.round(progress)}%
          </Text>
        </Stack>
      )}

      {selectedFiles.length > 0 && preview && !uploading && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Selected Files:
          </Text>
          {selectedFiles.map((file, index) => (
            <Paper key={index} p="sm" withBorder>
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
                  ) : (
                    <IconFile size={24} />
                  )}
                  <div>
                    <Text size="sm">{file.name}</Text>
                    <Text size="xs" c="dimmed">
                      {(file.size / 1024).toFixed(1)} KB
                    </Text>
                  </div>
                </Group>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

