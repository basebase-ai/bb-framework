/**
 * VocabularyPanel - Shows cards from linked deck, or prompts to select/create a deck
 */
import React, { useState, useMemo } from "react";
import {
  Box,
  Stack,
  Text,
  ScrollArea,
  TextInput,
  ActionIcon,
  Group,
  Badge,
  Tooltip,
  Paper,
  Button,
  Modal,
  Select,
  useMantineColorScheme,
} from "@mantine/core";
import { IconSearch, IconVolume, IconX, IconCards, IconPlus, IconLink } from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { useSpeech } from "../../hooks/useSpeech.js";
import { useUIStore } from "../../stores/uiStore.js";
import { collections } from "../../schema.js";

/**
 * @param {{ 
 *   linkedDeckId: string | null, 
 *   onLinkDeck: (deckId: string) => void,
 *   onClose?: () => void,
 *   context?: "reading" | "conversation"
 * }} props
 */
export function VocabularyPanel({ linkedDeckId, onLinkDeck, onClose, context = "reading" }) {
  const { user } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const [search, setSearch] = useState("");
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedExistingDeck, setSelectedExistingDeck] = useState(/** @type {string | null} */ (null));
  const { speak, supported: speechSupported } = useSpeech();
  const sourceLanguage = useUIStore((s) => s.sourceLanguage);

  // Fetch user's decks for selection
  const deckQueryOptions = useMemo(
    () => ({
      where: user?.uid ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );
  const { data: decks, add: addDeck } = useCollection(collections.decks, deckQueryOptions);

  // Fetch cards from the linked deck
  const cardQueryOptions = useMemo(
    () => ({
      where: linkedDeckId && user?.uid ? [
        ["deckId", "==", linkedDeckId],
        ["owner", "==", user.uid],
      ] : [],
    }),
    [linkedDeckId, user?.uid]
  );
  const { data: cards, loading: cardsLoading, remove: removeCard } = useCollection(
    collections.cards, 
    cardQueryOptions
  );

  // Get linked deck info
  const linkedDeck = decks?.find((d) => d.id === linkedDeckId);

  // Filter and sort cards
  const filteredCards = (cards || [])
    .filter((c) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        c.front.toLowerCase().includes(searchLower) ||
        c.back.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by most recently added (createdAt desc)
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

  /**
   * Play pronunciation
   * @param {string} word
   */
  const handleSpeak = (word) => {
    speak(word, sourceLanguage);
  };

  /**
   * Remove a card
   * @param {string} id
   * @param {string} word
   */
  const handleRemove = (id, word) => {
    if (confirm(`Remove "${word}" from deck?`)) {
      removeCard(id);
    }
  };

  /**
   * Handle deck selection/creation
   */
  const handleSelectDeck = async () => {
    if (newDeckName.trim()) {
      // Create new deck
      const deckId = await addDeck({
        name: newDeckName.trim(),
        description: "Vocabulary from reading",
        cardCount: 0,
        masteredCount: 0,
        isPublic: false,
      });
      onLinkDeck(deckId);
      setNewDeckName("");
    } else if (selectedExistingDeck) {
      // Use existing deck
      onLinkDeck(selectedExistingDeck);
    }
    setShowDeckModal(false);
  };

  // Deck selection options
  const deckOptions = (decks || []).map((d) => ({
    value: d.id,
    label: `${d.name} (${d.cardCount || 0} cards)`,
  }));

  // Show deck selection prompt if no deck is linked
  if (!linkedDeckId) {
    return (
      <Paper
        h="100%"
        p="sm"
        withBorder
        shadow="xs"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Group justify="space-between" mb="sm">
          <Text fw={600} size="sm">Vocabulary</Text>
          {onClose && (
            <ActionIcon variant="subtle" size="sm" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>

        <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <IconCards size={48} color="var(--mantine-color-pink-5)" style={{ opacity: 0.5, marginBottom: "1rem" }} />
          <Text size="sm" c="dimmed" ta="center" mb="md">
            Link a flashcard deck to save words you look up{context === "reading" ? " while reading" : " during conversations"}.
          </Text>
          <Button
            variant="light"
            color="pink"
            leftSection={<IconLink size={16} />}
            onClick={() => setShowDeckModal(true)}
          >
            Select a Deck
          </Button>
        </Box>

        {/* Deck selection modal */}
        <Modal
          opened={showDeckModal}
          onClose={() => setShowDeckModal(false)}
          title="Link Vocabulary Deck"
          centered
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Choose where to save words you look up. They'll become flashcards you can study later.
            </Text>

            {deckOptions.length > 0 && (
              <>
                <Text size="sm" fw={500}>Use existing deck:</Text>
                <Select
                  placeholder="Select a deck..."
                  data={deckOptions}
                  value={selectedExistingDeck}
                  onChange={setSelectedExistingDeck}
                  clearable
                />
              </>
            )}

            <Text size="sm" fw={500} mt="sm">Or create a new deck:</Text>
            <TextInput
              placeholder="New deck name..."
              value={newDeckName}
              onChange={(e) => {
                setNewDeckName(e.target.value);
                if (e.target.value) setSelectedExistingDeck(null);
              }}
              leftSection={<IconPlus size={14} />}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setShowDeckModal(false)}>
                Cancel
              </Button>
              <Button
                color="pink"
                onClick={handleSelectDeck}
                disabled={!newDeckName.trim() && !selectedExistingDeck}
              >
                Link Deck
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Paper>
    );
  }

  // Show linked deck's cards
  return (
    <Paper
      h="100%"
      p="sm"
      withBorder
      shadow="xs"
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Tooltip label={linkedDeck?.name || "Linked deck"}>
            <Text fw={600} size="sm" truncate style={{ maxWidth: 120 }}>
              {linkedDeck?.name || "Vocabulary"}
            </Text>
          </Tooltip>
          <Badge size="xs" variant="light" color="pink">
            {filteredCards.length}
          </Badge>
        </Group>
        <Group gap={4}>
          <Tooltip label="Change deck">
            <ActionIcon variant="subtle" size="sm" onClick={() => setShowDeckModal(true)}>
              <IconLink size={14} />
            </ActionIcon>
          </Tooltip>
          {onClose && (
            <ActionIcon variant="subtle" size="sm" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      {/* Search */}
      <TextInput
        placeholder="Filter words..."
        size="xs"
        mb="sm"
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Card list */}
      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <Stack gap={4}>
          {cardsLoading && !cards ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              Loading...
            </Text>
          ) : filteredCards.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              {search ? "No matches" : context === "reading" ? "Click on words while reading to add them here" : "Click on words in messages to add them here"}
            </Text>
          ) : (
            filteredCards.map((card) => (
              <Box
                key={card.id}
                p="xs"
                style={{
                  borderRadius: "4px",
                  background: isDark ? "var(--mantine-color-dark-6)" : "var(--mantine-color-gray-0)",
                  cursor: "default",
                }}
              >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={500} c="pink.4" truncate>
                      {card.front}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {card.back}
                    </Text>
                  </Box>
                  <Group gap={2} wrap="nowrap">
                    {(card.box || 1) > 1 && (
                      <Tooltip label={`Box ${card.box}/5`}>
                        <Badge size="xs" variant="dot" color="green">
                          {card.box}
                        </Badge>
                      </Tooltip>
                    )}
                    {speechSupported && (
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="gray"
                        onClick={() => handleSpeak(card.front)}
                      >
                        <IconVolume size={12} />
                      </ActionIcon>
                    )}
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      color="red"
                      onClick={() => handleRemove(card.id, card.front)}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
            ))
          )}
        </Stack>
      </ScrollArea>

      {/* Stats */}
      {cards && cards.length > 0 && (
        <Box mt="sm" pt="sm" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
          <Text size="xs" c="dimmed" ta="center">
            {cards.filter((c) => (c.box || 1) >= 5).length} mastered •{" "}
            {cards.filter((c) => (c.box || 1) < 5).length} learning
          </Text>
        </Box>
      )}

      {/* Deck selection modal */}
      <Modal
        opened={showDeckModal}
        onClose={() => setShowDeckModal(false)}
        title="Change Vocabulary Deck"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Choose a different deck for new vocabulary words.
          </Text>

          {deckOptions.length > 0 && (
            <>
              <Text size="sm" fw={500}>Use existing deck:</Text>
              <Select
                placeholder="Select a deck..."
                data={deckOptions}
                value={selectedExistingDeck}
                onChange={setSelectedExistingDeck}
                clearable
              />
            </>
          )}

          <Text size="sm" fw={500} mt="sm">Or create a new deck:</Text>
          <TextInput
            placeholder="New deck name..."
            value={newDeckName}
            onChange={(e) => {
              setNewDeckName(e.target.value);
              if (e.target.value) setSelectedExistingDeck(null);
            }}
            leftSection={<IconPlus size={14} />}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setShowDeckModal(false)}>
              Cancel
            </Button>
            <Button
              color="pink"
              onClick={handleSelectDeck}
              disabled={!newDeckName.trim() && !selectedExistingDeck}
            >
              Link Deck
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
