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
  SegmentedControl,
  NumberInput,
  SimpleGrid,
  ThemeIcon,
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
  IconClock,
  IconSparkles,
  IconStack2,
  IconAlertTriangle,
  IconTrendingUp,
  IconAlarm,
} from "@tabler/icons-react";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, LEITNER_INTERVALS } from "../schema.js";

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
 * @param {number} box
 * @returns {Date}
 */
function getNextReviewDate(box) {
  const days = LEITNER_INTERVALS[box] || 1;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * @param {{ deckId: string, onBack: () => void, onComplete: () => void }} props
 */
/** @typedef {'new' | 'struggling' | 'learning' | 'overdue' | 'all'} StudyType */

export function StudyMode({ deckId, onBack, onComplete }) {
  const { user } = useAuth();
  
  // Study options state (shown before studying)
  const [studyStarted, setStudyStarted] = useState(false);
  const [studyType, setStudyType] = useState(/** @type {StudyType} */ ("all"));
  const [cardLimit, setCardLimit] = useState(/** @type {number | ''} */ (20));
  
  // Study session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, reviewed: 0 });
  const [reviewedCardIds, setReviewedCardIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const cardContentRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  // Preload speech synthesis voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        const norwegianVoice = voices.find(
          (v) => v.lang.startsWith("no") || v.lang.startsWith("nb") || v.lang.startsWith("nn")
        );
        if (norwegianVoice) {
          console.log("[TTS] Norwegian voice found:", norwegianVoice.name, norwegianVoice.lang);
        } else {
          console.log("[TTS] No Norwegian voice found, will use default with nb-NO lang code");
        }
      }
    };
    
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  /**
   * Speak text using Web Speech API with Norwegian voice if available
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
    
    // Try to find a Norwegian voice
    const voices = window.speechSynthesis.getVoices();
    const norwegianVoice = voices.find(
      (v) => v.lang.startsWith("no") || v.lang.startsWith("nb") || v.lang.startsWith("nn")
    );
    
    if (norwegianVoice) {
      utterance.voice = norwegianVoice;
      utterance.lang = norwegianVoice.lang;
    } else {
      // Fallback to Norwegian language code even without a specific voice
      utterance.lang = "nb-NO";
    }
    
    utterance.rate = 0.9; // Slightly slower for learning
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, []);

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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    let newCards = 0;
    let overdue = 0;      // Past due date
    let dueToday = 0;     // Due today
    let dueSoon = 0;      // Due in next 7 days
    let strugglingCards = 0;  // In Box 1, have been reviewed (marked hard)
    let learningCards = 0;    // In Box 2-4, progressing
    
    allCards.forEach((card) => {
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      
      if (isNew) {
        newCards++;
      } else {
        // Card has been reviewed - categorize by box
        if (box === 1) {
          strugglingCards++;
        } else if (box >= 2 && box <= 4) {
          learningCards++;
        }
        // Box 5 = mastered, not counted separately for review
        
        // Categorize by schedule
        if (card.nextReviewAt) {
          const reviewDate = card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt);
          if (reviewDate < today) {
            overdue++;
          } else if (reviewDate < tomorrow) {
            dueToday++;
          } else if (reviewDate < nextWeek) {
            dueSoon++;
          }
        }
      }
    });
    
    return { 
      newCards, 
      overdue,
      dueToday,
      dueSoon,
      strugglingCards, 
      learningCards,
      totalDue: overdue + dueToday,
      total: newCards + overdue + dueToday
    };
  }, [allCards]);

  // Filter and limit cards based on study options
  const dueCards = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const filtered = allCards.filter((card) => {
      if (reviewedCardIds.has(card.id)) return false;
      
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      const reviewDate = card.nextReviewAt 
        ? (card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt))
        : null;
      const isDue = !reviewDate || reviewDate <= now;
      const isOverdue = reviewDate && reviewDate < today;
      
      // Filter by study type
      switch (studyType) {
        case "new":
          return isNew;
        case "struggling":
          // Show ALL struggling cards (Box 1) - user wants to practice hard ones
          return !isNew && box === 1;
        case "learning":
          // Show ALL learning cards (Box 2-4) - user wants to reinforce
          return !isNew && box >= 2 && box <= 4;
        case "overdue":
          return !isNew && isOverdue;
        case "all":
        default:
          return isDue;
      }
    });
    
    // Sort by importOrder (asc) to preserve original file order
    const sorted = filtered.sort((a, b) => {
      if (a.importOrder !== undefined && b.importOrder !== undefined) {
        return a.importOrder - b.importOrder;
      }
      if (a.importOrder !== undefined) return -1;
      if (b.importOrder !== undefined) return 1;
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    // Apply card limit
    const limit = typeof cardLimit === "number" && cardLimit > 0 ? cardLimit : sorted.length;
    return sorted.slice(0, limit);
  }, [allCards, reviewedCardIds, studyType, cardLimit]);

  const currentCard = dueCards[currentIndex];
  const totalDue = dueCards.length + sessionStats.reviewed;
  const progress = totalDue > 0 ? (sessionStats.reviewed / totalDue) * 100 : 0;

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
  }, [currentCard, currentIndex, dueCards.length, isAnimating, updateCard]);

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
      <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text c="dimmed">Loading study session...</Text>
      </Box>
    );
  }

  // Study options screen (before starting)
  if (!studyStarted) {
    return (
      <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(233, 69, 96, 0.3)", maxWidth: 500, width: "100%" }}>
          <Group justify="space-between" mb="xl">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={3} c="white">{deck?.name}</Title>
            <Box w={28} />
          </Group>

          <Title order={4} c="white" mb="md">What would you like to study?</Title>
          
          <SimpleGrid cols={2} spacing="md" mb="md">
            <Paper
              p="md"
              radius="md"
              onClick={() => cardCounts.newCards > 0 && setStudyType("new")}
              style={{
                background: studyType === "new" ? "rgba(233, 69, 96, 0.2)" : "rgba(255, 255, 255, 0.02)",
                border: `2px solid ${studyType === "new" ? "#e94560" : "rgba(255, 255, 255, 0.1)"}`,
                cursor: cardCounts.newCards > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                transition: "all 0.2s ease",
                opacity: cardCounts.newCards > 0 ? 1 : 0.5,
              }}
            >
              <ThemeIcon size="xl" radius="xl" variant="light" color="cyan" mx="auto" mb="sm">
                <IconSparkles size={24} />
              </ThemeIcon>
              <Text fw={600} c="white" size="sm">New Cards</Text>
              <Text size="xl" fw={700} c="cyan">{cardCounts.newCards}</Text>
              <Text size="xs" c="dimmed">Never seen</Text>
            </Paper>

            <Paper
              p="md"
              radius="md"
              onClick={() => cardCounts.strugglingCards > 0 && setStudyType("struggling")}
              style={{
                background: studyType === "struggling" ? "rgba(233, 69, 96, 0.2)" : "rgba(255, 255, 255, 0.02)",
                border: `2px solid ${studyType === "struggling" ? "#e94560" : "rgba(255, 255, 255, 0.1)"}`,
                cursor: cardCounts.strugglingCards > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                transition: "all 0.2s ease",
                opacity: cardCounts.strugglingCards > 0 ? 1 : 0.5,
              }}
            >
              <ThemeIcon size="xl" radius="xl" variant="light" color="red" mx="auto" mb="sm">
                <IconAlertTriangle size={24} />
              </ThemeIcon>
              <Text fw={600} c="white" size="sm">Struggling</Text>
              <Text size="xl" fw={700} c="red">{cardCounts.strugglingCards}</Text>
              <Text size="xs" c="dimmed">Marked hard</Text>
            </Paper>

            <Paper
              p="md"
              radius="md"
              onClick={() => cardCounts.learningCards > 0 && setStudyType("learning")}
              style={{
                background: studyType === "learning" ? "rgba(233, 69, 96, 0.2)" : "rgba(255, 255, 255, 0.02)",
                border: `2px solid ${studyType === "learning" ? "#e94560" : "rgba(255, 255, 255, 0.1)"}`,
                cursor: cardCounts.learningCards > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                transition: "all 0.2s ease",
                opacity: cardCounts.learningCards > 0 ? 1 : 0.5,
              }}
            >
              <ThemeIcon size="xl" radius="xl" variant="light" color="green" mx="auto" mb="sm">
                <IconTrendingUp size={24} />
              </ThemeIcon>
              <Text fw={600} c="white" size="sm">Learning</Text>
              <Text size="xl" fw={700} c="green">{cardCounts.learningCards}</Text>
              <Text size="xs" c="dimmed">Progressing</Text>
            </Paper>

            <Paper
              p="md"
              radius="md"
              onClick={() => cardCounts.overdue > 0 && setStudyType("overdue")}
              style={{
                background: studyType === "overdue" ? "rgba(233, 69, 96, 0.2)" : "rgba(255, 255, 255, 0.02)",
                border: `2px solid ${studyType === "overdue" ? "#e94560" : "rgba(255, 255, 255, 0.1)"}`,
                cursor: cardCounts.overdue > 0 ? "pointer" : "not-allowed",
                textAlign: "center",
                transition: "all 0.2s ease",
                opacity: cardCounts.overdue > 0 ? 1 : 0.5,
              }}
            >
              <ThemeIcon size="xl" radius="xl" variant="light" color="orange" mx="auto" mb="sm">
                <IconAlarm size={24} />
              </ThemeIcon>
              <Text fw={600} c="white" size="sm">Overdue</Text>
              <Text size="xl" fw={700} c="orange">{cardCounts.overdue}</Text>
              <Text size="xs" c="dimmed">Past schedule</Text>
            </Paper>
          </SimpleGrid>

          <Paper
            p="md"
            radius="md"
            onClick={() => cardCounts.total > 0 && setStudyType("all")}
            mb="xl"
            style={{
              background: studyType === "all" ? "rgba(233, 69, 96, 0.2)" : "rgba(255, 255, 255, 0.02)",
              border: `2px solid ${studyType === "all" ? "#e94560" : "rgba(255, 255, 255, 0.1)"}`,
              cursor: cardCounts.total > 0 ? "pointer" : "not-allowed",
              textAlign: "center",
              transition: "all 0.2s ease",
              opacity: cardCounts.total > 0 ? 1 : 0.5,
            }}
          >
            <Group justify="center" gap="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="pink">
                <IconStack2 size={24} />
              </ThemeIcon>
              <Box>
                <Text fw={600} c="white" size="sm">All Due Cards</Text>
                <Text size="xs" c="dimmed">{cardCounts.newCards} new + {cardCounts.totalDue} review = <Text span fw={700} c="pink">{cardCounts.total}</Text> total</Text>
              </Box>
            </Group>
          </Paper>

          <Text c="dimmed" size="sm" mb="xs">How many cards?</Text>
          <NumberInput
            value={cardLimit}
            onChange={(val) => setCardLimit(val)}
            min={1}
            max={500}
            step={5}
            placeholder="All cards"
            styles={{
              input: { background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)", color: "white" },
            }}
            mb="xl"
          />

          <Group justify="center" gap="md">
            <Button variant="light" color="gray" onClick={onBack}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "#e94560", to: "#ff6b6b" }}
              size="lg"
              leftSection={<IconCards size={20} />}
              onClick={() => setStudyStarted(true)}
              disabled={
                (studyType === "new" && cardCounts.newCards === 0) ||
                (studyType === "struggling" && cardCounts.strugglingCards === 0) ||
                (studyType === "learning" && cardCounts.learningCards === 0) ||
                (studyType === "overdue" && cardCounts.overdue === 0) ||
                (studyType === "all" && cardCounts.total === 0)
              }
            >
              Start Studying
            </Button>
          </Group>

          {cardCounts.total === 0 && (
            <Text c="dimmed" size="sm" ta="center" mt="md">
              No cards are due for study right now. Check back later!
            </Text>
          )}
        </Paper>
      </Box>
    );
  }

  if (dueCards.length === 0) {
    const totalReviewed = sessionStats.reviewed;
    const accuracy = totalReviewed > 0 ? Math.round((sessionStats.correct / totalReviewed) * 100) : 0;

    return (
      <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(233, 69, 96, 0.3)", maxWidth: 500, width: "100%", textAlign: "center" }}>
          <Title order={2} c="white" mb="lg">🎉 Session Complete!</Title>

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
                label={<Text ta="center" fw={700} size="xl" c="white">{accuracy}%</Text>}
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
                variant="gradient"
                gradient={{ from: "#e94560", to: "#ff6b6b" }}
                leftSection={<IconRefresh size={16} />}
                onClick={() => {
                  setReviewedCardIds(new Set());
                  setSessionStats({ correct: 0, incorrect: 0, reviewed: 0 });
                  setCurrentIndex(0);
                  setShowBack(false);
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
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", flexDirection: "column" }}>
      <Box px="md" py="sm" style={{ background: "rgba(0, 0, 0, 0.3)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Group justify="space-between" maw={800} mx="auto">
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text c="white" fw={500}>{deck?.name}</Text>
          </Group>
          <Group gap="md">
            <Badge variant="light" color="green">✓ {sessionStats.correct}</Badge>
            <Badge variant="light" color="red">✗ {sessionStats.incorrect}</Badge>
            <Text size="sm" c="dimmed">{sessionStats.reviewed} / {totalDue}</Text>
          </Group>
        </Group>
        <Progress value={progress} color="pink" size="xs" radius={0} mt="sm" style={{ background: "rgba(255, 255, 255, 0.1)" }} />
      </Box>

      <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Box style={{ width: "100%", maxWidth: 600 }}>
          <Paper
            p="xl"
            radius="lg"
            onClick={handleFlip}
            style={{
              background: showBack ? "linear-gradient(135deg, rgba(233, 69, 96, 0.1), rgba(255, 107, 107, 0.05))" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${showBack ? "rgba(233, 69, 96, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
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
                      c="white"
                      mb="md"
                      style={{ 
                        background: "linear-gradient(90deg, #e94560, #ff6b6b)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
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
                      color: definition ? "#aaa" : "white",
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
              <IconRotate size={16} color="#666" />
              <Text size="xs" c="dimmed">Click or press Space to flip</Text>
            </Group>
          </Paper>

          <Transition mounted={showBack} transition="slide-up" duration={200}>
            {(styles) => (
              <Group justify="center" gap="xl" mt="xl" style={styles}>
                <Button size="xl" variant="light" color="red" leftSection={<IconX size={24} />} onClick={() => handleAnswer("hard")} disabled={isAnimating} style={{ minWidth: 150 }}>
                  Hard
                </Button>
                <Button size="xl" variant="gradient" gradient={{ from: "green", to: "lime" }} leftSection={<IconCheck size={24} />} onClick={() => handleAnswer("easy")} disabled={isAnimating} style={{ minWidth: 150 }}>
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

