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

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "@mantine/core";
import { marked } from "marked";
import {
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconX,
  IconRotate,
  IconVolume,
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
export function StudyMode({ deckId, onBack, onComplete }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, reviewed: 0 });
  const [reviewedCardIds, setReviewedCardIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  /**
   * Play an audio URL
   * @param {string} url
   */
  const playAudio = useCallback((url) => {
    const audio = new Audio(url);
    setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    audio.play().catch(() => setAudioPlaying(false));
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

  const dueCards = useMemo(() => {
    const now = new Date();
    const filtered = allCards.filter((card) => {
      if (reviewedCardIds.has(card.id)) return false;
      if (!card.nextReviewAt) return true;
      const reviewDate = card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt);
      return reviewDate <= now;
    });
    // Sort by importOrder (asc) to preserve original file order
    return filtered.sort((a, b) => {
      if (a.importOrder !== undefined && b.importOrder !== undefined) {
        return a.importOrder - b.importOrder;
      }
      if (a.importOrder !== undefined) return -1;
      if (b.importOrder !== undefined) return 1;
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [allCards, reviewedCardIds]);

  const currentCard = dueCards[currentIndex];
  const totalDue = dueCards.length + sessionStats.reviewed;
  const progress = totalDue > 0 ? (sessionStats.reviewed / totalDue) * 100 : 0;

  // Auto-play audio when flipping to back
  useEffect(() => {
    if (showBack && currentCard) {
      const backAudio = currentCard.backAudio;
      if (backAudio && backAudio.length > 0) {
        playAudio(backAudio[0]);
      }
    }
  }, [showBack, currentCard?.id, playAudio]);

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
                }}
              >
                Study Again
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

            <TypographyStylesProvider
              style={{
                fontSize: "1.25rem",
                lineHeight: 1.6,
                maxHeight: "50vh",
                overflow: "auto",
                textAlign: "center",
                color: "white",
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: marked(showBack ? currentCard?.back || "" : currentCard?.front || ""),
                }}
              />
            </TypographyStylesProvider>

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

