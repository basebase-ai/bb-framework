/**
 * UploadDocumentModal - Upload new PDF documents with AI summarization
 */

import React, { useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
  Progress,
  Alert,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUpload, IconFile, IconAlertCircle, IconSparkles } from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useStorage } from "../../../framework/hooks/useStorage.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { FileUploader } from "../../../framework/components/FileUploader.jsx";
import { APP_ID, collections } from "../schema.js";

// Load PDF.js from CDN
let pdfjsLib = null;
const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;
  
  // Load PDF.js library dynamically
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  document.head.appendChild(script);
  
  await new Promise((resolve) => {
    script.onload = resolve;
  });
  
  pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  
  return pdfjsLib;
};

/**
 * Extract text from a PDF file
 * @param {File} file - PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 20); // Limit to first 20 pages
  
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  
  // Truncate to ~10000 chars for LLM context
  if (fullText.length > 10000) {
    fullText = fullText.substring(0, 10000) + "...[truncated]";
  }
  
  return fullText;
}

/**
 * @typedef {Object} UploadDocumentModalProps
 * @property {boolean} opened
 * @property {Function} onClose
 */

/**
 * @param {UploadDocumentModalProps} props
 */
export function UploadDocumentModal({ opened, onClose }) {
  const { user } = useAuth();
  const { upload, uploading, progress } = useStorage(APP_ID);
  const { add: addDocument, update: updateDocument } = useCollection(collections.documents);
  const { call: callLLM } = useFunction("askLLM");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(null);

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedFile(null);
    setError(null);
    setStatusMessage("");
  };

  // Handle close
  const handleClose = () => {
    if (!uploading && !saving && !summarizing) {
      resetForm();
      onClose();
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (file.type !== "application/pdf") {
      setError("Please select a PDF file");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
      setTitle(nameWithoutExt);
    }
  };

  // Generate summary using LLM
  const generateSummary = async (file, docId) => {
    try {
      setSummarizing(true);
      setStatusMessage("Extracting text from PDF...");
      
      const pdfText = await extractPdfText(file);
      
      if (!pdfText || pdfText.trim().length < 50) {
        console.log("PDF text too short, skipping summary");
        return null;
      }
      
      setStatusMessage("Generating AI summary...");
      
      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: `Please provide a concise summary of the following document. The summary should:
1. Explain what type of document this is (contract, agreement, letter, etc.)
2. Identify the main parties involved (if applicable)
3. Summarize the key points and obligations
4. Highlight any important dates, amounts, or deadlines
5. Note anything that would be important for someone who needs to sign this document

Keep the summary to 2-3 paragraphs maximum.

Document text:
${pdfText}`,
        options: { maxTokens: 500 },
      });
      
      if (result?.response) {
        // Update the document with the summary
        await updateDocument(docId, {
          summary: result.response,
          summaryGeneratedAt: new Date(),
        });
        return result.response;
      }
      return null;
    } catch (err) {
      console.error("Error generating summary:", err);
      // Don't fail the upload if summary fails
      return null;
    } finally {
      setSummarizing(false);
      setStatusMessage("");
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a PDF file to upload");
      return;
    }

    setSaving(true);
    setError(null);
    setStatusMessage("Uploading document...");

    try {
      // Generate unique path
      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `documents/${user.uid}/${timestamp}_${safeName}`;

      // Upload file to storage
      const uploadResult = await upload(selectedFile, path);

      // Create document record in Firestore
      const docId = await addDocument({
        name: selectedFile.name,
        title: title.trim() || selectedFile.name.replace(/\.pdf$/i, ""),
        description: description.trim() || null,
        fileUrl: uploadResult.url,
        filePath: uploadResult.path,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        signers: [],
        status: "draft",
      });

      setSaving(false);

      // Generate summary in background (don't block)
      await generateSummary(selectedFile, docId);

      notifications.show({
        title: "Success",
        message: "Document uploaded and summarized!",
        color: "green",
        icon: <IconSparkles size={16} />,
      });

      resetForm();
      onClose();
    } catch (err) {
      console.error("Error uploading document:", err);
      setError(err.message || "Failed to upload document");
      setSaving(false);
      setSummarizing(false);
      setStatusMessage("");
    }
  };

  const isProcessing = uploading || saving || summarizing;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Upload Document"
      size="lg"
      closeOnClickOutside={!isProcessing}
      closeOnEscape={!isProcessing}
    >
      <Stack gap="md">
        {/* File Upload */}
        <FileUploader
          onUpload={handleFileSelect}
          accept=".pdf,application/pdf"
          maxSize={50 * 1024 * 1024} // 50MB
          preview={false}
        />

        {/* Selected File Info */}
        {selectedFile && (
          <Group gap="sm" p="sm" bg="blue.0" style={{ borderRadius: 8 }}>
            <IconFile size={20} />
            <Stack gap={0} style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {selectedFile.name}
              </Text>
              <Text size="xs" c="dimmed">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </Stack>
          </Group>
        )}

        {/* Title */}
        <TextInput
          label="Document Title"
          placeholder="Enter a title for this document"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isProcessing}
        />

        {/* Description */}
        <Textarea
          label="Description (optional)"
          placeholder="Add a description or notes about this document"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={2}
          maxRows={4}
          disabled={isProcessing}
        />

        {/* Upload/Summarization Progress */}
        {(uploading || statusMessage) && (
          <Stack gap="xs">
            <Group gap="xs">
              {summarizing && <IconSparkles size={16} color="#228be6" />}
              <Text size="sm">{statusMessage || "Uploading document..."}</Text>
            </Group>
            {uploading && <Progress value={progress} size="sm" animated />}
            {summarizing && <Progress size="sm" animated color="blue" value={100} />}
          </Stack>
        )}

        {/* Error */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
          >
            {error}
          </Alert>
        )}

        {/* Info about AI summary */}
        <Alert icon={<IconSparkles size={16} />} color="blue" variant="light">
          After upload, an AI will automatically generate a summary of the document to help signers understand what they're signing.
        </Alert>

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={isProcessing}
            disabled={!selectedFile}
            leftSection={<IconUpload size={16} />}
          >
            Upload Document
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

