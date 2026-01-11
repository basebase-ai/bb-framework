/**
 * DocumentUpload - Component for importing text or PDF files
 */
import React, { useState, useCallback } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  FileButton,
  Paper,
  Loader,
  Alert,
} from "@mantine/core";
import {
  IconUpload,
  IconFileText,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { collections, SUPPORTED_LANGUAGES, DEFAULT_SOURCE_LANGUAGE } from "../../schema.js";

/**
 * @param {{ opened: boolean, onClose: () => void, onSuccess: (docId: string) => void }} props
 */
export function DocumentUpload({ opened, onClose, onSuccess }) {
  const { user } = useAuth();
  const { add } = useCollection(collections.documents);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(DEFAULT_SOURCE_LANGUAGE);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  /**
   * Count words in text
   * @param {string} text
   * @returns {number}
   */
  const countWords = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  };

  /**
   * Extract text from PDF file
   * @param {File} file
   */
  const handlePdfUpload = useCallback(async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    setPdfLoading(true);
    setError(null);

    try {
      // Dynamic import of PDF.js
      const pdfjsLib = await import("pdfjs-dist");
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      /** @type {string[]} */
      const textParts = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => /** @type {{ str: string }} */ (item).str)
          .join(" ");
        textParts.push(pageText);
      }

      const extractedText = textParts.join("\n\n");
      setContent(extractedText);

      // Set title from filename if not set
      if (!title) {
        const fileName = file.name.replace(/\.pdf$/i, "");
        setTitle(fileName);
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      setError("Failed to extract text from PDF. Please try a different file or paste text directly.");
    } finally {
      setPdfLoading(false);
    }
  }, [title]);

  /**
   * Handle text file upload
   * @param {File} file
   */
  const handleTextUpload = useCallback(async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      setContent(text);

      if (!title) {
        const fileName = file.name.replace(/\.[^.]+$/, "");
        setTitle(fileName);
      }
    } catch (err) {
      setError("Failed to read text file");
    }
  }, [title]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !user) {
      setError("Please provide a title and content");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const langConfig = SUPPORTED_LANGUAGES[sourceLanguage];
      const docId = await add({
        title: title.trim(),
        content: content.trim(),
        sourceLanguage: langConfig?.code || "no",
        sourceType: "text",
        wordCount: countWords(content),
        lastReadPosition: 0,
      });

      // Reset form
      setTitle("");
      setContent("");
      setSourceLanguage(DEFAULT_SOURCE_LANGUAGE);

      onSuccess(docId);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  const languageOptions = Object.entries(SUPPORTED_LANGUAGES).map(
    ([key, lang]) => ({
      value: key,
      label: lang.name,
    })
  );

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Import Document"
      size="lg"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        <TextInput
          label="Document Title"
          placeholder="Enter a title for this document"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Select
          label="Source Language"
          description="The language of the document"
          data={languageOptions}
          value={sourceLanguage}
          onChange={(val) => val && setSourceLanguage(val)}
          required
        />

        <Paper withBorder p="md" bg="dark.7">
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Upload a file or paste text below
            </Text>
            <Group>
              <FileButton
                onChange={(file) => file && handlePdfUpload(file)}
                accept="application/pdf"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={pdfLoading ? <Loader size={16} /> : <IconUpload size={16} />}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? "Extracting..." : "Upload PDF"}
                  </Button>
                )}
              </FileButton>
              <FileButton
                onChange={(file) => file && handleTextUpload(file)}
                accept=".txt,.md,.text"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={<IconFileText size={16} />}
                  >
                    Upload Text File
                  </Button>
                )}
              </FileButton>
            </Group>
          </Stack>
        </Paper>

        <Textarea
          label="Document Content"
          placeholder="Paste or type your text here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minRows={10}
          maxRows={20}
          autosize
          required
        />

        {content && (
          <Text size="sm" c="dimmed">
            {countWords(content)} words
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!title.trim() || !content.trim()}
            color="pink"
          >
            Import Document
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


