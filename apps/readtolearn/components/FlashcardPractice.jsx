/**
 * FlashcardPractice - Spaced repetition flashcard practice mode
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  Paper,
  Title,
  Progress,
  Badge,
  Center,
  ActionIcon,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconX,
  IconVolume,
  IconRefresh,
  IconCards,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useSpeech } from "../hooks/useSpeech.js";
import { useUIStore } from "../stores/uiStore.js";
import { collections } from "../schema.js";

/**
 * Spaced repetition intervals (in days) for each mastery level
 */
const MASTERY_INTERVALS = {
  0: 0, // New word - review immediately
  1: 1, // 1 day
  2: 3, // 3 days
  3: 7, // 1 week
  4: 14, // 2 weeks
  5: 30, // 1 month (mastered)
};

/**
 * @param {{ onBack: () => void }} props
 */
export function FlashcardPractice({ onBack }) {
  const { user } = useAuth();
  const { speak, supported: speechSupported } = useSpeech();
  const sourceLanguage = useUIStore((s) => s.sourceLanguage);
  const autoPlayAudio = useUIStore((s) => s.autoPlayAudio);

  // Memoize query options to prevent infinite re-renders
  const vocabQueryOptions = useMemo(
    () => ({
      where: user ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  const { data: vocabulary, update: updateVocab } = useCollection(
    collections.vocabulary,
    vocabQueryOptions
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [sessionComplete, setSessionComplete] = useState(false);

  // Get cards due for review (sorted by priority)
  const dueCards = useMemo(() => {
    if (!vocabulary) return [];

    const now = new Date();
    return vocabulary
      .filter((v) => {
        // Include if never reviewed or due for review
        if (!v.nextReviewAt) return true;
        const nextReview = v.nextReviewAt.toDate ? v.nextReviewAt.toDate() : new Date(v.nextReviewAt);
        return nextReview <= now;
      })
      .sort((a, b) => {
        // Prioritize: new words (no masteryLevel), then by mastery level (lower first)
        const aLevel = a.masteryLevel || 0;
        const bLevel = b.masteryLevel || 0;
        return aLevel - bLevel;
      })
      .slice(0, 20); // Limit to 20 cards per session
  }, [vocabulary]);

  const currentCard = dueCards[currentIndex];
  const progress = dueCards.length > 0 ? ((currentIndex + 1) / dueCards.length) * 100 : 0;

  /**
   * Handle showing the answer
   */
  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
    // Play audio when showing answer if enabled
    if (autoPlayAudio && speechSupported && currentCard) {
      speak(currentCard.word, sourceLanguage);
    }
  }, [autoPlayAudio, speechSupported, currentCard, speak, sourceLanguage]);

  /**
   * Handle answer (correct or incorrect)
   * @param {boolean} correct
   */
  const handleAnswer = useCallback(
    async (correct) => {
      if (!currentCard) return;

      const now = new Date();
      const currentLevel = currentCard.masteryLevel || 0;

      // Calculate new mastery level
      let newLevel;
      if (correct) {
        newLevel = Math.min(currentLevel + 1, 5);
      } else {
        newLevel = Math.max(currentLevel - 1, 0);
      }

      // Calculate next review date
      const intervalDays = MASTERY_INTERVALS[newLevel] || 0;
      const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

      // Update in database
      try {
        await updateVocab(currentCard.id, {
          masteryLevel: newLevel,
          correctCount: (currentCard.correctCount || 0) + (correct ? 1 : 0),
          incorrectCount: (currentCard.incorrectCount || 0) + (correct ? 0 : 1),
          lastReviewedAt: now,
          nextReviewAt: nextReview,
        });
      } catch (err) {
        console.error("Failed to update vocabulary:", err);
      }

      // Update session stats
      setSessionStats((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
      }));

      // Move to next card
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setSessionComplete(true);
      }
    },
    [currentCard, currentIndex, dueCards.length, updateVocab]
  );

  /**
   * Start a new session
   */
  const handleNewSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    setSessionComplete(false);
  };

  /**
   * Play word pronunciation
   */
  const handleSpeak = () => {
    if (currentCard) {
      speak(currentCard.word, sourceLanguage);
    }
  };

  // No vocabulary yet
  if (!vocabulary || vocabulary.length === 0) {
    return (
      <Box>
        <Group mb="xl">
          <ActionIcon variant="subtle" onClick={onBack} size="lg">
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={3}>Flashcard Practice</Title>
        </Group>

        <Center py="xl">
          <Stack align="center" gap="md">
            <IconCards size={60} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed" ta="center">
              No vocabulary words yet!
              <br />
              Start reading and click on words to build your vocabulary.
            </Text>
            <Button variant="light" onClick={onBack}>
              Back to Reading
            </Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  // No cards due for review
  if (dueCards.length === 0 && !sessionComplete) {
    return (
      <Box>
        <Group mb="xl">
          <ActionIcon variant="subtle" onClick={onBack} size="lg">
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={3}>Flashcard Practice</Title>
        </Group>

        <Center py="xl">
          <Stack align="center" gap="md">
            <IconCheck size={60} color="var(--mantine-color-green-5)" />
            <Text c="dimmed" ta="center">
              All caught up! No cards due for review.
              <br />
              Keep reading to learn more words.
            </Text>
            <Text size="sm" c="dimmed">
              {vocabulary.length} words in vocabulary
            </Text>
            <Button variant="light" onClick={onBack}>
              Back to Reading
            </Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  // Session complete
  if (sessionComplete) {
    const accuracy =
      sessionStats.correct + sessionStats.incorrect > 0
        ? Math.round(
            (sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100
          )
        : 0;

    return (
      <Box>
        <Group mb="xl">
          <ActionIcon variant="subtle" onClick={onBack} size="lg">
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={3}>Session Complete!</Title>
        </Group>

        <Center py="xl">
          <Stack align="center" gap="lg">
            <Box
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background:
                  accuracy >= 80
                    ? "linear-gradient(135deg, var(--mantine-color-green-6), var(--mantine-color-teal-6))"
                    : accuracy >= 50
                    ? "linear-gradient(135deg, var(--mantine-color-yellow-6), var(--mantine-color-orange-6))"
                    : "linear-gradient(135deg, var(--mantine-color-red-6), var(--mantine-color-pink-6))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text size="xl" fw={700} c="white">
                {accuracy}%
              </Text>
            </Box>

            <Stack align="center" gap="xs">
              <Text size="lg" fw={600}>
                {sessionStats.correct + sessionStats.incorrect} cards reviewed
              </Text>
              <Group gap="lg">
                <Badge color="green" size="lg" leftSection={<IconCheck size={14} />}>
                  {sessionStats.correct} correct
                </Badge>
                <Badge color="red" size="lg" leftSection={<IconX size={14} />}>
                  {sessionStats.incorrect} incorrect
                </Badge>
              </Group>
            </Stack>

            <Group mt="md">
              <Button
                variant="light"
                leftSection={<IconRefresh size={18} />}
                onClick={handleNewSession}
              >
                Practice Again
              </Button>
              <Button variant="subtle" onClick={onBack}>
                Back to Reading
              </Button>
            </Group>
          </Stack>
        </Center>
      </Box>
    );
  }

  // Flashcard view
  return (
    <Box>
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Group gap="md">
          <ActionIcon variant="subtle" onClick={onBack} size="lg">
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={3}>Flashcard Practice</Title>
        </Group>
        <Badge variant="light">
          {currentIndex + 1} / {dueCards.length}
        </Badge>
      </Group>

      {/* Progress */}
      <Progress value={progress} size="sm" mb="xl" color="blue" />

      {/* Flashcard */}
      <Center>
        <Paper
          withBorder
          p="xl"
          radius="lg"
          w="100%"
          maw={500}
          style={{
            minHeight: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--mantine-color-dark-7)",
            cursor: showAnswer ? "default" : "pointer",
          }}
          onClick={!showAnswer ? handleShowAnswer : undefined}
        >
          <Stack align="center" gap="lg">
            {/* Word */}
            <Group gap="sm">
              <Text
                size="2rem"
                fw={700}
                c="blue.4"
                ta="center"
                style={{ lineHeight: 1.2 }}
              >
                {currentCard?.word}
              </Text>
              {speechSupported && (
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak();
                  }}
                >
                  <IconVolume size={24} />
                </ActionIcon>
              )}
            </Group>

            {/* Answer or prompt */}
            {showAnswer ? (
              <>
                <Text size="xl" c="gray.3" ta="center">
                  {currentCard?.translation}
                </Text>

                {/* Mastery indicator */}
                <Badge
                  variant="light"
                  color={
                    (currentCard?.masteryLevel || 0) >= 4
                      ? "green"
                      : (currentCard?.masteryLevel || 0) >= 2
                      ? "yellow"
                      : "gray"
                  }
                >
                  Mastery: {currentCard?.masteryLevel || 0}/5
                </Badge>

                {/* Answer buttons */}
                <Group mt="md">
                  <Button
                    color="red"
                    variant="light"
                    size="lg"
                    leftSection={<IconX size={20} />}
                    onClick={() => handleAnswer(false)}
                  >
                    Wrong
                  </Button>
                  <Button
                    color="green"
                    variant="light"
                    size="lg"
                    leftSection={<IconCheck size={20} />}
                    onClick={() => handleAnswer(true)}
                  >
                    Correct
                  </Button>
                </Group>
              </>
            ) : (
              <Text c="dimmed" size="sm">
                Click to reveal answer
              </Text>
            )}
          </Stack>
        </Paper>
      </Center>

      {/* Session stats */}
      <Group justify="center" mt="xl" gap="lg">
        <Badge color="green" variant="light">
          <IconCheck size={12} style={{ marginRight: 4 }} />
          {sessionStats.correct}
        </Badge>
        <Badge color="red" variant="light">
          <IconX size={12} style={{ marginRight: 4 }} />
          {sessionStats.incorrect}
        </Badge>
      </Group>
    </Box>
  );
}

