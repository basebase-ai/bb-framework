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
  RingProgress,
  NumberInput,
  ThemeIcon,
  Modal,
  Textarea,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconX,
  IconRotate,
  IconCards,
  IconEdit,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, LEITNER_INTERVALS } from "../schema.js";
import { useAppStore } from "../stores/appStore.js";

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
 * Calculate next review date based on Leitner box
 * @param {number} box
 * @returns {Date}
 */
function getNextReviewDate(box) {
  const days = LEITNER_INTERVALS[box] || 1;
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * @param {{ deckId: string, onBack: () => void, onComplete: () => void }} props
 */
export function StudyMode({ deckId, onBack, onComplete }) {
  const { user } = useAuth();
  
  // Study options state
  const [studyStarted, setStudyStarted] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState(/** @type {number[]} */ ([]));
  const [newCardsPerDay, setNewCardsPerDay] = useState(/** @type {number | ''} */ (20));
  
  // Study session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, reviewed: 0 });
  const [reviewedCardIds, setReviewedCardIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionTotalCards, setSessionTotalCards] = useState(/** @type {number | null} */ (null));
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Transition state to hide card during switch
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Card cache
  const cardCache = useAppStore((s) => s.cardCache);
  const setCachedCards = useAppStore((s) => s.setCachedCards);
  const updateCachedCard = useAppStore((s) => s.updateCachedCard);
  const cachedData = cardCache[deckId];

  const { data: deck, loading: deckLoading, update: updateDeck } = useDocument(collections.decks, deckId);

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

  // Cache cards
  useEffect(() => {
    if (!cardsLoading && cardsFromFirestore.length > 0 && !cachedData) {
      setCachedCards(deckId, cardsFromFirestore);
    }
  }, [cardsFromFirestore, cardsLoading, deckId, cachedData, setCachedCards]);

  const allCards = cachedData?.cards || cardsFromFirestore;

  const updateCard = async (/** @type {string} */ cardId, /** @type {Object} */ updates) => {
    await updateCardInFirestore(cardId, updates);
    if (cachedData) {
      updateCachedCard(deckId, cardId, updates);
    }
  };

  const showLoading = !cachedData && cardsLoading;

  // Calculate card counts by type
  const cardCounts = useMemo(() => {
    const now = new Date();
    
    let newCards = 0;
    let reviewsDue = 0;
    const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    allCards.forEach((card) => {
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      const reviewDate = card.nextReviewAt 
        ? (card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt))
        : null;
      const isDue = !reviewDate || reviewDate <= now;
      
      if (box >= 1 && box <= 5) boxCounts[box]++;
      
      if (isNew) {
        newCards++;
      } else if (isDue) {
        reviewsDue++;
      }
    });
    
    const newLimit = typeof newCardsPerDay === "number" ? newCardsPerDay : 20;
    const newToday = Math.min(newCards, newLimit);
    
    return { 
      newCards,
      newToday,
      reviewsDue,
      boxCounts,
      dailyTotal: newToday + reviewsDue
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
      return cardCounts.dailyTotal;
    }
    return selectedBoxes.reduce((sum, box) => sum + cardCounts.boxCounts[box], 0);
  }, [selectedBoxes, cardCounts]);

  // Filter cards based on study options
  const dueCards = useMemo(() => {
    const now = new Date();
    const newLimit = typeof newCardsPerDay === "number" ? newCardsPerDay : 20;
    
    /** @type {typeof allCards} */
    const newCardsPool = [];
    /** @type {typeof allCards} */
    const reviewCardsPool = [];
    
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
        if (isNew) {
          newCardsPool.push(card);
        } else if (isDue) {
          reviewCardsPool.push(card);
        }
      } else {
        if (selectedBoxes.includes(box)) {
          if (isNew) {
            newCardsPool.push(card);
          } else {
            reviewCardsPool.push(card);
          }
        }
      }
    });
    
    // Sort by importOrder
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
    
    const limitedNew = newCardsPool.slice(0, newLimit);
    return [...reviewCardsPool, ...limitedNew];
  }, [allCards, reviewedCardIds, selectedBoxes, newCardsPerDay]);

  const currentCard = dueCards[currentIndex];
  const totalDue = sessionTotalCards ?? (dueCards.length + sessionStats.reviewed);
  const progress = totalDue > 0 ? (sessionStats.reviewed / totalDue) * 100 : 0;

  // Capture session size when study starts
  useEffect(() => {
    if (studyStarted && sessionTotalCards === null && dueCards.length > 0) {
      setSessionTotalCards(dueCards.length);
    }
  }, [studyStarted, sessionTotalCards, dueCards.length]);

  /** @param {'easy' | 'hard'} difficulty */
  const handleAnswer = useCallback(async (difficulty) => {
    if (!currentCard || isAnimating) return;
    
    if (sessionTotalCards !== null && sessionStats.reviewed >= sessionTotalCards) {
      return;
    }

    setIsAnimating(true);
    setIsTransitioning(true); // Hide card content during transition
    setShowBack(false);

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
      // Brief delay before showing next card
      setTimeout(() => {
        setIsTransitioning(false);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentCard, currentIndex, dueCards.length, isAnimating, updateCard, sessionTotalCards, sessionStats.reviewed]);

  const handleFlip = () => {
    if (!isAnimating) setShowBack(!showBack);
  };

  const handleEditClick = () => {
    if (!currentCard) return;
    setEditFront(currentCard.front || "");
    setEditBack(currentCard.back || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!currentCard || !editFront.trim() || !editBack.trim()) return;
    
    setSaving(true);
    try {
      await updateCard(currentCard.id, {
        front: editFront.trim(),
        back: editBack.trim(),
      });
      setEditModalOpen(false);
    } catch (err) {
      console.error("Error updating card:", err);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
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
          if (showBack && currentCard) {
            handleAnswer("easy");
          }
          break;
        case "ArrowLeft":
        case "2":
          if (showBack && currentCard) {
            handleAnswer("hard");
          }
          break;
        case "Escape":
          onBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBack, currentCard, isAnimating, handleAnswer, onBack]);

  // Update deck stats
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

  // Study options screen
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

          {/* Today's Session */}
          <Paper
            p="lg"
            radius="md"
            onClick={() => setSelectedBoxes([])}
            mb="lg"
            withBorder
            style={{
              borderColor: selectedBoxes.length === 0 ? "var(--mantine-color-blue-6)" : undefined,
              borderWidth: selectedBoxes.length === 0 ? 2 : 1,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="md">
                <ThemeIcon size={50} radius="xl" variant="filled">
                  <IconCards size={28} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="lg">Today's Session</Text>
                  <Text size="sm" c="dimmed">
                    {cardCounts.newToday} new + {cardCounts.reviewsDue} review
                  </Text>
                </Box>
              </Group>
              <Text size="2rem" fw={700} c="blue">{cardCounts.dailyTotal}</Text>
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
          <Text c="dimmed" size="xs" mb="sm">Or select specific boxes to study:</Text>
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
              {availableCards} cards from selected boxes
            </Text>
          )}

          <Group justify="center" gap="md">
            <Button variant="light" color="gray" onClick={onBack}>
              Cancel
            </Button>
            <Button
              variant="filled"
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

  // Session complete
  const sessionComplete = dueCards.length === 0 || 
    (sessionTotalCards !== null && sessionStats.reviewed >= sessionTotalCards);
  
  if (sessionComplete) {
    const totalReviewed = sessionStats.reviewed;
    const accuracy = totalReviewed > 0 ? Math.round((sessionStats.correct / totalReviewed) * 100) : 0;

    return (
      <Box style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" withBorder shadow="sm" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <Title order={2} mb="lg">Session Complete!</Title>

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
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={onComplete}>
              Back to Deck
            </Button>
            {totalReviewed > 0 && (
              <Button
                variant="filled"
                leftSection={<IconRefresh size={16} />}
                onClick={() => {
                  setReviewedCardIds(new Set());
                  setSessionStats({ correct: 0, incorrect: 0, reviewed: 0 });
                  setCurrentIndex(0);
                  setShowBack(false);
                  setSessionTotalCards(null);
                  setStudyStarted(false);
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

  // Study view
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
            <Badge variant="light" color="green">✓ {sessionStats.correct}</Badge>
            <Badge variant="light" color="red">✗ {sessionStats.incorrect}</Badge>
            <Text size="sm" c="dimmed">{sessionStats.reviewed} / {totalDue}</Text>
          </Group>
        </Group>
        <Progress value={progress} size="xs" radius={0} mt="sm" />
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
              borderColor: showBack ? "var(--mantine-color-blue-6)" : undefined,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              transform: isAnimating ? "scale(0.98)" : "scale(1)",
              opacity: isTransitioning ? 0 : 1,
            }}
          >
            <Group justify="space-between" w="100%" mb="md">
              <Badge variant="light" color={showBack ? "blue" : "gray"} size="sm">
                {showBack ? "Back" : "Front"} • Box {currentCard?.box || 1}
              </Badge>
              <ActionIcon 
                variant="subtle" 
                color="gray" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick();
                }}
                title="Edit card"
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Group>

            <Text
              size="xl"
              fw={500}
              ta="center"
              style={{
                maxHeight: "50vh",
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {showBack ? currentCard?.back : currentCard?.front}
            </Text>

            <Group gap="xs" mt="xl">
              <IconRotate size={16} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">Click or press Space to flip</Text>
            </Group>
          </Paper>

          {showBack && (
            <Group justify="center" gap="md" mt="xl" wrap="nowrap">
              <Button 
                size="lg" 
                variant="light" 
                color="red" 
                leftSection={<IconX size={20} />} 
                onClick={() => handleAnswer("hard")} 
                disabled={isAnimating} 
                style={{ minWidth: 120, flex: 1, maxWidth: 160 }}
              >
                Hard
              </Button>
              <Button 
                size="lg" 
                variant="filled" 
                color="green" 
                leftSection={<IconCheck size={20} />} 
                onClick={() => handleAnswer("easy")} 
                disabled={isAnimating} 
                style={{ minWidth: 120, flex: 1, maxWidth: 160 }}
              >
                Easy
              </Button>
            </Group>
          )}

          <Text size="xs" c="dimmed" ta="center" mt="xl">
            Keyboard: Space = Flip • ← = Hard • → = Easy • Esc = Exit
          </Text>
        </Box>
      </Box>

      {/* Edit Card Modal */}
      <Modal 
        opened={editModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        title="Edit Card"
        size="md"
      >
        <Stack gap="md">
          <Textarea
            label="Front"
            placeholder="Question or term"
            value={editFront}
            onChange={(e) => setEditFront(e.target.value)}
            minRows={3}
            required
          />
          <Textarea
            label="Back"
            placeholder="Answer or definition"
            value={editBack}
            onChange={(e) => setEditBack(e.target.value)}
            minRows={3}
            required
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              loading={saving} 
              disabled={!editFront.trim() || !editBack.trim()}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
