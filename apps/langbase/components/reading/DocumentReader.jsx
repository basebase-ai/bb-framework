/**
 * DocumentReader - Interactive reading view with clickable words
 */
import React, { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  ActionIcon,
  Slider,
  Paper,
  Badge,
  Tooltip,
  Switch,
  Loader,
  Center,
  Button,
  Alert,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconTextResize,
  IconVolume,
  IconVolumeOff,
  IconLanguage,
  IconVocabulary,
  IconChevronRight,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useDocument } from "../../../../framework/hooks/useDocument.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useTranslation } from "../../hooks/useTranslation.js";
import { useSpeech } from "../../hooks/useSpeech.js";
import { WordTooltip } from "./WordTooltip.jsx";
import { VocabularyPanel } from "./VocabularyPanel.jsx";
import { QuickTranslate } from "./QuickTranslate.jsx";
import { collections, SUPPORTED_LANGUAGES } from "../../schema.js";

/**
 * Get language config from code
 * @param {string} code
 * @returns {{ code: string, name: string, speechCode: string } | undefined}
 */
function getLanguageConfig(code) {
  return Object.values(SUPPORTED_LANGUAGES).find((lang) => lang.code === code);
}

/**
 * Tokenize text into words and whitespace/punctuation
 * @param {string} text
 * @returns {Array<{ type: 'word' | 'space', value: string }>}
 */
function tokenizeText(text) {
  const tokens = [];
  // Match words (including accented characters) or non-word sequences
  const regex = /([a-zA-ZÀ-ÿĀ-žØøÆæÅåÄäÖö]+)|([^a-zA-ZÀ-ÿĀ-žØøÆæÅåÄäÖö]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      tokens.push({ type: /** @type {const} */ ("word"), value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: /** @type {const} */ ("space"), value: match[2] });
    }
  }

  return tokens;
}

/**
 * @param {{ documentId: string, onBack: () => void }} props
 */
export function DocumentReader({ documentId, onBack }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  const { data: doc, loading: docLoading, update: updateDoc } = useDocument(
    collections.documents,
    documentId
  );

  const selectedWord = useUIStore((s) => s.selectedWord);
  const setSelectedWord = useUIStore((s) => s.setSelectedWord);
  const clearSelectedWord = useUIStore((s) => s.clearSelectedWord);
  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const autoPlayAudio = useUIStore((s) => s.autoPlayAudio);
  const setAutoPlayAudio = useUIStore((s) => s.setAutoPlayAudio);
  const setSourceLanguage = useUIStore((s) => s.setSourceLanguage);

  // Get linked deck ID from document
  const linkedDeckId = doc?.linkedDeckId || null;

  // Pass linked deck to translation hook so cards get added to it
  const { translate } = useTranslation(linkedDeckId);
  const { supported: speechSupported, speak, getVoiceInfo, availableVoices } = useSpeech();
  const sourceLanguageFromStore = useUIStore((s) => s.sourceLanguage);
  
  // Determine language key - prefer document language if available
  const documentLangKey = useMemo(() => {
    if (!doc?.sourceLanguage) return null;
    // Find the key in SUPPORTED_LANGUAGES that matches the doc's source language code
    const entry = Object.entries(SUPPORTED_LANGUAGES).find(
      ([, lang]) => lang.code === doc.sourceLanguage
    );
    return entry ? entry[0] : null;
  }, [doc?.sourceLanguage]);
  
  const effectiveLanguageKey = documentLangKey || sourceLanguageFromStore;
  
  // Check if voice is available for the document language
  const voiceInfo = getVoiceInfo(effectiveLanguageKey);
  const [voiceWarningDismissed, setVoiceWarningDismissed] = useState(false);
  const langInfo = SUPPORTED_LANGUAGES[effectiveLanguageKey] || null;

  // State for mobile sidebar visibility (desktop always shows sidebar)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Track if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Check screen size on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Ref for the reading content area
  const contentRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  // Track if we're handling a selection vs a click
  const isSelectingRef = useRef(false);

  /**
   * Handle linking a deck to this document
   * @param {string} deckId
   */
  const handleLinkDeck = useCallback(async (deckId) => {
    await updateDoc({ linkedDeckId: deckId });
  }, [updateDoc]);

  // Set source language from document
  useEffect(() => {
    if (doc?.sourceLanguage) {
      const langEntry = Object.entries(SUPPORTED_LANGUAGES).find(
        ([, lang]) => lang.code === doc.sourceLanguage
      );
      if (langEntry) {
        setSourceLanguage(langEntry[0]);
      }
    }
  }, [doc?.sourceLanguage, setSourceLanguage]);

  // Tokenize document content
  const tokens = useMemo(() => {
    if (!doc?.content) return [];
    return tokenizeText(doc.content);
  }, [doc?.content]);

  /**
   * Build context string from surrounding words
   * @param {number} tokenIndex - Index of clicked word in tokens array
   * @returns {string} Context string with target word marked
   */
  const buildContext = useCallback(
    (tokenIndex) => {
      // Get only word tokens
      const wordTokens = tokens
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter((t) => t.type === "word");

      // Find position in word-only list
      const wordIndex = wordTokens.findIndex((t) => t.originalIndex === tokenIndex);
      if (wordIndex === -1) return "";

      // Get 5 words before and after
      const start = Math.max(0, wordIndex - 5);
      const end = Math.min(wordTokens.length, wordIndex + 6);

      const contextWords = wordTokens.slice(start, end).map((t, i) => {
        const actualIndex = start + i;
        if (actualIndex === wordIndex) {
          return `[${t.value}]`; // Mark the target word
        }
        return t.value;
      });

      return contextWords.join(" ");
    },
    [tokens]
  );

  /**
   * Handle word click
   * @param {string} word
   * @param {number} tokenIndex
   * @param {MouseEvent} event
   */
  const handleWordClick = useCallback(
    async (word, tokenIndex, event) => {
      if (!doc?.sourceLanguage) return;

      // Skip if user is selecting text (not just clicking)
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        return; // Let the selection handler deal with it
      }

      // Skip if we just handled a selection
      if (isSelectingRef.current) return;

      const rect = /** @type {HTMLElement} */ (event.target).getBoundingClientRect();

      // Play audio immediately if enabled
      if (autoPlayAudio && speechSupported) {
        speak(word, effectiveLanguageKey);
      }

      // Build context from surrounding words
      const context = buildContext(tokenIndex);

      // Set loading state
      setSelectedWord({
        word,
        translation: null,
        position: { x: rect.left, y: rect.bottom },
        loading: true,
        error: null,
      });

      try {
        const result = await translate(word, doc.sourceLanguage, context);

        setSelectedWord({
          word,
          translation: result.translation,
          position: { x: rect.left, y: rect.bottom },
          loading: false,
          error: null,
        });
      } catch (err) {
        setSelectedWord({
          word,
          translation: null,
          position: { x: rect.left, y: rect.bottom },
          loading: false,
          error: err instanceof Error ? err.message : "Translation failed",
        });
      }
    },
    [doc?.sourceLanguage, translate, setSelectedWord, autoPlayAudio, speechSupported, speak, effectiveLanguageKey, buildContext]
  );

  /**
   * Handle text selection (multiple words)
   */
  const handleSelection = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;

    // Check if selection is within our content area
    if (!contentRef.current) return;
    const range = selection.getRangeAt(0);
    if (!contentRef.current.contains(range.commonAncestorContainer)) return;

    // Mark that we handled a selection (to prevent word click)
    isSelectingRef.current = true;

    // Get position for tooltip
    const rect = range.getBoundingClientRect();

    // Play audio if enabled
    if (autoPlayAudio && speechSupported) {
      speak(selectedText, effectiveLanguageKey);
    }

    // Set loading state
    setSelectedWord({
      word: selectedText,
      translation: null,
      position: { x: rect.left, y: rect.bottom },
      loading: true,
      error: null,
    });

    try {
      // Translate the selection (no context needed, it IS the context)
      const result = await translate(selectedText, doc?.sourceLanguage || "no");

      setSelectedWord({
        word: selectedText,
        translation: result.translation,
        position: { x: rect.left, y: rect.bottom },
        loading: false,
        error: null,
      });
    } catch (err) {
      setSelectedWord({
        word: selectedText,
        translation: null,
        position: { x: rect.left, y: rect.bottom },
        loading: false,
        error: err instanceof Error ? err.message : "Translation failed",
      });
    }

    // Clear the selection
    selection.removeAllRanges();

    // Reset selection flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  }, [doc?.sourceLanguage, translate, setSelectedWord, autoPlayAudio, speechSupported, speak, effectiveLanguageKey]);

  // Listen for mouseup to detect text selection
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(() => {
        handleSelection();
      }, 10);
    };

    const content = contentRef.current;
    if (content) {
      content.addEventListener("mouseup", handleMouseUp);
      return () => content.removeEventListener("mouseup", handleMouseUp);
    }
  }, [handleSelection]);

  if (docLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!doc) {
    return (
      <Stack align="center" py="xl" gap="md">
        <Text c="dimmed">Document not found</Text>
      </Stack>
    );
  }

  const langConfig = getLanguageConfig(doc.sourceLanguage);

  return (
    <Box style={{ display: "flex", gap: isMobile ? 0 : "1rem", height: "calc(100vh - 100px)" }}>
      {/* Main content area */}
      <Box style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Header - compact */}
        <Paper
          p="sm"
          mb="sm"
          withBorder
          shadow="xs"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: isDark ? "var(--mantine-color-dark-7)" : "var(--mantine-color-white)",
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <ActionIcon variant="subtle" onClick={onBack} size="sm">
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
                {doc.title}
              </Text>
              <Badge variant="light" color="pink" size="xs">
                {langConfig?.name || doc.sourceLanguage}
              </Badge>
            </Group>

            <Group gap="sm" wrap="nowrap">
              {/* Font size control */}
              <Group gap={4} wrap="nowrap">
                <Tooltip label="Text size">
                  <ActionIcon variant="subtle" color="gray" size="sm">
                    <IconTextResize size={16} />
                  </ActionIcon>
                </Tooltip>
                <Slider
                  w={60}
                  min={14}
                  max={28}
                  step={2}
                  value={fontSize}
                  onChange={setFontSize}
                  size="xs"
                />
              </Group>

              {/* Audio toggle */}
              {speechSupported && (
                <Tooltip label={autoPlayAudio ? "Audio on" : "Audio off"}>
                  <Switch
                    checked={autoPlayAudio}
                    onChange={(e) => setAutoPlayAudio(e.currentTarget.checked)}
                    size="xs"
                    color="pink"
                  />
                </Tooltip>
              )}

              {/* Vocab panel toggle - mobile only */}
              {isMobile && (
                <Button
                  variant={showMobileSidebar ? "filled" : "light"}
                  color="pink"
                  size="xs"
                  leftSection={<IconVocabulary size={14} />}
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                >
                  {showMobileSidebar ? "Hide" : "Tools"}
                </Button>
              )}
            </Group>
          </Group>
        </Paper>

        {/* Voice not available warning */}
        {availableVoices.length > 0 && !voiceInfo.hasVoice && !voiceWarningDismissed && (
          <Alert 
            variant="light" 
            color="yellow" 
            icon={<IconAlertTriangle size={16} />}
            withCloseButton
            onClose={() => setVoiceWarningDismissed(true)}
            p="xs"
            mb="sm"
          >
            <Text size="xs">
              <strong>Audio not available for {langInfo?.name || "this language"}.</strong>{" "}
              Your browser doesn't have a {langInfo?.name} voice installed.
            </Text>
            <Text size="xs" mt={4} c="dimmed">
              <strong>To fix:</strong> On macOS, go to System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, 
              then download a {langInfo?.name} voice. On Windows, go to Settings → Time & Language → Speech → Add voices.
            </Text>
          </Alert>
        )}

        {/* Reading content */}
        <Paper
          p="xl"
          withBorder
          shadow="xs"
          radius="md"
          style={{ 
            flex: 1, 
            overflow: "auto",
            background: isDark ? "var(--mantine-color-dark-8)" : "var(--mantine-color-white)",
          }}
        >
          <Box
            ref={contentRef}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.8,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {tokens.map((token, index) => {
              if (token.type === "space") {
                // Preserve whitespace and newlines
                return (
                  <span
                    key={index}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {token.value}
                  </span>
                );
              }

              return (
                <span
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWordClick(token.value, index, e.nativeEvent);
                  }}
                  onTouchEnd={(e) => {
                    // Prevent default to avoid double-firing with onClick
                    // and to prevent text selection on tap
                    e.preventDefault();
                    handleWordClick(token.value, index, e.nativeEvent);
                  }}
                  style={{
                    cursor: "pointer",
                    borderRadius: "3px",
                    padding: "0 2px",
                    margin: "0 -2px",
                    transition: "all 0.15s ease",
                    WebkitTapHighlightColor: "rgba(233, 69, 96, 0.3)",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(233, 69, 96, 0.2)";
                    e.currentTarget.style.color = "var(--mantine-color-pink-4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "inherit";
                  }}
                >
                  {token.value}
                </span>
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* Desktop sidebar - always visible */}
      {!isMobile && (
        <Stack gap="sm" style={{ width: 280, flexShrink: 0 }}>
          <QuickTranslate />
          <Box style={{ flex: 1, minHeight: 0 }}>
            <VocabularyPanel 
              linkedDeckId={linkedDeckId}
              onLinkDeck={handleLinkDeck}
            />
          </Box>
        </Stack>
      )}
      
      {/* Mobile sidebar - slide-in drawer */}
      {isMobile && showMobileSidebar && (
        <>
          {/* Backdrop overlay */}
          <Box
            onClick={() => setShowMobileSidebar(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 199,
            }}
          />
          <Stack 
            gap="sm"
            style={{ 
              width: 300, 
              maxWidth: "90vw",
              background: isDark ? "var(--mantine-color-dark-7)" : "var(--mantine-color-white)",
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 200,
              padding: "1rem",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
              overflowY: "auto",
            }}
          >
            {/* Header with close button */}
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Translation Tools</Text>
              <ActionIcon 
                variant="subtle" 
                onClick={() => setShowMobileSidebar(false)}
                size="sm"
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
            <QuickTranslate />
            <Box style={{ flex: 1, minHeight: 0 }}>
              <VocabularyPanel 
                linkedDeckId={linkedDeckId}
                onLinkDeck={handleLinkDeck}
                onClose={() => setShowMobileSidebar(false)} 
              />
            </Box>
          </Stack>
        </>
      )}

      {/* Word tooltip */}
      {selectedWord && <WordTooltip onClose={clearSelectedWord} />}
    </Box>
  );
}
