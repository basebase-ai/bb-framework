/**
 * ImportModal - Import flashcards from Anki APKG or CSV/TSV format
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
  Paper,
  Badge,
  Box,
  SegmentedControl,
  Loader,
  Center,
  Select,
} from "@mantine/core";
import {
  IconUpload,
  IconFile,
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconFileTypeCsv,
  IconPackage,
  IconArrowsExchange,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { parseApkgFile, mapNotesToCards } from "../utils/apkgParser.js";

/** @typedef {"apkg" | "text"} ImportFormat */

/**
 * Parse CSV/TSV text into cards
 * @param {string} text
 * @returns {{ cards: { front: string, back: string }[], metadata: { separator: string } }}
 */
function parseTextFile(text) {
  /** @type {{ front: string, back: string }[]} */
  const cards = [];
  
  let separator = "\t";
  let hasExplicitSeparator = false;
  
  // Parse directives
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#")) break;
    
    const directive = trimmed.toLowerCase();
    if (directive.startsWith("#separator:")) {
      const sepValue = trimmed.substring("#separator:".length).trim().toLowerCase();
      hasExplicitSeparator = true;
      if (sepValue === "tab") separator = "\t";
      else if (sepValue === "semicolon") separator = ";";
      else if (sepValue === "comma") separator = ",";
      else if (sepValue.length === 1) separator = sepValue;
    }
  }
  
  // Find content start (skip directives)
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith("#")) {
      contentStart = i;
      break;
    }
    contentStart = i + 1;
  }
  
  // Auto-detect separator if not explicit: check first content line for commas/tabs
  if (!hasExplicitSeparator && contentStart < lines.length) {
    const firstLine = lines[contentStart];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    if (commaCount > 0 && commaCount >= tabCount && commaCount >= semicolonCount) {
      separator = ",";
    } else if (semicolonCount > tabCount) {
      separator = ";";
    }
  }
  
  // Check if first line looks like a header (e.g., "Question,Answer", "Front,Back")
  let dataStart = contentStart;
  if (dataStart < lines.length) {
    const firstLine = lines[dataStart].toLowerCase();
    const headerPatterns = ["question", "answer", "front", "back", "term", "definition"];
    const looksLikeHeader = headerPatterns.some(p => firstLine.includes(p));
    if (looksLikeHeader) {
      dataStart++;
    }
  }
  
  // Parse records, handling quoted fields
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing with quote handling
    const parts = parseCSVLine(line, separator);
    if (parts.length >= 2) {
      const front = parts[0].trim();
      const back = parts.slice(1).join(separator).trim();
      if (front && back) {
        cards.push({ front, back });
      }
    }
  }
  
  return { cards, metadata: { separator } };
}

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line
 * @param {string} separator
 * @returns {string[]}
 */
function parseCSVLine(line, separator) {
  /** @type {string[]} */
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (!inQuotes) {
        inQuotes = true;
      } else if (nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * @param {{ opened: boolean, onClose: () => void, onSuccess?: () => void }} props
 */
export function ImportModal({ opened, onClose, onSuccess }) {
  const { user } = useAuth();
  const [importFormat, setImportFormat] = useState(/** @type {ImportFormat} */ ("apkg"));
  const [deckName, setDeckName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [success, setSuccess] = useState(false);
  const [previewCards, setPreviewCards] = useState(/** @type {{ front: string, back: string }[]} */ ([]));
  const [totalCardCount, setTotalCardCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  
  // APKG field mapping
  const [apkgCards, setApkgCards] = useState(/** @type {{ front: string, back: string }[]} */ ([]));
  const [apkgRawNotes, setApkgRawNotes] = useState(/** @type {{ fields: string[] }[]} */ ([]));
  const [apkgSampleFields, setApkgSampleFields] = useState(/** @type {string[]} */ ([]));
  const [apkgFieldCount, setApkgFieldCount] = useState(0);
  const [frontFieldIndex, setFrontFieldIndex] = useState(0);
  const [backFieldIndex, setBackFieldIndex] = useState(1);
  const [swapFrontBack, setSwapFrontBack] = useState(false);

  const { add: addDeck } = useCollection(collections.decks);

  /** @param {File | null} selectedFile */
  const handleFileChange = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setPreviewCards([]);
    setTotalCardCount(0);
    setApkgCards([]);

    if (!selectedFile) return;

    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    if (!deckName) {
      setDeckName(nameWithoutExt);
    }

    if (importFormat === "apkg") {
      setParsing(true);
      try {
        const { cards, deckName: detectedDeckName, rawNotes, sampleFields, fieldCount } = await parseApkgFile(selectedFile);
        
        setApkgRawNotes(rawNotes);
        setApkgSampleFields(sampleFields);
        setApkgFieldCount(fieldCount);
        
        let defaultFront = 0;
        let defaultBack = 1;
        
        if (fieldCount > 2 && sampleFields[0] && /^\d+$/.test(sampleFields[0])) {
          defaultFront = 1;
          defaultBack = fieldCount > 4 ? 4 : 2;
        }
        
        setFrontFieldIndex(defaultFront);
        setBackFieldIndex(defaultBack);
        
        const mappedCards = mapNotesToCards(rawNotes, defaultFront, defaultBack);
        setApkgCards(mappedCards);
        setPreviewCards(mappedCards.slice(0, 5));
        setTotalCardCount(mappedCards.length);
        
        if (detectedDeckName && !deckName) {
          setDeckName(detectedDeckName);
        }
      } catch (err) {
        console.error("[APKG Import] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to parse APKG file");
      } finally {
        setParsing(false);
      }
    } else {
      try {
        const text = await selectedFile.text();
        setTextContent(text);
        const { cards } = parseTextFile(text);
        setPreviewCards(cards.slice(0, 5));
        setTotalCardCount(cards.length);
      } catch (err) {
        setError("Failed to read file");
      }
    }
  };

  /** @param {string} newText */
  const handleTextChange = (newText) => {
    setTextContent(newText);
    const { cards } = parseTextFile(newText);
    setPreviewCards(cards.slice(0, 5));
    setTotalCardCount(cards.length);
  };

  /** @param {ImportFormat} format */
  const handleFormatChange = (format) => {
    setImportFormat(format);
    setFile(null);
    setTextContent("");
    setPreviewCards([]);
    setTotalCardCount(0);
    setApkgCards([]);
    setApkgRawNotes([]);
    setApkgSampleFields([]);
    setApkgFieldCount(0);
    setFrontFieldIndex(0);
    setBackFieldIndex(1);
    setError(null);
  };

  const handleImport = async () => {
    if (!user || !deckName.trim()) {
      setError("Please provide a deck name");
      return;
    }

    /** @type {{ front: string, back: string }[]} */
    let cardsToImport = [];
    
    if (importFormat === "apkg") {
      cardsToImport = apkgCards;
    } else {
      if (!textContent.trim()) {
        setError("Please provide content to import");
        return;
      }
      const { cards } = parseTextFile(textContent);
      cardsToImport = cards;
    }

    if (cardsToImport.length === 0) {
      setError("No valid cards found to import");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const deckId = await addDeck({
        name: deckName.trim(),
        description: `Importing ${cardsToImport.length} cards...`,
        owner: user.uid,
        cardCount: 0,
        masteredCount: 0,
        tags: ["imported"],
      });

      const now = new Date();
      let successCount = 0;

      const { doc, updateDoc, writeBatch, collection: firestoreCollection } = await import("firebase/firestore");
      const { db } = await import("../../../framework/core/firebase-init.js");
      
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(cardsToImport.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batch = writeBatch(db);
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, cardsToImport.length);
        
        for (let i = startIdx; i < endIdx; i++) {
          const card = cardsToImport[i];
          const front = swapFrontBack ? card.back : card.front;
          const back = swapFrontBack ? card.front : card.back;
          
          const cardRef = doc(firestoreCollection(db, collections.cards));
          batch.set(cardRef, {
            deckId,
            front,
            back,
            owner: user.uid,
            box: 1,
            nextReviewAt: now,
            lastReviewedAt: null,
            correctCount: 0,
            incorrectCount: 0,
            importOrder: i,
            createdAt: now,
            updatedAt: now,
          });
        }
        
        await batch.commit();
        successCount += (endIdx - startIdx);
        setImportProgress(endIdx);
      }

      await updateDoc(doc(db, collections.decks, deckId), {
        cardCount: successCount,
        description: `Imported ${successCount} cards`,
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess?.();
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
    setTotalCardCount(0);
    setImportProgress(0);
    setApkgCards([]);
    setApkgRawNotes([]);
    setApkgSampleFields([]);
    setApkgFieldCount(0);
    setFrontFieldIndex(0);
    setBackFieldIndex(1);
    setParsing(false);
    setSwapFrontBack(false);
    onClose();
  };

  const fileAccept = importFormat === "apkg" ? ".apkg" : ".txt,.csv,.tsv";
  const filePlaceholder = importFormat === "apkg" 
    ? "Choose an .apkg file exported from Anki" 
    : "Choose a .txt/.csv/.tsv file";

  return (
    <Modal opened={opened} onClose={handleClose} title="Import Flashcards" size="lg">
      <Stack gap="md">
        <SegmentedControl
          value={importFormat}
          onChange={(v) => handleFormatChange(/** @type {ImportFormat} */ (v))}
          data={[
            { 
              value: "apkg", 
              label: (
                <Center style={{ gap: 8 }}>
                  <IconPackage size={16} />
                  <span>APKG (Anki)</span>
                </Center>
              )
            },
            { 
              value: "text", 
              label: (
                <Center style={{ gap: 8 }}>
                  <IconFileTypeCsv size={16} />
                  <span>CSV / TSV / Text</span>
                </Center>
              )
            },
          ]}
          fullWidth
        />

        {importFormat === "apkg" ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="sm">
              Import native Anki <code>.apkg</code> files directly.
            </Text>
          </Alert>
        ) : (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="sm">
              Supports tab/comma separated files. Use <code>#separator:</code> directive to specify delimiter.
            </Text>
          </Alert>
        )}

        <TextInput
          label="Deck Name"
          placeholder="e.g., Biology Chapter 1"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          required
        />

        <FileInput
          label="Upload File"
          placeholder={filePlaceholder}
          accept={fileAccept}
          value={file}
          onChange={handleFileChange}
          leftSection={parsing ? <Loader size={16} /> : <IconFile size={16} />}
          description={importFormat === "text" ? "Or paste content directly below" : undefined}
          disabled={parsing}
        />

        {importFormat === "apkg" && apkgFieldCount > 2 && !parsing && (
          <Paper p="sm" withBorder>
            <Text size="sm" fw={500} mb="xs">Field Mapping</Text>
            <Text size="xs" c="dimmed" mb="sm">
              This deck has {apkgFieldCount} fields per card. Select which fields to use:
            </Text>
            <Group grow>
              <Select
                label="Front (Question)"
                size="xs"
                value={String(frontFieldIndex)}
                onChange={(v) => {
                  const newIndex = parseInt(v || "0", 10);
                  setFrontFieldIndex(newIndex);
                  const mapped = mapNotesToCards(apkgRawNotes, newIndex, backFieldIndex);
                  setApkgCards(mapped);
                  setPreviewCards(mapped.slice(0, 5));
                  setTotalCardCount(mapped.length);
                }}
                data={apkgSampleFields.map((sample, i) => ({
                  value: String(i),
                  label: `[${i}] ${sample.substring(0, 25)}${sample.length > 25 ? "..." : ""}`,
                }))}
              />
              <Select
                label="Back (Answer)"
                size="xs"
                value={String(backFieldIndex)}
                onChange={(v) => {
                  const newIndex = parseInt(v || "1", 10);
                  setBackFieldIndex(newIndex);
                  const mapped = mapNotesToCards(apkgRawNotes, frontFieldIndex, newIndex);
                  setApkgCards(mapped);
                  setPreviewCards(mapped.slice(0, 5));
                  setTotalCardCount(mapped.length);
                }}
                data={apkgSampleFields.map((sample, i) => ({
                  value: String(i),
                  label: `[${i}] ${sample.substring(0, 25)}${sample.length > 25 ? "..." : ""}`,
                }))}
              />
            </Group>
          </Paper>
        )}

        {importFormat === "text" && (
          <Textarea
            label="Card Content"
            placeholder={`#separator:tab\nquestion1\tanswer1\nquestion2\tanswer2`}
            value={textContent}
            onChange={(e) => handleTextChange(e.target.value)}
            minRows={6}
            maxRows={12}
            styles={{ input: { fontFamily: "monospace", fontSize: "12px" } }}
          />
        )}

        {parsing && (
          <Center py="md">
            <Group gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Parsing APKG file...</Text>
            </Group>
          </Center>
        )}

        {previewCards.length > 0 && !parsing && (
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>Preview</Text>
              <Group gap="sm">
                <Button
                  variant={swapFrontBack ? "filled" : "light"}
                  color={swapFrontBack ? "blue" : "gray"}
                  size="xs"
                  leftSection={<IconArrowsExchange size={14} />}
                  onClick={() => setSwapFrontBack(!swapFrontBack)}
                >
                  {swapFrontBack ? "Swapped" : "Swap Front/Back"}
                </Button>
                <Badge color="blue" variant="light">
                  {totalCardCount} card{totalCardCount !== 1 ? "s" : ""} found
                </Badge>
              </Group>
            </Group>
            <Stack gap="xs">
              {previewCards.map((card, index) => {
                const displayFront = swapFrontBack ? card.back : card.front;
                const displayBack = swapFrontBack ? card.front : card.back;
                return (
                  <Box
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                      padding: "0.5rem",
                      borderRadius: "4px",
                      background: "var(--mantine-color-default-hover)",
                    }}
                  >
                    <Box>
                      <Text size="xs" c="dimmed" mb={2}>Front</Text>
                      <Text size="sm" lineClamp={2}>{displayFront}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={2}>Back</Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>{displayBack}</Text>
                    </Box>
                  </Box>
                );
              })}
              {totalCardCount > 5 && (
                <Text size="xs" c="dimmed" ta="center">
                  ... and {totalCardCount - 5} more cards
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        {importing && importProgress > 0 && (
          <Alert icon={<IconUpload size={16} />} color="blue" variant="light">
            Inserted {importProgress} of {totalCardCount} cards...
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green" title="Success">
            Successfully imported {totalCardCount} cards!
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
            disabled={!deckName.trim() || totalCardCount === 0 || parsing}
          >
            Import {totalCardCount > 0 ? `${totalCardCount} Cards` : ""}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
