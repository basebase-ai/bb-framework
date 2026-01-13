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
  IconMessageLanguage,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, LEITNER_INTERVALS } from "../schema.js";

/**
 * @param {number} box
 * @returns {string}
 */
function getBoxColor(box) {
  const colors = { 1: "red", 2: "orange", 3: "yellow", 4: "lime", 5: "green" };
  return colors[box] || "gray";
}

/**
 * @param {{ deckId: string, onBack: () => void, onStudy: (deckId: string) => void, onPractice?: (deckId: string) => void }} props
 */
export function CardList({ deckId, onBack, onStudy, onPractice }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(/** @type {{ id: string, front: string, back: string } | null} */ (null));

  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [saving, setSaving] = useState(false);

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
    add,
    update,
    remove,
  } = useCollection(collections.cards, cardQueryOptions);

  // Sort client-side: imported cards by importOrder (asc), manual cards by createdAt (desc)
  const cards = useMemo(() => {
    return [...cardsRaw].sort((a, b) => {
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
  }, [cardsRaw]);

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

  const filteredCards = cards.filter(
    (card) => card.front?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: cards.length,
    box1: cards.filter((c) => c.box === 1).length,
    box2: cards.filter((c) => c.box === 2).length,
    box3: cards.filter((c) => c.box === 3).length,
    box4: cards.filter((c) => c.box === 4).length,
    box5: cards.filter((c) => c.box === 5).length,
    dueForReview: cards.filter((c) => {
      if (!c.nextReviewAt) return true;
      const reviewDate = c.nextReviewAt.toDate ? c.nextReviewAt.toDate() : new Date(c.nextReviewAt);
      return reviewDate <= new Date();
    }).length,
    // Cards available for sentence practice (Box 2+ or reviewed with more correct than incorrect)
    mastered: cards.filter((c) => {
      const box = c.box || 1;
      if (box >= 2) return true;
      if (c.lastReviewedAt && (c.correctCount || 0) > (c.incorrectCount || 0)) return true;
      return false;
    }).length,
  };

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

  if (deckLoading || cardsLoading) {
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
            Study ({stats.dueForReview})
          </Button>
          {onPractice && (
            <Button
              variant="light"
              color="violet"
              leftSection={<IconMessageLanguage size={16} />}
              onClick={() => onPractice(deckId)}
              disabled={stats.mastered < 3}
            >
              Practice
            </Button>
          )}
          <Button
            variant="gradient"
            gradient={{ from: "#e94560", to: "#ff6b6b" }}
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            Add Card
          </Button>
        </Group>
      </Group>

      <Paper p="md" withBorder shadow="xs">
        <Text size="sm" fw={500} mb="sm">Leitner Box Distribution</Text>
        <Group gap="md">
          {[1, 2, 3, 4, 5].map((box) => {
            const count = stats[`box${box}`];
            const interval = LEITNER_INTERVALS[box];
            return (
              <Tooltip key={box} label={`Box ${box}: Review every ${interval} day${interval !== 1 ? "s" : ""}`}>
                <Badge size="lg" variant="light" color={getBoxColor(box)} leftSection={<IconBox size={14} />}>
                  {count}
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
              {searchQuery ? "No cards match your search" : "No cards yet. Add your first card!"}
            </Text>
            {!searchQuery && (
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

