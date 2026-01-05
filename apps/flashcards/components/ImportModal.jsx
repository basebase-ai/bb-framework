/**
 * ImportModal - Import flashcards from Anki text format
 * 
 * Supports Anki's plain text export:
 * - #separator:tab, #html:true directives
 * - Multi-line quoted fields
 * - HTML to readable text conversion
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
  Alert,
  FileInput,
  Switch,
  Paper,
  Badge,
  Box,
  Code,
} from "@mantine/core";
import {
  IconUpload,
  IconFile,
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * Convert HTML to readable plain text, preserving structure
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  let text = html;
  
  // Convert block elements to line breaks BEFORE stripping tags
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");
  
  // Add bullets for list items
  text = text.replace(/<li[^>]*>/gi, "• ");
  
  // Add emphasis markers for bold/italic
  text = text.replace(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/gi, "**$2**");
  text = text.replace(/<(i|em)[^>]*>(.*?)<\/(i|em)>/gi, "_$2_");
  
  // Create a temporary element to parse remaining HTML and decode entities
  const temp = document.createElement("div");
  temp.innerHTML = text;
  text = temp.textContent || temp.innerText || "";
  
  // Clean up whitespace while preserving intentional line breaks
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
  
  return text;
}

/**
 * Parse Anki text format into cards
 * @param {string} text
 * @param {boolean} stripHtmlContent
 * @returns {{ cards: { front: string, back: string }[], metadata: { separator: string, isHtml: boolean } }}
 */
function parseAnkiText(text, stripHtmlContent) {
  /** @type {{ front: string, back: string }[]} */
  const cards = [];
  
  let separator = "\t";
  let isHtml = false;
  
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#")) break;
    
    const directive = trimmed.toLowerCase();
    if (directive.startsWith("#separator:")) {
      const sepValue = trimmed.substring("#separator:".length).trim().toLowerCase();
      if (sepValue === "tab") {
        separator = "\t";
      } else if (sepValue === "semicolon") {
        separator = ";";
      } else if (sepValue === "comma") {
        separator = ",";
      } else if (sepValue === "space") {
        separator = " ";
      } else if (sepValue.length === 1) {
        separator = sepValue;
      }
    } else if (directive.startsWith("#html:")) {
      const htmlValue = trimmed.substring("#html:".length).trim().toLowerCase();
      isHtml = htmlValue === "true" || htmlValue === "1";
    }
  }
  
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith("#")) {
      contentStart = i;
      break;
    }
    contentStart = i + 1;
  }
  
  const content = lines.slice(contentStart).join("\n");
  const records = parseMultilineRecords(content, separator);
  
  let skipped = 0;
  for (const record of records) {
    if (record.length >= 2) {
      let front = record[0];
      let back = record.slice(1).join(separator);
      
      if (stripHtmlContent && isHtml) {
        front = stripHtml(front);
        back = stripHtml(back);
      }
      
      if (front && back) {
        cards.push({ front, back });
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`[Import] Parsed ${cards.length} cards` + (skipped > 0 ? `, skipped ${skipped}` : ""));
  
  return { cards, metadata: { separator, isHtml } };
}

/**
 * Parse content into records, handling multi-line quoted fields
 * @param {string} content
 * @param {string} separator
 * @returns {string[][]}
 */
function parseMultilineRecords(content, separator) {
  /** @type {string[][]} */
  const records = [];
  /** @type {string[]} */
  let currentRecord = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  
  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (!inQuotes) {
        inQuotes = true;
        i++;
        continue;
      } else if (nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else {
        inQuotes = false;
        i++;
        continue;
      }
    }
    
    if (!inQuotes) {
      if (char === separator) {
        currentRecord.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      }
      
      if (char === "\n" || char === "\r") {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        
        if (currentField.trim() || currentRecord.length > 0) {
          currentRecord.push(currentField.trim());
          if (currentRecord.some(f => f.length > 0)) {
            records.push(currentRecord);
          }
        }
        currentRecord = [];
        currentField = "";
        i++;
        continue;
      }
    }
    
    currentField += char;
    i++;
  }
  
  if (currentField.trim() || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some(f => f.length > 0)) {
      records.push(currentRecord);
    }
  }

  return records;
}

/**
 * @param {{ opened: boolean, onClose: () => void }} props
 */
export function ImportModal({ opened, onClose }) {
  const { user } = useAuth();
  const [deckName, setDeckName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [stripHtmlEnabled, setStripHtmlEnabled] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [success, setSuccess] = useState(false);
  const [previewCards, setPreviewCards] = useState(/** @type {{ front: string, back: string }[]} */ ([]));
  const [detectedFormat, setDetectedFormat] = useState(/** @type {{ separator: string, isHtml: boolean } | null} */ (null));

  const { add: addDeck } = useCollection(collections.decks);
  const { add: addCard } = useCollection(collections.cards);

  /** @param {File | null} selectedFile */
  const handleFileChange = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);

    if (selectedFile) {
      try {
        const text = await selectedFile.text();
        setTextContent(text);
        updatePreview(text, stripHtmlEnabled);
        
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        if (!deckName) {
          setDeckName(nameWithoutExt);
        }
      } catch (err) {
        setError("Failed to read file");
      }
    }
  };

  /**
   * @param {string} text
   * @param {boolean} stripHtml
   */
  const updatePreview = (text, stripHtml) => {
    const { cards, metadata } = parseAnkiText(text, stripHtml);
    setPreviewCards(cards.slice(0, 5));
    setDetectedFormat(metadata);
  };

  /** @param {boolean} enabled */
  const handleStripHtmlChange = (enabled) => {
    setStripHtmlEnabled(enabled);
    if (textContent) {
      updatePreview(textContent, enabled);
    }
  };

  /** @param {string} newText */
  const handleTextChange = (newText) => {
    setTextContent(newText);
    updatePreview(newText, stripHtmlEnabled);
  };

  const handleImport = async () => {
    if (!user || !deckName.trim() || !textContent.trim()) {
      setError("Please provide a deck name and content to import");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const { cards } = parseAnkiText(textContent, stripHtmlEnabled);

      if (cards.length === 0) {
        setError("No valid cards found. Make sure each line has front and back separated by tab.");
        setImporting(false);
        return;
      }

      const deckId = await addDeck({
        name: deckName.trim(),
        description: `Imported ${cards.length} cards`,
        owner: user.uid,
        cardCount: cards.length,
        masteredCount: 0,
        isPublic: false,
        tags: ["imported"],
      });

      const now = new Date();

      console.log(`[Import] Adding ${cards.length} cards...`);
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if ((i + 1) % 50 === 0 || i === cards.length - 1) {
          console.log(`[Import] ${i + 1}/${cards.length}`);
        }
        await addCard({
          deckId,
          front: card.front,
          back: card.back,
          owner: user.uid,
          box: 1,
          nextReviewAt: now,
          lastReviewedAt: null,
          correctCount: 0,
          incorrectCount: 0,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Error importing cards:", err);
      setError(err instanceof Error ? err.message : "Failed to import cards");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setDeckName("");
    setTextContent("");
    setFile(null);
    setError(null);
    setSuccess(false);
    setPreviewCards([]);
    setDetectedFormat(null);
    onClose();
  };

  const totalCards = textContent ? parseAnkiText(textContent, stripHtmlEnabled).cards.length : 0;

  return (
    <Modal opened={opened} onClose={handleClose} title="Import from Anki" size="lg">
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            Supports Anki's plain text export format. Auto-detects separators from <Code>#separator:</Code> directives.
          </Text>
        </Alert>

        <TextInput
          label="Deck Name"
          placeholder="e.g., Norwegian Vocabulary"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          required
        />

        <FileInput
          label="Upload File"
          placeholder="Choose a .txt file exported from Anki"
          accept=".txt,.csv,.tsv"
          value={file}
          onChange={handleFileChange}
          leftSection={<IconFile size={16} />}
          description="Or paste content directly below"
        />

        <Textarea
          label="Card Content"
          placeholder={`#separator:tab\n#html:true\n"front1"\t"back1"\n"front2"\t"back2"`}
          value={textContent}
          onChange={(e) => handleTextChange(e.target.value)}
          minRows={6}
          maxRows={12}
          styles={{ input: { fontFamily: "monospace", fontSize: "12px" } }}
        />

        {detectedFormat && (
          <Group gap="xs">
            <Badge variant="light" color="gray" size="sm">
              Separator: {detectedFormat.separator === "\t" ? "Tab" : detectedFormat.separator}
            </Badge>
            {detectedFormat.isHtml && (
              <Badge variant="light" color="blue" size="sm">
                HTML content detected
              </Badge>
            )}
          </Group>
        )}

        {detectedFormat?.isHtml && (
          <Switch
            label="Strip HTML formatting"
            description="Convert HTML to plain text (recommended for cleaner cards)"
            checked={stripHtmlEnabled}
            onChange={(e) => handleStripHtmlChange(e.currentTarget.checked)}
          />
        )}

        {previewCards.length > 0 && (
          <Paper p="md" withBorder style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>Preview</Text>
              <Badge color="pink" variant="light">
                {totalCards} card{totalCards !== 1 ? "s" : ""} found
              </Badge>
            </Group>
            <Stack gap="xs">
              {previewCards.map((card, index) => (
                <Box
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    padding: "0.5rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "4px",
                  }}
                >
                  <Box>
                    <Text size="xs" c="dimmed" mb={2}>Front</Text>
                    <Text size="sm" c="white" lineClamp={2} style={{ whiteSpace: "pre-wrap" }}>
                      {card.front}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed" mb={2}>Back</Text>
                    <Text size="sm" c="gray.5" lineClamp={2} style={{ whiteSpace: "pre-wrap" }}>
                      {card.back}
                    </Text>
                  </Box>
                </Box>
              ))}
              {totalCards > 5 && (
                <Text size="xs" c="dimmed" ta="center">
                  ... and {totalCards - 5} more cards
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green" title="Success">
            Successfully imported {totalCards} cards!
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleClose}>Cancel</Button>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={handleImport}
            loading={importing}
            disabled={!deckName.trim() || totalCards === 0}
          >
            Import {totalCards > 0 ? `${totalCards} Cards` : ""}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

