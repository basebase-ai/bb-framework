/**
 * StudyMode - Full-screen study with Leitner spaced repetition
 * 
 * Leitner System:
 * - Box 1: Review every 1 day
 * - Box 2: Review every 2 days
 * - Box 3: Review every 4 days
 * - Box 4: Review every 7 days
 * - Box 5: Review every 14 days (mastered)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  Box,
  Progress,
  Badge,
  ActionIcon,
  Transition,
  RingProgress,
  TypographyStylesProvider,
  NumberInput,
  SimpleGrid,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { marked } from "marked";
import {
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconX,
  IconRotate,
  IconVolume,
  IconPlayerPlay,
  IconCards,
} from "@tabler/icons-react";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections, LEITNER_INTERVALS, SUPPORTED_LANGUAGES } from "../schema.js";
import { useUIStore } from "../stores/uiStore.js";

/**
 * Get box color for badge
 * @param {number} box
 * @returns {string}
 */
function getBoxColor(box) {
  const colors = { 1: "red", 2: "orange", 3: "yellow", 4: "lime", 5: "green" };
  return colors[box] || "gray";
}

/**
 * Get human-readable label for Leitner box
 * @param {number} box
 * @returns {string}
 */
function getBoxLabel(box) {
  const labels = {
    1: "New",
    2: "Learning",
    3: "Reviewing",
    4: "Familiar",
    5: "Mastered",
  };
  return labels[box] || `Box ${box}`;
}

/**
 * Extract the main definition (first bold text) from card content
 * @param {string} content - The card content (may contain markdown or HTML)
 * @returns {{ definition: string | null, rest: string }}
 */
function extractDefinition(content) {
  if (!content) return { definition: null, rest: content };
  
  // Look for the first **bold** markdown pattern that looks like a definition
  // (short, single word or phrase, typically English translation)
  const boldMarkdownRegex = /\*\*([^*]{1,50})\*\*/;
  const markdownMatch = content.match(boldMarkdownRegex);
  
  // Also check for <strong> HTML tags
  const boldHtmlRegex = /<strong>([^<]{1,50})<\/strong>/i;
  const htmlMatch = content.match(boldHtmlRegex);
  
  // Use whichever match comes first in the content
  let definition = null;
  let matchIndex = Infinity;
  
  if (markdownMatch && markdownMatch.index !== undefined) {
    // Check if this looks like a definition (not a grammar label)
    const text = markdownMatch[1].trim().toLowerCase();
    if (!text.includes("adjective") && !text.includes("noun") && !text.includes("verb") && 
        !text.includes("adverb") && !text.includes("entall") && !text.includes("flertall")) {
      definition = markdownMatch[1];
      matchIndex = markdownMatch.index;
    }
  }
  
  if (htmlMatch && htmlMatch.index !== undefined && htmlMatch.index < matchIndex) {
    const text = htmlMatch[1].trim().toLowerCase();
    if (!text.includes("adjective") && !text.includes("noun") && !text.includes("verb") && 
        !text.includes("adverb") && !text.includes("entall") && !text.includes("flertall")) {
      definition = htmlMatch[1];
    }
  }
  
  return { definition, rest: content };
}

/**
 * Calculate next review date based on Leitner box.
 * Uses midnight-based scheduling: "tomorrow" means after the next midnight, not +24 hours.
 * @param {number} box
 * @returns {Date}
 */
function getNextReviewDate(box) {
  const days = LEITNER_INTERVALS[box] || 1;
  const date = new Date();
  // Set to midnight of the target day
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * @param {{ deckId: string, onBack: () => void, onComplete: () => void }} props
 */
export function StudyMode({ deckId, onBack, onComplete }) {
  const { user } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  // Study options state (shown before studying)
  const [studyStarted, setStudyStarted] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState(/** @type {number[]} */ ([]));
  const [newCardsPerDay, setNewCardsPerDay] = useState(/** @type {number | ''} */ (40));
  
  // Study session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, reviewed: 0 });
  const [reviewedCardIds, setReviewedCardIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionTotalCards, setSessionTotalCards] = useState(/** @type {number | null} */ (null));
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [exampleSentence, setExampleSentence] = useState(/** @type {{ target: string, english: string } | null} */ (null));
  const [loadingExample, setLoadingExample] = useState(false);
  const cardContentRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  
  // History for viewing previous cards
  const [reviewHistory, setReviewHistory] = useState(/** @type {Array<{card: Object, answer: 'easy' | 'hard'}>} */ ([]));
  const [viewingHistoryIndex, setViewingHistoryIndex] = useState(/** @type {number | null} */ (null));
  
  // LLM for generating example sentences
  const { call: callLLM } = useFunction("askLLM");

  /**
   * Play an audio URL
   * @param {string} url
   */
  const playAudio = useCallback((url) => {
    console.log("[Audio] Playing:", url);
    const audio = new Audio(url);
    setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = (e) => {
      console.error("[Audio] Error playing:", url, e);
      setAudioPlaying(false);
    };
    audio.play().catch((err) => {
      console.error("[Audio] Play failed:", err);
      setAudioPlaying(false);
    });
  }, []);

  const { data: deck, loading: deckLoading, update: updateDeck } = useDocument(collections.decks, deckId);

  // Preload speech synthesis voices and log available voice for deck language
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        
        // Log voice availability for the deck's language
        const deckLang = deck?.language || "norwegian";
        const langConfig = SUPPORTED_LANGUAGES[deckLang] || SUPPORTED_LANGUAGES.norwegian;
        const langPrefix = langConfig.code;
        
        const matchingVoice = voices.find(
          (v) => v.lang.startsWith(langPrefix) || v.lang.startsWith(langConfig.speechCode.split("-")[0])
        );
        
        if (matchingVoice) {
          console.log(`[TTS] ${langConfig.name} voice found:`, matchingVoice.name, matchingVoice.lang);
        } else {
          console.log(`[TTS] No ${langConfig.name} voice found, will use ${langConfig.speechCode}`);
        }
      }
    };
    
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [deck?.language]);

  /**
   * Speak text using Web Speech API with appropriate voice for deck language
   * @param {string} text
   */
  const speak = useCallback((text) => {
    if (!text || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Strip HTML and clean up text for speech
    const cleanText = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    
    if (!cleanText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Get the language settings for this deck
    const deckLang = deck?.language || "norwegian";
    const langConfig = SUPPORTED_LANGUAGES[deckLang] || SUPPORTED_LANGUAGES.norwegian;
    const speechCode = langConfig.speechCode;
    const langPrefix = langConfig.code;
    
    // Try to find a voice for the deck's language
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang.startsWith(langPrefix) || v.lang.startsWith(speechCode.split("-")[0])
    );
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    } else {
      // Fallback to language code even without a specific voice
      utterance.lang = speechCode;
    }
    
    utterance.rate = 0.9; // Slightly slower for learning
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [deck?.language]);

  // Card cache for faster subsequent loads
  const cardCache = useUIStore((s) => s.cardCache);
  const setCachedCards = useUIStore((s) => s.setCachedCards);
  const updateCachedCard = useUIStore((s) => s.updateCachedCard);
  const cachedData = cardCache[deckId];

  const cardQueryOptions = useMemo(() => ({
    where: user?.uid ? [
      ["deckId", "==", deckId],
      ["owner", "==", user.uid],
    ] : [],
  }), [deckId, user?.uid]);

  const {
    data: cardsFromFirestore,
    loading: cardsLoading,
    update: updateCardInFirestore,
  } = useCollection(collections.cards, cardQueryOptions);

  // Cache cards when they load from Firestore (only if not already cached)
  useEffect(() => {
    if (!cardsLoading && cardsFromFirestore.length > 0 && !cachedData) {
      setCachedCards(deckId, cardsFromFirestore);
    }
  }, [cardsFromFirestore, cardsLoading, deckId, cachedData, setCachedCards]);

  // Use cached cards for instant display, fall back to live data
  const allCards = cachedData?.cards || cardsFromFirestore;

  // Wrapper to update both Firestore and cache
  const updateCard = async (/** @type {string} */ cardId, /** @type {Object} */ updates) => {
    await updateCardInFirestore(cardId, updates);
    if (cachedData) {
      updateCachedCard(deckId, cardId, updates);
    }
  };

  // Show loading only if we have no cached data AND still loading from Firestore
  const showLoading = !cachedData && cardsLoading;

  // Calculate card counts by type (for study options screen)
  const cardCounts = useMemo(() => {
    const now = new Date();
    
    let newCards = 0;
    let reviewsDue = 0;     // Cards that have been seen and are due
    let strugglingCards = 0;  // In Box 1, have been reviewed (marked hard)
    let learningCards = 0;    // In Box 2-4, progressing
    
    // Per-box counts
    const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    allCards.forEach((card) => {
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      const reviewDate = card.nextReviewAt 
        ? (card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt))
        : null;
      const isDue = !reviewDate || reviewDate <= now;
      
      // Count per box
      if (box >= 1 && box <= 5) boxCounts[box]++;
      
      if (isNew) {
        newCards++;
      } else {
        // Card has been reviewed - categorize by box
        if (box === 1) {
          strugglingCards++;
        } else if (box >= 2 && box <= 4) {
          learningCards++;
        }
        
        // Count if due for review
        if (isDue) {
          reviewsDue++;
        }
      }
    });
    
    // Calculate today's session with the new cards limit
    const newLimit = typeof newCardsPerDay === "number" ? newCardsPerDay : 40;
    const newToday = Math.min(newCards, newLimit);
    
    return { 
      newCards,        // Total new cards available
      newToday,        // New cards for today (limited)
      reviewsDue,      // Reviews due now
      strugglingCards, 
      learningCards,
      boxCounts,       // Per-box distribution
      dailyTotal: newToday + reviewsDue  // Today's manageable session
    };
  }, [allCards, newCardsPerDay]);

  /**
   * Toggle box selection
   * @param {number} box
   */
  const toggleBox = useCallback((box) => {
    setSelectedBoxes((prev) => {
      if (prev.includes(box)) {
        return prev.filter((b) => b !== box);
      }
      return [...prev, box].sort();
    });
  }, []);

  // Calculate available cards based on selection
  const availableCards = useMemo(() => {
    if (selectedBoxes.length === 0) {
      // All due cards mode
      return cardCounts.dailyTotal;
    }
    // Sum of cards in selected boxes
    return selectedBoxes.reduce((sum, box) => sum + cardCounts.boxCounts[box], 0);
  }, [selectedBoxes, cardCounts]);

  // Filter and limit cards based on study options
  const dueCards = useMemo(() => {
    const now = new Date();
    const newLimit = typeof newCardsPerDay === "number" ? newCardsPerDay : 40;
    
    // First, separate new cards and review cards
    /** @type {typeof allCards} */
    const newCardsPool = [];
    /** @type {typeof allCards} */
    const reviewCardsPool = [];
    
    // If no boxes selected, use "all due cards" mode
    const useAllMode = selectedBoxes.length === 0;
    
    allCards.forEach((card) => {
      if (reviewedCardIds.has(card.id)) return;
      
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      const reviewDate = card.nextReviewAt 
        ? (card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt))
        : null;
      const isDue = !reviewDate || reviewDate <= now;
      
      if (useAllMode) {
        // All due cards mode (original behavior)
        if (isNew) {
          newCardsPool.push(card);
        } else if (isDue) {
          reviewCardsPool.push(card);
        }
      } else {
        // Filter by selected boxes
        if (selectedBoxes.includes(box)) {
          if (isNew) {
            newCardsPool.push(card);
          } else {
            reviewCardsPool.push(card);
          }
        }
      }
    });
    
    // Sort by importOrder (asc) to preserve original file order
    const sortCards = (cards) => cards.sort((a, b) => {
      if (a.importOrder !== undefined && b.importOrder !== undefined) {
        return a.importOrder - b.importOrder;
      }
      if (a.importOrder !== undefined) return -1;
      if (b.importOrder !== undefined) return 1;
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    sortCards(newCardsPool);
    sortCards(reviewCardsPool);
    
    // Limit new cards, include all reviews
    const limitedNew = newCardsPool.slice(0, newLimit);
    return [...reviewCardsPool, ...limitedNew]; // Reviews first, then new
  }, [allCards, reviewedCardIds, selectedBoxes, newCardsPerDay]);

  const currentCard = dueCards[currentIndex];
  // Use captured session size for stable progress tracking (doesn't change as cards are reviewed)
  const totalDue = sessionTotalCards ?? (dueCards.length + sessionStats.reviewed);
  const progress = totalDue > 0 ? (sessionStats.reviewed / totalDue) * 100 : 0;

  /**
   * Generate an example sentence for the current word
   */
  const generateExample = useCallback(async () => {
    if (!currentCard || loadingExample) return;
    
    setLoadingExample(true);
    setShowExample(true);
    
    const word = currentCard.front.replace(/\s*\([^)]*\)/g, "").trim();
    // Extract the English meaning from the back of the card (strip markdown/HTML)
    const meaning = (currentCard.back || "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200); // Limit length
    const deckLang = deck?.language || "norwegian";
    const langInfo = SUPPORTED_LANGUAGES[deckLang] || SUPPORTED_LANGUAGES.norwegian;
    
    const prompt = `Generate ONE simple example sentence in ${langInfo.name} using the word "${word}" with the meaning "${meaning}".
The sentence should be 5-10 words long and easy to understand for a language learner.
Use the word with THIS SPECIFIC MEANING, not other possible meanings.

Return JSON only: {"target": "sentence in ${langInfo.name}", "english": "English translation"}`;
    
    try {
      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: prompt,
        options: { maxTokens: 200, temperature: 0.7 },
      });
      
      const responseText = result?.response || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setExampleSentence({ target: parsed.target, english: parsed.english });
      }
    } catch (err) {
      console.error("Error generating example:", err);
      setExampleSentence({ target: "Error generating example", english: "" });
    } finally {
      setLoadingExample(false);
    }
  }, [currentCard, deck?.language, callLLM, loadingExample]);

  // Capture session size when study starts (so the denominator stays fixed)
  useEffect(() => {
    if (studyStarted && sessionTotalCards === null && dueCards.length > 0) {
      setSessionTotalCards(dueCards.length);
    }
  }, [studyStarted, sessionTotalCards, dueCards.length]);

  // Auto-speak the FRONT (Norwegian word) when flipping to back
  useEffect(() => {
    if (showBack && currentCard) {
      // If there's front audio, play it; otherwise use TTS for the front
      const frontAudio = currentCard.frontAudio;
      if (frontAudio && frontAudio.length > 0) {
        playAudio(frontAudio[0]);
      } else {
        // Use text-to-speech for the FRONT content (the word being learned)
        // Strip out parenthetical content (part of speech, etc.)
        const wordOnly = currentCard.front.replace(/\s*\([^)]*\)/g, "").trim();
        speak(wordOnly);
      }
    }
  }, [showBack, currentCard?.id, playAudio, speak]);

  // Listen for text selection and speak highlighted text
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0 && selectedText.length < 500) {
        // Small delay to ensure selection is complete (user released mouse)
        // We'll trigger speech on mouseup instead
      }
    };

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0 && selectedText.length < 500) {
        // Check if selection is within the card content area
        const range = selection.getRangeAt(0);
        const container = cardContentRef.current;
        if (container && container.contains(range.commonAncestorContainer)) {
          speak(selectedText);
        }
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [speak]);

  /** @param {'easy' | 'hard'} difficulty */
  const handleAnswer = useCallback(async (difficulty) => {
    if (!currentCard || isAnimating) return;
    
    // If viewing history, return to current card first
    if (viewingHistoryIndex !== null) {
      setViewingHistoryIndex(null);
      return;
    }
    
    // Prevent reviewing more cards than we started with
    if (sessionTotalCards !== null && sessionStats.reviewed >= sessionTotalCards) {
      return;
    }

    setIsAnimating(true);

    const currentBox = currentCard.box || 1;
    let newBox;
    let isCorrect;

    if (difficulty === "easy") {
      newBox = Math.min(currentBox + 1, 5);
      isCorrect = true;
    } else {
      newBox = 1;
      isCorrect = false;
    }

    const nextReviewAt = getNextReviewDate(newBox);

    try {
      // Add to history before moving to next card
      setReviewHistory((prev) => [...prev, { card: { ...currentCard }, answer: difficulty }]);
      
      // Set showBack to false FIRST to prevent flash of next card's back
      setShowBack(false);
      // Reset example state for next card
      setShowExample(false);
      setExampleSentence(null);
      
      await updateCard(currentCard.id, {
        box: newBox,
        nextReviewAt,
        lastReviewedAt: new Date(),
        correctCount: (currentCard.correctCount || 0) + (isCorrect ? 1 : 0),
        incorrectCount: (currentCard.incorrectCount || 0) + (isCorrect ? 0 : 1),
      });

      setReviewedCardIds((prev) => new Set([...prev, currentCard.id]));
      setSessionStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
        reviewed: prev.reviewed + 1,
      }));

      if (currentIndex >= dueCards.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Error updating card:", err);
    } finally {
      setTimeout(() => setIsAnimating(false), 100);
    }
  }, [currentCard, currentIndex, dueCards.length, isAnimating, updateCard, sessionTotalCards, sessionStats.reviewed, viewingHistoryIndex]);

  /**
   * View previous card in history
   */
  const handleViewPrevious = useCallback(() => {
    if (reviewHistory.length === 0) return;
    
    if (viewingHistoryIndex === null) {
      // Start viewing history from the most recent
      setViewingHistoryIndex(reviewHistory.length - 1);
    } else if (viewingHistoryIndex > 0) {
      // Go further back in history
      setViewingHistoryIndex(viewingHistoryIndex - 1);
    }
  }, [reviewHistory.length, viewingHistoryIndex]);

  /**
   * View next card in history or return to current
   */
  const handleViewNext = useCallback(() => {
    if (viewingHistoryIndex === null) return;
    
    if (viewingHistoryIndex < reviewHistory.length - 1) {
      // Go forward in history
      setViewingHistoryIndex(viewingHistoryIndex + 1);
    } else {
      // Return to current card
      setViewingHistoryIndex(null);
    }
  }, [reviewHistory.length, viewingHistoryIndex]);

  /**
   * Return to current card from history view
   */
  const handleReturnToCurrent = useCallback(() => {
    setViewingHistoryIndex(null);
  }, []);

  const handleFlip = () => {
    if (!isAnimating) setShowBack(!showBack);
  };

  // Keyboard shortcuts for study mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isAnimating) return;

      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          if (viewingHistoryIndex !== null) {
            // Return to current card
            handleReturnToCurrent();
          } else {
            setShowBack(!showBack);
          }
          break;
        case "ArrowRight":
        case "1":
          if (viewingHistoryIndex !== null) {
            handleViewNext();
          } else if (showBack && currentCard) {
            handleAnswer("easy");
          }
          break;
        case "ArrowLeft":
        case "2":
          if (viewingHistoryIndex !== null) {
            handleViewPrevious();
          } else if (showBack && currentCard) {
            handleAnswer("hard");
          }
          break;
        case "ArrowUp":
        case "p":
        case "P":
          e.preventDefault();
          handleViewPrevious();
          break;
        case "ArrowDown":
          e.preventDefault();
          if (viewingHistoryIndex !== null) {
            handleViewNext();
          }
          break;
        case "Escape":
          if (viewingHistoryIndex !== null) {
            handleReturnToCurrent();
          } else {
            onBack();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBack, currentCard, isAnimating, viewingHistoryIndex, handleViewPrevious, handleViewNext, handleReturnToCurrent, handleAnswer, onBack]);

  useEffect(() => {
    if (deck && allCards.length > 0) {
      const masteredCount = allCards.filter((c) => c.box === 5).length;
      if (deck.masteredCount !== masteredCount) {
        updateDeck({ masteredCount });
      }
    }
  }, [allCards, deck, updateDeck]);

  if (deckLoading || showLoading) {
    return (
      <Box style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text c="dimmed">Loading study session...</Text>
      </Box>
    );
  }

  // Study options screen (before starting)
  if (!studyStarted) {
    return (
      <Box style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" withBorder shadow="sm" style={{ maxWidth: 500, width: "100%" }}>
          <Group justify="space-between" mb="xl">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={3}>{deck?.name}</Title>
            <Box w={28} />
          </Group>

          {/* Today's Session - the default option */}
          <Paper
            p="lg"
            radius="md"
            onClick={() => setSelectedBoxes([])}
            mb="lg"
            withBorder
            style={{
              borderColor: selectedBoxes.length === 0 ? "var(--mantine-color-pink-6)" : undefined,
              borderWidth: selectedBoxes.length === 0 ? 2 : 1,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="md">
                <ThemeIcon size={50} radius="xl" variant="filled" color="pink">
                  <IconCards size={28} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="lg">Today's Session</Text>
                  <Text size="sm" c="dimmed">
                    {cardCounts.newToday} new + {cardCounts.reviewsDue} review
                  </Text>
                </Box>
              </Group>
              <Text size="2rem" fw={700} c="pink">{cardCounts.dailyTotal}</Text>
            </Group>
          </Paper>

          {/* New cards per day setting */}
          <Text c="dimmed" size="sm" mb="xs">New cards per day</Text>
          <NumberInput
            value={newCardsPerDay}
            onChange={(val) => setNewCardsPerDay(val)}
            min={5}
            max={100}
            step={5}
            mb="lg"
          />

          {/* Box selection */}
          <Text c="dimmed" size="xs" mb="sm">Or select specific levels to study:</Text>
          <Group gap="xs" mb="lg" justify="center" wrap="wrap">
            {[1, 2, 3, 4, 5].map((box) => {
              const count = cardCounts.boxCounts[box];
              const isSelected = selectedBoxes.includes(box);
              return (
                <Button
                  key={box}
                  size="sm"
                  variant={isSelected ? "filled" : "outline"}
                  color={getBoxColor(box)}
                  onClick={() => toggleBox(box)}
                  disabled={count === 0}
                >
                  {getBoxLabel(box)} ({count})
                </Button>
              );
            })}
          </Group>
          
          {selectedBoxes.length > 0 && (
            <Text size="xs" c="dimmed" ta="center" mb="lg">
              {availableCards} cards from selected levels
            </Text>
          )}

          <Group justify="center" gap="md">
            <Button variant="light" color="gray" onClick={onBack}>
              Cancel
            </Button>
            <Button
              variant="filled"
              color="pink"
              size="lg"
              leftSection={<IconCards size={20} />}
              onClick={() => setStudyStarted(true)}
              disabled={availableCards === 0}
            >
              Start Studying
            </Button>
          </Group>

          {cardCounts.dailyTotal === 0 && cardCounts.newCards === 0 && (
            <Text c="dimmed" size="sm" ta="center" mt="md">
              No cards are due for study right now. Check back later!
            </Text>
          )}
        </Paper>
      </Box>
    );
  }

  // Session complete when no cards left OR we've reviewed all cards in the session
  const sessionComplete = dueCards.length === 0 || 
    (sessionTotalCards !== null && sessionStats.reviewed >= sessionTotalCards);
  
  if (sessionComplete) {
    const totalReviewed = sessionStats.reviewed;
    const accuracy = totalReviewed > 0 ? Math.round((sessionStats.correct / totalReviewed) * 100) : 0;

    return (
      <Box style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" withBorder shadow="sm" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <Title order={2} mb="lg">🎉 Session Complete!</Title>

          {totalReviewed > 0 ? (
            <>
              <RingProgress
                size={150}
                thickness={12}
                roundCaps
                sections={[
                  { value: accuracy, color: "green" },
                  { value: 100 - accuracy, color: "red" },
                ]}
                label={<Text ta="center" fw={700} size="xl">{accuracy}%</Text>}
                mx="auto"
                mb="lg"
              />
              <Group justify="center" gap="xl" mb="xl">
                <Box ta="center">
                  <Text size="2rem" fw={700} c="green">{sessionStats.correct}</Text>
                  <Text size="sm" c="dimmed">Easy</Text>
                </Box>
                <Box ta="center">
                  <Text size="2rem" fw={700} c="red">{sessionStats.incorrect}</Text>
                  <Text size="sm" c="dimmed">Hard</Text>
                </Box>
              </Group>
            </>
          ) : (
            <Text c="dimmed" mb="xl">No cards were due for review. Check back later!</Text>
          )}

          <Group justify="center" gap="md">
            <Button variant="light" color="pink" leftSection={<IconArrowLeft size={16} />} onClick={onComplete}>
              Back to Deck
            </Button>
            {totalReviewed > 0 && (
              <Button
                variant="filled"
                color="pink"
                leftSection={<IconRefresh size={16} />}
                onClick={() => {
                  setReviewedCardIds(new Set());
                  setSessionStats({ correct: 0, incorrect: 0, reviewed: 0 });
                  setCurrentIndex(0);
                  setShowBack(false);
                  setSessionTotalCards(null); // Reset so new session captures fresh total
                  setStudyStarted(false); // Go back to study options
                  setReviewHistory([]); // Clear history for new session
                  setViewingHistoryIndex(null);
                }}
              >
                Study More
              </Button>
            )}
          </Group>
        </Paper>
      </Box>
    );
  }

  // Determine which card to display
  const isViewingHistory = viewingHistoryIndex !== null;
  const historyItem = isViewingHistory ? reviewHistory[viewingHistoryIndex] : null;
  const displayCard = isViewingHistory ? historyItem?.card : currentCard;

  return (
    <Box style={{ minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <Box px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <Group justify="space-between" maw={800} mx="auto">
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text fw={500}>{deck?.name}</Text>
          </Group>
          <Group gap="md">
            {/* Previous card button */}
            {reviewHistory.length > 0 && (
              <Button
                variant={isViewingHistory ? "filled" : "subtle"}
                color={isViewingHistory ? "violet" : "gray"}
                size="xs"
                onClick={isViewingHistory ? handleReturnToCurrent : handleViewPrevious}
              >
                {isViewingHistory 
                  ? `Reviewing ${viewingHistoryIndex + 1}/${reviewHistory.length} • Back to current` 
                  : "Previous"}
              </Button>
            )}
            <Badge variant="light" color="green">✓ {sessionStats.correct}</Badge>
            <Badge variant="light" color="red">✗ {sessionStats.incorrect}</Badge>
            <Text size="sm" c="dimmed">{sessionStats.reviewed} / {totalDue}</Text>
          </Group>
        </Group>
        <Progress value={progress} color="pink" size="xs" radius={0} mt="sm" />
      </Box>

      <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Box style={{ width: "100%", maxWidth: 600 }}>
          {/* History navigation bar */}
          {isViewingHistory && (
            <Group justify="center" mb="md" gap="sm">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={handleViewPrevious}
                disabled={viewingHistoryIndex === 0}
                leftSection={<IconArrowLeft size={14} />}
              >
                Older
              </Button>
              <Badge variant="light" color="violet" size="lg">
                Viewing Previous • {historyItem?.answer === "easy" ? "✓ Easy" : "✗ Hard"}
              </Badge>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={handleViewNext}
                rightSection={<IconArrowLeft size={14} style={{ transform: "rotate(180deg)" }} />}
              >
                {viewingHistoryIndex === reviewHistory.length - 1 ? "Current" : "Newer"}
              </Button>
            </Group>
          )}

          <Paper
            p="xl"
            radius="lg"
            onClick={isViewingHistory ? undefined : handleFlip}
            withBorder
            shadow="sm"
            style={{
              borderColor: isViewingHistory 
                ? "var(--mantine-color-violet-6)" 
                : (showBack ? "var(--mantine-color-pink-6)" : undefined),
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: isViewingHistory ? "default" : "pointer",
              transition: "all 0.3s ease",
              transform: isAnimating ? "scale(0.98)" : "scale(1)",
            }}
          >
            {isViewingHistory ? (
              /* History view - show both sides */
              <>
                <Badge variant="light" color="violet" size="sm" mb="md">
                  Previous Card • Box {displayCard?.box || 1}
                </Badge>
                
                {/* Front */}
                <Text size="1.5rem" fw={700} ta="center" mb="sm">
                  {displayCard?.front}
                </Text>
                
                <Box w="100%" h={1} bg="gray.3" my="md" />
                
                {/* Back */}
                {(() => {
                  const { definition, rest } = extractDefinition(displayCard?.back || "");
                  return (
                    <>
                      {definition && (
                        <Text size="xl" fw={600} c="pink" mb="xs">
                          {definition}
                        </Text>
                      )}
                      <TypographyStylesProvider
                        style={{
                          fontSize: "1rem",
                          lineHeight: 1.6,
                          maxHeight: "30vh",
                          overflow: "auto",
                          textAlign: "center",
                        }}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html: marked(rest),
                          }}
                        />
                      </TypographyStylesProvider>
                    </>
                  );
                })()}
                
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconPlayerPlay size={14} />}
                  onClick={() => speak(displayCard?.front)}
                  loading={isSpeaking}
                  mt="md"
                >
                  Speak
                </Button>
              </>
            ) : (
              /* Normal study view */
              <>
                <Badge variant="light" color={showBack ? "pink" : "gray"} size="sm" mb="md">
                  {showBack ? "Back" : "Front"} • Box {displayCard?.box || 1}
                </Badge>

                {(() => {
                  const content = showBack ? displayCard?.back || "" : displayCard?.front || "";
                  const { definition, rest } = showBack ? extractDefinition(content) : { definition: null, rest: content };
                  
                  return (
                    <>
                      {/* Show extracted definition prominently at the top */}
                      {definition && (
                        <Text
                          size="2rem"
                          fw={700}
                          c="pink"
                          mb="md"
                        >
                          {definition}
                        </Text>
                      )}
                      
                      <TypographyStylesProvider
                        style={{
                          fontSize: definition ? "1rem" : "1.25rem",
                          lineHeight: 1.6,
                          maxHeight: definition ? "40vh" : "50vh",
                          overflow: "auto",
                          textAlign: "center",
                        }}
                      >
                        <div
                          ref={cardContentRef}
                          dangerouslySetInnerHTML={{
                            __html: marked(rest),
                          }}
                        />
                      </TypographyStylesProvider>
                    </>
                  );
                })()}

                {/* Text-to-speech button */}
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconPlayerPlay size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(showBack ? displayCard?.back : displayCard?.front);
                  }}
                  loading={isSpeaking}
                  mt="sm"
                >
                  {isSpeaking ? "Speaking..." : "Speak"}
                </Button>

                {/* Audio play buttons */}
                {(() => {
                  const audioUrls = showBack ? displayCard?.backAudio : displayCard?.frontAudio;
                  if (audioUrls && audioUrls.length > 0) {
                    return (
                      <Group gap="xs" mt="md" justify="center">
                        {audioUrls.map((url, idx) => (
                          <Button
                            key={idx}
                            size="xs"
                            variant="light"
                            color="pink"
                            leftSection={<IconVolume size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(url);
                            }}
                            loading={audioPlaying}
                          >
                            {audioUrls.length > 1 ? `Audio ${idx + 1}` : "Play Audio"}
                          </Button>
                        ))}
                      </Group>
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {/* Show Example button - only on front, not when viewing history */}
            {!isViewingHistory && !showBack && (
              <Box mt="md">
                {!showExample && (
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateExample();
                    }}
                    loading={loadingExample}
                  >
                    Show Example
                  </Button>
                )}
                
                {showExample && exampleSentence && (
                  <Paper p="sm" mt="sm" radius="md" bg={isDark ? "dark.6" : "gray.0"}>
                    <Text size="sm" fw={500}>{exampleSentence.target}</Text>
                  </Paper>
                )}
              </Box>
            )}

            {!isViewingHistory && (
              <Group gap="xs" mt="xl">
                <IconRotate size={16} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">Click or press Space to flip</Text>
              </Group>
            )}
          </Paper>

          {isViewingHistory ? (
            /* History mode - show return button */
            <Group justify="center" mt="xl">
              <Button
                size="lg"
                variant="filled"
                color="violet"
                onClick={handleReturnToCurrent}
              >
                Return to Current Card
              </Button>
            </Group>
          ) : (
            /* Normal mode - show easy/hard buttons */
            <Transition mounted={showBack} transition="slide-up" duration={200}>
              {(styles) => (
                <Group justify="center" gap="md" mt="xl" wrap="nowrap" style={styles}>
                  <Button size="lg" variant="light" color="red" leftSection={<IconX size={20} />} onClick={() => handleAnswer("hard")} disabled={isAnimating} style={{ minWidth: 120, flex: 1, maxWidth: 160 }}>
                    Hard
                  </Button>
                  <Button size="lg" variant="filled" color="green" leftSection={<IconCheck size={20} />} onClick={() => handleAnswer("easy")} disabled={isAnimating} style={{ minWidth: 120, flex: 1, maxWidth: 160 }}>
                    Easy
                  </Button>
                </Group>
              )}
            </Transition>
          )}

          <Text size="xs" c="dimmed" ta="center" mt="xl">
            {isViewingHistory 
              ? "Keyboard: ← = Older • → = Newer • Space/Esc = Return to current • P = Previous"
              : "Keyboard: Space = Flip • ← = Hard • → = Easy • P = Previous • Esc = Exit"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

