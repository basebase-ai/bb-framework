/**
 * ImportModal - Import flashcards from Anki APKG or plain text format
 * 
 * Supports:
 * - APKG files (native Anki export with SQLite database)
 * - Plain text/CSV/TSV (Anki's text export with #separator directives)
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
  TypographyStylesProvider,
  SegmentedControl,
  Loader,
  Center,
  Select,
} from "@mantine/core";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });
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
import { collections, SUPPORTED_LANGUAGES } from "../schema.js";
import { parseApkgFile, mapNotesToCards } from "../utils/apkgParser.js";

/** @typedef {"apkg" | "text"} ImportFormat */

/**
 * Extract audio file URLs from HTML - only extracts full URLs, not Anki filenames
 * (AnkiWeb CDN requires authentication and won't work cross-origin)
 * @param {string} html
 * @returns {string[]}
 */
function extractAudioUrls(html) {
  /** @type {string[]} */
  const urls = [];
  
  // Only extract full URLs (not Anki filenames which require auth)
  const srcRegex = /src=["'](https?:\/\/[^"']*\.mp3)["']/gi;
  let match;
  
  while ((match = srcRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

/**
 * Convert HTML to readable plain text, preserving structure
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return "";
  
  let text = html;
  
  // Remove style tags AND their contents (CSS)
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  
  // Remove script tags AND their contents (JS)
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  
  // Remove audio tags entirely (we extract them separately)
  text = text.replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, "");
  
  // Remove Anki sound references [sound:filename.mp3]
  text = text.replace(/\[sound:[^\]]+\]/gi, "");
  
  // Remove table styling classes and attributes
  text = text.replace(/class="[^"]*"/gi, "");
  text = text.replace(/style="[^"]*"/gi, "");
  
  // Convert table cells to readable format
  text = text.replace(/<\/td>/gi, " | ");
  text = text.replace(/<\/th>/gi, " | ");
  
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
  if (typeof document !== "undefined") {
    const temp = document.createElement("div");
    temp.innerHTML = text;
    text = temp.textContent || temp.innerText || "";
  } else {
    // Fallback: just strip tags
    text = text.replace(/<[^>]+>/g, "");
  }
  
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
 * @returns {{ cards: { front: string, back: string, frontAudio: string[], backAudio: string[] }[], metadata: { separator: string, isHtml: boolean } }}
 */
function parseAnkiText(text, stripHtmlContent) {
  /** @type {{ front: string, back: string, frontAudio: string[], backAudio: string[] }[]} */
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
      const rawFront = record[0];
      const rawBack = record.slice(1).join(separator);
      
      // Extract audio URLs before stripping HTML
      const frontAudio = isHtml ? extractAudioUrls(rawFront) : [];
      const backAudio = isHtml ? extractAudioUrls(rawBack) : [];
      
      let front = rawFront;
      let back = rawBack;
      
      if (stripHtmlContent && isHtml) {
        front = stripHtml(front);
        back = stripHtml(back);
      }
      
      if (front && back) {
        cards.push({ front, back, frontAudio, backAudio });
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  
  const audioCount = cards.reduce((sum, c) => sum + c.frontAudio.length + c.backAudio.length, 0);
  console.log(`[Import] Parsed ${cards.length} cards` + (audioCount > 0 ? ` with ${audioCount} audio files` : "") + (skipped > 0 ? `, skipped ${skipped}` : ""));
  
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
  const [importFormat, setImportFormat] = useState(/** @type {ImportFormat} */ ("apkg"));
  const [deckName, setDeckName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [stripHtmlEnabled, setStripHtmlEnabled] = useState(true);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [success, setSuccess] = useState(false);
  const [previewCards, setPreviewCards] = useState(/** @type {{ front: string, back: string }[]} */ ([]));
  const [totalCardCount, setTotalCardCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState(/** @type {{ separator: string, isHtml: boolean } | null} */ (null));
  
  // For APKG: store parsed cards and raw notes for remapping
  const [apkgCards, setApkgCards] = useState(/** @type {{ front: string, back: string }[]} */ ([]));
  const [apkgRawNotes, setApkgRawNotes] = useState(/** @type {{ fields: string[] }[]} */ ([]));
  const [apkgSampleFields, setApkgSampleFields] = useState(/** @type {string[]} */ ([]));
  const [apkgFieldCount, setApkgFieldCount] = useState(0);
  const [frontFieldIndex, setFrontFieldIndex] = useState(0);
  const [backFieldIndex, setBackFieldIndex] = useState(1);
  
  // Option to swap front/back
  const [swapFrontBack, setSwapFrontBack] = useState(false);
  
  // Language for text-to-speech
  const [deckLanguage, setDeckLanguage] = useState("norwegian");

  const { add: addDeck } = useCollection(collections.decks);
  const { add: addCard } = useCollection(collections.cards);

  /** @param {File | null} selectedFile */
  const handleFileChange = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setPreviewCards([]);
    setTotalCardCount(0);
    setApkgCards([]);
    setDetectedFormat(null);

    if (!selectedFile) return;

    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    if (!deckName) {
      setDeckName(nameWithoutExt);
    }

    if (importFormat === "apkg") {
      // Parse APKG file
      setParsing(true);
      try {
        const { cards, deckName: detectedDeckName, rawNotes, sampleFields, fieldCount } = await parseApkgFile(selectedFile);
        
        // Store raw data for remapping
        setApkgRawNotes(rawNotes);
        setApkgSampleFields(sampleFields);
        setApkgFieldCount(fieldCount);
        
        // Default field indices: try to find sensible defaults
        // If field 0 looks like a number, try field 1 as front
        let defaultFront = 0;
        let defaultBack = 1;
        
        if (fieldCount > 2 && sampleFields[0] && /^\d+$/.test(sampleFields[0])) {
          // Field 0 is a number (probably rank), use field 1 as front
          defaultFront = 1;
          // Try to find a translation field (often field 4 in frequency decks)
          defaultBack = fieldCount > 4 ? 4 : 2;
        }
        
        setFrontFieldIndex(defaultFront);
        setBackFieldIndex(defaultBack);
        
        // Map with detected defaults
        const mappedCards = mapNotesToCards(rawNotes, defaultFront, defaultBack);
        setApkgCards(mappedCards);
        setPreviewCards(mappedCards.slice(0, 5));
        setTotalCardCount(mappedCards.length);
        
        // Use detected deck name if available and no name set
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
      // Parse text file
      try {
        const text = await selectedFile.text();
        setTextContent(text);
        updatePreview(text, stripHtmlEnabled);
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
    setTotalCardCount(cards.length);
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

  /** @param {ImportFormat} format */
  const handleFormatChange = (format) => {
    setImportFormat(format);
    // Reset file-related state when format changes
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
    setDetectedFormat(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!user || !deckName.trim()) {
      setError("Please provide a deck name");
      return;
    }

    // Get cards based on format
    /** @type {{ front: string, back: string, frontAudio?: string[], backAudio?: string[] }[]} */
    let cardsToImport = [];
    
    if (importFormat === "apkg") {
      cardsToImport = apkgCards;
    } else {
      if (!textContent.trim()) {
        setError("Please provide content to import");
        return;
      }
      const { cards } = parseAnkiText(textContent, stripHtmlEnabled);
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
        language: deckLanguage,
        cardCount: 0,
        masteredCount: 0,
        isPublic: false,
        tags: ["imported"],
      });

      const now = new Date();
      let successCount = 0;
      let errorCount = 0;

      // Use Firestore batch writes for much faster imports (up to 500 per batch)
      const { doc, updateDoc, writeBatch, collection: firestoreCollection } = await import("firebase/firestore");
      const { db } = await import("../../../framework/core/firebase-init.js");
      
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(cardsToImport.length / BATCH_SIZE);
      
      console.log(`[Import] Adding ${cardsToImport.length} cards in ${totalBatches} batch(es)...` + (swapFrontBack ? " (front/back swapped)" : ""));
      
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
            frontAudio: swapFrontBack ? (card.backAudio || []) : (card.frontAudio || []),
            backAudio: swapFrontBack ? (card.frontAudio || []) : (card.backAudio || []),
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
        
        try {
          await batch.commit();
          successCount += (endIdx - startIdx);
          console.log(`[Import] Batch ${batchIndex + 1}/${totalBatches} complete (${endIdx} cards total)`);
        } catch (err) {
          errorCount += (endIdx - startIdx);
          console.error(`[Import] Batch ${batchIndex + 1} failed:`, err);
        }
        
        setImportProgress(endIdx);
      }

      // Update deck with final count
      await updateDoc(doc(db, collections.decks, deckId), {
        cardCount: successCount,
        description: `Imported ${successCount} cards` + (errorCount > 0 ? ` (${errorCount} failed)` : ""),
      });

      console.log(`[Import] Complete: ${successCount} cards added, ${errorCount} errors`);
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
    setTotalCardCount(0);
    setImportProgress(0);
    setDetectedFormat(null);
    setApkgCards([]);
    setApkgRawNotes([]);
    setApkgSampleFields([]);
    setApkgFieldCount(0);
    setFrontFieldIndex(0);
    setBackFieldIndex(1);
    setParsing(false);
    setSwapFrontBack(false);
    setDeckLanguage("norwegian");
    onClose();
  };

  const totalCards = totalCardCount;
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
              Import native Anki <Code>.apkg</Code> files directly. This is the recommended format for best compatibility.
            </Text>
          </Alert>
        ) : (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="sm">
              Supports Anki's plain text export format. Auto-detects separators from <Code>#separator:</Code> directives.
            </Text>
          </Alert>
        )}

        <Group grow align="flex-start">
          <TextInput
            label="Deck Name"
            placeholder="e.g., German Vocabulary"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            required
          />
          <Select
            label="Card Language (for audio)"
            description="Text-to-speech voice"
            value={deckLanguage}
            onChange={(v) => setDeckLanguage(v || "norwegian")}
            data={Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => ({
              value: key,
              label: lang.name,
            }))}
          />
        </Group>

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
          <Paper p="sm" withBorder style={{ background: "rgba(255, 255, 255, 0.02)" }}>
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
            placeholder={`#separator:tab\n#html:true\n"front1"\t"back1"\n"front2"\t"back2"`}
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

        {detectedFormat && importFormat === "text" && (
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

        {detectedFormat?.isHtml && importFormat === "text" && (
          <Switch
            label="Strip HTML formatting"
            description="Convert HTML to plain text (recommended for cleaner cards)"
            checked={stripHtmlEnabled}
            onChange={(e) => handleStripHtmlChange(e.currentTarget.checked)}
          />
        )}

        {previewCards.length > 0 && !parsing && (
          <Paper p="md" withBorder style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>Preview</Text>
              <Group gap="sm">
                <Button
                  variant={swapFrontBack ? "filled" : "light"}
                  color={swapFrontBack ? "pink" : "gray"}
                  size="xs"
                  leftSection={<IconArrowsExchange size={14} />}
                  onClick={() => setSwapFrontBack(!swapFrontBack)}
                >
                  {swapFrontBack ? "Swapped" : "Swap Front ↔ Back"}
                </Button>
                <Badge color="pink" variant="light">
                  {totalCards} card{totalCards !== 1 ? "s" : ""} found
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
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: "4px",
                    }}
                  >
                    <Box>
                      <Text size="xs" c="dimmed" mb={2}>Front</Text>
                      <TypographyStylesProvider fz="sm" c="white" style={{ maxHeight: 50, overflow: "hidden" }}>
                        <div dangerouslySetInnerHTML={{ __html: marked(displayFront || "") }} />
                      </TypographyStylesProvider>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={2}>Back</Text>
                      <TypographyStylesProvider fz="sm" c="gray.5" style={{ maxHeight: 50, overflow: "hidden" }}>
                        <div dangerouslySetInnerHTML={{ __html: marked(displayBack || "") }} />
                      </TypographyStylesProvider>
                    </Box>
                  </Box>
                );
              })}
              {totalCards > 5 && (
                <Text size="xs" c="dimmed" ta="center">
                  ... and {totalCards - 5} more cards
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        {importing && importProgress > 0 && (
          <Alert icon={<IconUpload size={16} />} color="blue" variant="light">
            Inserted {importProgress} of {totalCards} cards...
          </Alert>
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
            disabled={!deckName.trim() || totalCards === 0 || parsing}
          >
            Import {totalCards > 0 ? `${totalCards} Cards` : ""}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
