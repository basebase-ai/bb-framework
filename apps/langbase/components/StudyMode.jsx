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
import { collections, LEITNER_INTERVALS, SUPPORTED_LANGUAGES } from "../schema.js";

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
/** @typedef {'new' | 'struggling' | 'learning' | 'overdue' | 'all'} StudyType */

export function StudyMode({ deckId, onBack, onComplete }) {
  const { user } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  // Study options state (shown before studying)
  const [studyStarted, setStudyStarted] = useState(false);
  const [studyType, setStudyType] = useState(/** @type {StudyType} */ ("all"));
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
  const cardContentRef = useRef(/** @type {HTMLDivElement | null} */ (null));

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

  const cardQueryOptions = useMemo(() => ({
    where: user?.uid ? [
      ["deckId", "==", deckId],
      ["owner", "==", user.uid],
    ] : [],
  }), [deckId, user?.uid]);

  const {
    data: allCards,
    loading: cardsLoading,
    update: updateCard,
  } = useCollection(collections.cards, cardQueryOptions);

  // Calculate card counts by type (for study options screen)
  const cardCounts = useMemo(() => {
    const now = new Date();
    
    let newCards = 0;
    let reviewsDue = 0;     // Cards that have been seen and are due
    let strugglingCards = 0;  // In Box 1, have been reviewed (marked hard)
    let learningCards = 0;    // In Box 2-4, progressing
    
    allCards.forEach((card) => {
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      const reviewDate = card.nextReviewAt 
        ? (card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt))
        : null;
      const isDue = !reviewDate || reviewDate <= now;
      
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
      dailyTotal: newToday + reviewsDue  // Today's manageable session
    };
  }, [allCards, newCardsPerDay]);

  // Filter and limit cards based on study options
  const dueCards = useMemo(() => {
    const now = new Date();
    const newLimit = typeof newCardsPerDay === "number" ? newCardsPerDay : 40;
    
    // First, separate new cards and review cards
    /** @type {typeof allCards} */
    const newCardsPool = [];
    /** @type {typeof allCards} */
    const reviewCardsPool = [];
    
    allCards.forEach((card) => {
      if (reviewedCardIds.has(card.id)) return;
      
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      const reviewDate = card.nextReviewAt 
        ? (card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt))
        : null;
      const isDue = !reviewDate || reviewDate <= now;
      
      // Filter by study type
      switch (studyType) {
        case "new":
          if (isNew) newCardsPool.push(card);
          break;
        case "struggling":
          if (!isNew && box === 1) reviewCardsPool.push(card);
          break;
        case "learning":
          if (!isNew && box >= 2 && box <= 4) reviewCardsPool.push(card);
          break;
        case "all":
        default:
          if (isNew) {
            newCardsPool.push(card);
          } else if (isDue) {
            reviewCardsPool.push(card);
          }
          break;
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
    
    // For "all" mode: limit new cards, include all reviews
    // For other modes: no limit on the selected type
    if (studyType === "all") {
      const limitedNew = newCardsPool.slice(0, newLimit);
      return [...reviewCardsPool, ...limitedNew]; // Reviews first, then new
    } else if (studyType === "new") {
      return newCardsPool.slice(0, newLimit);
    } else {
      return reviewCardsPool;
    }
  }, [allCards, reviewedCardIds, studyType, newCardsPerDay]);

  const currentCard = dueCards[currentIndex];
  // Use captured session size for stable progress tracking (doesn't change as cards are reviewed)
  const totalDue = sessionTotalCards ?? (dueCards.length + sessionStats.reviewed);
  const progress = totalDue > 0 ? (sessionStats.reviewed / totalDue) * 100 : 0;

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isAnimating) return;

      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          setShowBack(!showBack);
          break;
        case "ArrowRight":
        case "1":
          if (showBack && currentCard) handleAnswer("easy");
          break;
        case "ArrowLeft":
        case "2":
          if (showBack && currentCard) handleAnswer("hard");
          break;
        case "Escape":
          onBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBack, currentCard, isAnimating]);

  /** @param {'easy' | 'hard'} difficulty */
  const handleAnswer = useCallback(async (difficulty) => {
    if (!currentCard || isAnimating) return;
    
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
      // Set showBack to false FIRST to prevent flash of next card's back
      setShowBack(false);
      
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
  }, [currentCard, currentIndex, dueCards.length, isAnimating, updateCard, sessionTotalCards, sessionStats.reviewed]);

  const handleFlip = () => {
    if (!isAnimating) setShowBack(!showBack);
  };

  useEffect(() => {
    if (deck && allCards.length > 0) {
      const masteredCount = allCards.filter((c) => c.box === 5).length;
      if (deck.masteredCount !== masteredCount) {
        updateDeck({ masteredCount });
      }
    }
  }, [allCards, deck, updateDeck]);

  if (deckLoading || cardsLoading) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text c="dimmed">Loading study session...</Text>
      </Box>
    );
  }

  // Study options screen (before starting)
  if (!studyStarted) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" withBorder shadow="sm" style={{ maxWidth: 500, width: "100%" }}>
          <Group justify="space-between" mb="xl">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={3}>{deck?.name}</Title>
            <Box w={28} />
          </Group>

          {/* Today's Session - the main option */}
          <Paper
            p="lg"
            radius="md"
            onClick={() => cardCounts.dailyTotal > 0 && setStudyType("all")}
            mb="lg"
            withBorder
            style={{
              borderColor: studyType === "all" ? "var(--mantine-color-pink-6)" : undefined,
              borderWidth: studyType === "all" ? 2 : 1,
              cursor: cardCounts.dailyTotal > 0 ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
              opacity: cardCounts.dailyTotal > 0 ? 1 : 0.5,
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

          {/* Additional options - collapsed by default */}
          <Text c="dimmed" size="xs" mb="sm">Or focus on a specific type:</Text>
          <SimpleGrid cols={3} spacing="sm" mb="xl">
            <Paper
              p="sm"
              radius="md"
              onClick={() => cardCounts.newCards > 0 && setStudyType("new")}
              withBorder
              style={{
                borderColor: studyType === "new" ? "var(--mantine-color-cyan-6)" : undefined,
                cursor: cardCounts.newCards > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                opacity: cardCounts.newCards > 0 ? 1 : 0.4,
              }}
            >
              <Text fw={600} c="cyan" size="lg">{cardCounts.newToday}</Text>
              <Text size="xs" c="dimmed">New</Text>
            </Paper>

            <Paper
              p="sm"
              radius="md"
              onClick={() => cardCounts.strugglingCards > 0 && setStudyType("struggling")}
              withBorder
              style={{
                borderColor: studyType === "struggling" ? "var(--mantine-color-red-6)" : undefined,
                cursor: cardCounts.strugglingCards > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                opacity: cardCounts.strugglingCards > 0 ? 1 : 0.4,
              }}
            >
              <Text fw={600} c="red" size="lg">{cardCounts.strugglingCards}</Text>
              <Text size="xs" c="dimmed">Struggling</Text>
            </Paper>

            <Paper
              p="sm"
              radius="md"
              onClick={() => cardCounts.learningCards > 0 && setStudyType("learning")}
              withBorder
              style={{
                borderColor: studyType === "learning" ? "var(--mantine-color-green-6)" : undefined,
                cursor: cardCounts.learningCards > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                opacity: cardCounts.learningCards > 0 ? 1 : 0.4,
              }}
            >
              <Text fw={600} c="green" size="lg">{cardCounts.learningCards}</Text>
              <Text size="xs" c="dimmed">Learning</Text>
            </Paper>
          </SimpleGrid>

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
              disabled={
                (studyType === "new" && cardCounts.newCards === 0) ||
                (studyType === "struggling" && cardCounts.strugglingCards === 0) ||
                (studyType === "learning" && cardCounts.learningCards === 0) ||
                (studyType === "all" && cardCounts.dailyTotal === 0)
              }
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
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
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

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <Group justify="space-between" maw={800} mx="auto">
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text fw={500}>{deck?.name}</Text>
          </Group>
          <Group gap="md">
            <Badge variant="light" color="green">✓ {sessionStats.correct}</Badge>
            <Badge variant="light" color="red">✗ {sessionStats.incorrect}</Badge>
            <Text size="sm" c="dimmed">{sessionStats.reviewed} / {totalDue}</Text>
          </Group>
        </Group>
        <Progress value={progress} color="pink" size="xs" radius={0} mt="sm" />
      </Box>

      <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Box style={{ width: "100%", maxWidth: 600 }}>
          <Paper
            p="xl"
            radius="lg"
            onClick={handleFlip}
            withBorder
            shadow="sm"
            style={{
              borderColor: showBack ? "var(--mantine-color-pink-6)" : undefined,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              transform: isAnimating ? "scale(0.98)" : "scale(1)",
            }}
          >
            <Badge variant="light" color={showBack ? "pink" : "gray"} size="sm" mb="md">
              {showBack ? "Back" : "Front"} • Box {currentCard?.box || 1}
            </Badge>

            {(() => {
              const content = showBack ? currentCard?.back || "" : currentCard?.front || "";
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
                speak(showBack ? currentCard?.back : currentCard?.front);
              }}
              loading={isSpeaking}
              mt="sm"
            >
              {isSpeaking ? "Speaking..." : "Speak"}
            </Button>

            {/* Audio play buttons */}
            {(() => {
              const audioUrls = showBack ? currentCard?.backAudio : currentCard?.frontAudio;
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

            <Group gap="xs" mt="xl">
              <IconRotate size={16} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">Click or press Space to flip</Text>
            </Group>
          </Paper>

          <Transition mounted={showBack} transition="slide-up" duration={200}>
            {(styles) => (
              <Group justify="center" gap="xl" mt="xl" style={styles}>
                <Button size="xl" variant="light" color="red" leftSection={<IconX size={24} />} onClick={() => handleAnswer("hard")} disabled={isAnimating} style={{ minWidth: 150 }}>
                  Hard
                </Button>
                <Button size="xl" variant="filled" color="green" leftSection={<IconCheck size={24} />} onClick={() => handleAnswer("easy")} disabled={isAnimating} style={{ minWidth: 150 }}>
                  Easy
                </Button>
              </Group>
            )}
          </Transition>

          <Text size="xs" c="dimmed" ta="center" mt="xl">
            Keyboard: Space = Flip • ← = Hard • → = Easy • Esc = Exit
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

