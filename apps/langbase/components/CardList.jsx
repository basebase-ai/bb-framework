/**
 * CardList - List of cards in a deck with CRUD operations
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  Textarea,
  Modal,
  ActionIcon,
  Badge,
  Box,
  Card,
  SimpleGrid,
  Tooltip,
  Loader,
  TextInput,
  TypographyStylesProvider,
  CloseButton,
} from "@mantine/core";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });
import {
  IconPlus,
  IconArrowLeft,
  IconPlayerPlay,
  IconEdit,
  IconTrash,
  IconSearch,
  IconBox,
  IconMessages,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, LEITNER_INTERVALS } from "../schema.js";
import { useUIStore } from "../stores/uiStore.js";

/**
 * @param {number} box
 * @returns {string}
 */
function getBoxColor(box) {
  const colors = { 1: "red", 2: "orange", 3: "yellow", 4: "lime", 5: "green" };
  return colors[box] || "gray";
}

/**
 * @param {{ deckId: string, onBack: () => void, onStudy: (deckId: string) => void, onSentencePractice?: (deckId: string) => void }} props
 */
export function CardList({ deckId, onBack, onStudy, onSentencePractice }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(/** @type {string | null} */ (null));
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(/** @type {{ id: string, front: string, back: string } | null} */ (null));

  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [saving, setSaving] = useState(false);

  // Card cache for faster subsequent loads
  const cardCache = useUIStore((s) => s.cardCache);
  const setCachedCards = useUIStore((s) => s.setCachedCards);
  const updateCachedCard = useUIStore((s) => s.updateCachedCard);
  const removeCachedCard = useUIStore((s) => s.removeCachedCard);
  const addCachedCard = useUIStore((s) => s.addCachedCard);
  const cachedData = cardCache[deckId];

  const { data: deck, loading: deckLoading, update: updateDeck } = useDocument(collections.decks, deckId);

  // Memoize query options (no orderBy to avoid composite index)
  const cardQueryOptions = useMemo(() => ({
    where: user?.uid ? [
      ["deckId", "==", deckId],
      ["owner", "==", user.uid],
    ] : [],
  }), [deckId, user?.uid]);

  const {
    data: cardsRaw,
    loading: cardsLoading,
    add: addCard,
    update: updateCard,
    remove: removeCard,
  } = useCollection(collections.cards, cardQueryOptions);

  // Cache cards when they load from Firestore (only if not already cached)
  useEffect(() => {
    if (!cardsLoading && cardsRaw.length > 0 && !cachedData) {
      setCachedCards(deckId, cardsRaw);
    }
  }, [cardsRaw, cardsLoading, deckId, cachedData, setCachedCards]);

  // Use cached cards for instant display, fall back to live data
  const cardsSource = cachedData?.cards || cardsRaw;

  // Sort client-side: imported cards by importOrder (asc), manual cards by createdAt (desc)
  const cards = useMemo(() => {
    return [...cardsSource].sort((a, b) => {
      // If both have importOrder, sort by it (ascending = file order)
      if (a.importOrder !== undefined && b.importOrder !== undefined) {
        return a.importOrder - b.importOrder;
      }
      // Cards with importOrder come before cards without
      if (a.importOrder !== undefined) return -1;
      if (b.importOrder !== undefined) return 1;
      // For manually created cards, sort by createdAt descending (newest first)
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [cardsSource]);

  // Wrapper functions to update both Firestore and cache
  const add = async (/** @type {Object} */ cardData) => {
    const newCard = await addCard(cardData);
    if (newCard && cachedData) {
      addCachedCard(deckId, newCard);
    }
    return newCard;
  };

  const update = async (/** @type {string} */ cardId, /** @type {Object} */ updates) => {
    await updateCard(cardId, updates);
    if (cachedData) {
      updateCachedCard(deckId, cardId, updates);
    }
  };

  const remove = async (/** @type {string} */ cardId) => {
    await removeCard(cardId);
    if (cachedData) {
      removeCachedCard(deckId, cardId);
    }
  };

  // Show loading only if we have no cached data AND still loading from Firestore
  const showLoading = !cachedData && cardsLoading;

  // Update deck stats when cards change
  useEffect(() => {
    if (!deckLoading && deck && cards) {
      const cardCount = cards.length;
      const masteredCount = cards.filter((c) => c.box === 5).length;
      
      if (deck.cardCount !== cardCount || deck.masteredCount !== masteredCount) {
        updateDeck({ cardCount, masteredCount });
      }
    }
  }, [cards, deck, deckLoading, updateDeck]);

  const filteredCards = cards.filter((card) => {
    // Filter by search query
    if (searchQuery && !card.front?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Filter by selected category
    if (selectedCategory !== null) {
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;
      
      if (selectedCategory === "new" && !isNew) return false;
      if (selectedCategory === "struggling" && (isNew || box !== 1)) return false;
      if (selectedCategory === "learning" && box !== 2) return false;
      if (selectedCategory === "reviewing" && box !== 3) return false;
      if (selectedCategory === "familiar" && box !== 4) return false;
      if (selectedCategory === "mastered" && box !== 5) return false;
    }
    return true;
  });

  const stats = useMemo(() => {
    let newCards = 0;        // Never reviewed
    let struggling = 0;      // Box 1, but has been reviewed (demoted)
    let learning = 0;        // Box 2
    let reviewing = 0;       // Box 3
    let familiar = 0;        // Box 4
    let mastered = 0;        // Box 5
    let dueForReview = 0;
    let practiceEligible = 0;

    cards.forEach((card) => {
      const isNew = !card.lastReviewedAt;
      const box = card.box || 1;

      if (isNew) {
        newCards++;
      } else if (box === 1) {
        struggling++;
      } else if (box === 2) {
        learning++;
      } else if (box === 3) {
        reviewing++;
      } else if (box === 4) {
        familiar++;
      } else if (box === 5) {
        mastered++;
      }

      // Due for review check
      if (!card.nextReviewAt) {
        dueForReview++;
      } else {
        const reviewDate = card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt);
        if (reviewDate <= new Date()) dueForReview++;
      }

      // Practice eligible (Box 2+ or reviewed with more correct than incorrect)
      if (box >= 2) {
        practiceEligible++;
      } else if (card.lastReviewedAt && (card.correctCount || 0) > (card.incorrectCount || 0)) {
        practiceEligible++;
      }
    });

    return {
      total: cards.length,
      new: newCards,
      struggling,
      learning,
      reviewing,
      familiar,
      mastered,
      dueForReview,
      practiceEligible,
    };
  }, [cards]);

  const handleCreateCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !user) return;

    setSaving(true);
    try {
      await add({
        deckId,
        front: cardFront.trim(),
        back: cardBack.trim(),
        owner: user.uid,
        box: 1,
        nextReviewAt: new Date(),
        lastReviewedAt: null,
        correctCount: 0,
        incorrectCount: 0,
      });
      setCardFront("");
      setCardBack("");
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Error creating card:", err);
    } finally {
      setSaving(false);
    }
  };

  /** @param {{ id: string, front?: string, back?: string }} card */
  const handleEditClick = (card) => {
    setEditingCard({ id: card.id, front: card.front || "", back: card.back || "" });
    setCardFront(card.front || "");
    setCardBack(card.back || "");
    setEditModalOpen(true);
  };

  const handleUpdateCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !editingCard) return;

    setSaving(true);
    try {
      await update(editingCard.id, { front: cardFront.trim(), back: cardBack.trim() });
      setEditingCard(null);
      setCardFront("");
      setCardBack("");
      setEditModalOpen(false);
    } catch (err) {
      console.error("Error updating card:", err);
    } finally {
      setSaving(false);
    }
  };

  /** @param {string} cardId */
  const handleDeleteCard = async (cardId) => {
    if (!confirm("Are you sure you want to delete this card?")) return;
    try {
      await remove(cardId);
    } catch (err) {
      console.error("Error deleting card:", err);
    }
  };

  const handleCloseCreateModal = () => {
    setCardFront("");
    setCardBack("");
    setCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditingCard(null);
    setCardFront("");
    setCardBack("");
    setEditModalOpen(false);
  };

  if (deckLoading || showLoading) {
    return (
      <Box py="xl" ta="center">
        <Loader color="pink" />
        <Text c="dimmed" mt="md">Loading cards...</Text>
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box py="xl" ta="center">
        <Text c="dimmed">Deck not found</Text>
        <Button variant="light" color="pink" mt="md" onClick={onBack}>Back to Decks</Button>
      </Box>
    );
  }

  return (
    <Stack gap="lg" py="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="sm" mb="xs">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={2}>{deck.name}</Title>
          </Group>
          <Text size="sm" c="dimmed">
            {stats.total} card{stats.total !== 1 ? "s" : ""} • {stats.dueForReview} due for review
          </Text>
        </div>
        <Group gap="sm">
          <Button
            variant="light"
            color="pink"
            leftSection={<IconPlayerPlay size={16} />}
            onClick={() => onStudy(deckId)}
            disabled={stats.total === 0}
          >
            Study
          </Button>
          {onSentencePractice && (
            <Button
              variant="light"
              color="violet"
              leftSection={<IconMessages size={16} />}
              onClick={() => onSentencePractice(deckId)}
              disabled={stats.practiceEligible < 3}
              title={stats.practiceEligible < 3 ? "Need at least 3 words in Box 2+ to practice" : ""}
            >
              Study with Sentences
            </Button>
          )}
          <Button
            variant="filled"
            color="pink"
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            Add Card
          </Button>
        </Group>
      </Group>

      <Paper p="md" withBorder shadow="xs">
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>Card Distribution</Text>
          {selectedCategory !== null && (
            <Button size="xs" variant="subtle" color="gray" onClick={() => setSelectedCategory(null)}>
              Clear filter
            </Button>
          )}
        </Group>
        <Group gap="md" wrap="wrap">
          {/** @type {const} */ ([
            { key: "new", label: "New", color: "red", count: stats.new, tooltip: "Never reviewed" },
            { key: "struggling", label: "Struggling", color: "orange", count: stats.struggling, tooltip: "Demoted to Box 1 after marking hard" },
            { key: "learning", label: "Learning", color: "yellow", count: stats.learning, tooltip: `Box 2: Review every ${LEITNER_INTERVALS[2]} days` },
            { key: "reviewing", label: "Reviewing", color: "lime", count: stats.reviewing, tooltip: `Box 3: Review every ${LEITNER_INTERVALS[3]} days` },
            { key: "familiar", label: "Familiar", color: "teal", count: stats.familiar, tooltip: `Box 4: Review every ${LEITNER_INTERVALS[4]} days` },
            { key: "mastered", label: "Mastered", color: "green", count: stats.mastered, tooltip: `Box 5: Review every ${LEITNER_INTERVALS[5]} days` },
          ]).map(({ key, label, color, count, tooltip }) => {
            const isSelected = selectedCategory === key;
            return (
              <Tooltip key={key} label={`${tooltip}. Click to filter.`}>
                <Badge
                  size="lg"
                  variant={isSelected ? "filled" : "light"}
                  color={color}
                  leftSection={<IconBox size={14} />}
                  style={{
                    cursor: count > 0 ? "pointer" : "default",
                    opacity: count === 0 ? 0.5 : 1,
                    transform: isSelected ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => count > 0 && setSelectedCategory(isSelected ? null : key)}
                >
                  {label} ({count})
                </Badge>
              </Tooltip>
            );
          })}
        </Group>
      </Paper>

      <TextInput
        placeholder="Search cards..."
        leftSection={<IconSearch size={16} />}
        rightSection={searchQuery && <CloseButton size="sm" onClick={() => setSearchQuery("")} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {filteredCards.length === 0 ? (
        <Paper p="xl" withBorder shadow="xs">
          <Stack align="center" gap="md">
            <Text size="lg" c="dimmed" ta="center">
              {searchQuery
                ? "No cards match your search"
                : selectedCategory !== null
                  ? `No ${selectedCategory} cards`
                  : "No cards yet. Add your first card!"}
            </Text>
            {!searchQuery && selectedCategory === null && (
              <Button variant="light" color="pink" leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
                Add Card
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              padding="lg"
              radius="md"
              withBorder
              shadow="xs"
              style={{
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--mantine-color-pink-6)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Group justify="space-between" mb="xs">
                <Badge variant="light" color={getBoxColor(card.box || 1)} size="sm">Box {card.box || 1}</Badge>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="gray" onClick={() => handleEditClick(card)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteCard(card.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>

              <Box mb="sm">
                <Text size="xs" c="dimmed" mb={4}>Front</Text>
                <TypographyStylesProvider fz="sm" style={{ maxHeight: 80, overflow: "hidden" }}>
                  <div dangerouslySetInnerHTML={{ __html: marked(card.front || "") }} />
                </TypographyStylesProvider>
              </Box>

              <Box>
                <Text size="xs" c="dimmed" mb={4}>Back</Text>
                <TypographyStylesProvider fz="sm" c="gray.5" style={{ maxHeight: 80, overflow: "hidden" }}>
                  <div dangerouslySetInnerHTML={{ __html: marked(card.back || "") }} />
                </TypographyStylesProvider>
              </Box>

              {(card.correctCount > 0 || card.incorrectCount > 0) && (
                <Group gap="xs" mt="md">
                  <Badge variant="light" color="green" size="xs">✓ {card.correctCount || 0}</Badge>
                  <Badge variant="light" color="red" size="xs">✗ {card.incorrectCount || 0}</Badge>
                </Group>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={createModalOpen} onClose={handleCloseCreateModal} title="Add New Card" size="md">
        <Stack gap="md">
          <Textarea label="Front" placeholder="Question or term" value={cardFront} onChange={(e) => setCardFront(e.target.value)} minRows={3} required />
          <Textarea label="Back" placeholder="Answer or definition" value={cardBack} onChange={(e) => setCardBack(e.target.value)} minRows={3} required />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleCloseCreateModal}>Cancel</Button>
            <Button onClick={handleCreateCard} loading={saving} disabled={!cardFront.trim() || !cardBack.trim()}>Add Card</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editModalOpen} onClose={handleCloseEditModal} title="Edit Card" size="md">
        <Stack gap="md">
          <Textarea label="Front" placeholder="Question or term" value={cardFront} onChange={(e) => setCardFront(e.target.value)} minRows={3} required />
          <Textarea label="Back" placeholder="Answer or definition" value={cardBack} onChange={(e) => setCardBack(e.target.value)} minRows={3} required />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleCloseEditModal}>Cancel</Button>
            <Button onClick={handleUpdateCard} loading={saving} disabled={!cardFront.trim() || !cardBack.trim()}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

