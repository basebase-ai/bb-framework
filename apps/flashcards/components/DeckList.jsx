/**
 * DeckList - List of flashcard decks with CRUD operations
 */

import React, { useState, useMemo } from "react";
import {
  Stack,
  Group,
  Button,
  Title,
  Text,
  Paper,
  TextInput,
  Textarea,
  Modal,
  ActionIcon,
  Badge,
  Progress,
  Menu,
  SimpleGrid,
  Box,
  Card,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconUpload,
  IconCards,
  IconPlayerPlay,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconChartBar,
} from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";
import { ImportModal } from "./ImportModal.jsx";

/**
 * @param {{ onViewDeck: (deckId: string) => void, onStudyDeck: (deckId: string) => void }} props
 */
export function DeckList({ onViewDeck, onStudyDeck }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState(/** @type {{ id: string, name: string, description: string } | null} */ (null));

  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Memoize query options to prevent re-renders (no orderBy to avoid composite index)
  const queryOptions = useMemo(() => ({
    where: user?.uid ? [["owner", "==", user.uid]] : [],
  }), [user?.uid]);

  const {
    data: decksRaw,
    loading,
    add,
    update,
    remove,
  } = useCollection(collections.decks, queryOptions);

  // Sort client-side by createdAt descending
  const decks = useMemo(() => {
    return [...decksRaw].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [decksRaw]);

  const filteredDecks = decks.filter(
    (deck) =>
      deck.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateDeck = async () => {
    if (!deckName.trim() || !user) return;

    setSaving(true);
    try {
      await add({
        name: deckName.trim(),
        description: deckDescription.trim(),
        owner: user.uid,
        cardCount: 0,
        masteredCount: 0,
        isPublic: false,
        tags: [],
      });
      setDeckName("");
      setDeckDescription("");
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Error creating deck:", err);
    } finally {
      setSaving(false);
    }
  };

  /** @param {{ id: string, name?: string, description?: string }} deck */
  const handleEditClick = (deck) => {
    setEditingDeck({
      id: deck.id,
      name: deck.name || "",
      description: deck.description || "",
    });
    setDeckName(deck.name || "");
    setDeckDescription(deck.description || "");
    setEditModalOpen(true);
  };

  const handleUpdateDeck = async () => {
    if (!deckName.trim() || !editingDeck) return;

    setSaving(true);
    try {
      await update(editingDeck.id, {
        name: deckName.trim(),
        description: deckDescription.trim(),
      });
      setEditingDeck(null);
      setDeckName("");
      setDeckDescription("");
      setEditModalOpen(false);
    } catch (err) {
      console.error("Error updating deck:", err);
    } finally {
      setSaving(false);
    }
  };

  /** @param {string} deckId */
  const handleDeleteDeck = async (deckId) => {
    if (!confirm("Are you sure you want to delete this deck? All cards will be lost.")) {
      return;
    }
    try {
      await remove(deckId);
    } catch (err) {
      console.error("Error deleting deck:", err);
    }
  };

  const handleCloseCreateModal = () => {
    setDeckName("");
    setDeckDescription("");
    setCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditingDeck(null);
    setDeckName("");
    setDeckDescription("");
    setEditModalOpen(false);
  };

  if (loading) {
    return (
      <Box py="xl" ta="center">
        <Text c="dimmed">Loading decks...</Text>
      </Box>
    );
  }

  return (
    <Stack gap="lg" py="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2} c="white">My Decks</Title>
          <Text size="sm" c="dimmed">
            {decks.length} deck{decks.length !== 1 ? "s" : ""} • Create, study, and track your progress
          </Text>
        </div>
        <Group gap="sm">
          <Button
            variant="light"
            color="pink"
            leftSection={<IconUpload size={16} />}
            onClick={() => setImportModalOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="gradient"
            gradient={{ from: "#e94560", to: "#ff6b6b" }}
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            New Deck
          </Button>
        </Group>
      </Group>

      <TextInput
        placeholder="Search decks..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        styles={{
          input: {
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      />

      {filteredDecks.length === 0 ? (
        <Paper
          p="xl"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
          withBorder
        >
          <Stack align="center" gap="md">
            <IconCards size={48} color="#666" />
            <Text size="lg" c="dimmed" ta="center">
              {searchQuery
                ? "No decks match your search"
                : "No decks yet. Create your first deck to get started!"}
            </Text>
            {!searchQuery && (
              <Button
                variant="light"
                color="pink"
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create Deck
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredDecks.map((deck) => {
            const cardCount = deck.cardCount || 0;
            const masteredCount = deck.masteredCount || 0;
            const progress = cardCount > 0 ? (masteredCount / cardCount) * 100 : 0;

            return (
              <Card
                key={deck.id}
                padding="lg"
                radius="md"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(233, 69, 96, 0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => onViewDeck(deck.id)}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={600} size="lg" c="white" lineClamp={1}>
                    {deck.name}
                  </Text>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(deck);
                        }}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={16} />}
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                {deck.description && (
                  <Text size="sm" c="dimmed" lineClamp={2} mb="md">
                    {deck.description}
                  </Text>
                )}

                <Group gap="xs" mb="md">
                  <Badge variant="light" color="pink" size="sm">
                    <IconCards size={12} style={{ marginRight: 4 }} />
                    {cardCount} card{cardCount !== 1 ? "s" : ""}
                  </Badge>
                  {masteredCount > 0 && (
                    <Badge variant="light" color="green" size="sm">
                      <IconChartBar size={12} style={{ marginRight: 4 }} />
                      {masteredCount} mastered
                    </Badge>
                  )}
                </Group>

                {cardCount > 0 && (
                  <Box mb="md">
                    <Progress
                      value={progress}
                      color="pink"
                      size="sm"
                      radius="xl"
                      style={{ background: "rgba(255, 255, 255, 0.1)" }}
                    />
                    <Text size="xs" c="dimmed" ta="right" mt={4}>
                      {Math.round(progress)}% mastered
                    </Text>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="light"
                  color="pink"
                  leftSection={<IconPlayerPlay size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStudyDeck(deck.id);
                  }}
                  disabled={cardCount === 0}
                >
                  Study
                </Button>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal opened={createModalOpen} onClose={handleCloseCreateModal} title="Create New Deck" size="md">
        <Stack gap="md">
          <TextInput
            label="Deck Name"
            placeholder="e.g., Spanish Vocabulary"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="What will you learn?"
            value={deckDescription}
            onChange={(e) => setDeckDescription(e.target.value)}
            minRows={3}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeck} loading={saving} disabled={!deckName.trim()}>
              Create Deck
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editModalOpen} onClose={handleCloseEditModal} title="Edit Deck" size="md">
        <Stack gap="md">
          <TextInput
            label="Deck Name"
            placeholder="e.g., Spanish Vocabulary"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="What will you learn?"
            value={deckDescription}
            onChange={(e) => setDeckDescription(e.target.value)}
            minRows={3}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleCloseEditModal}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDeck} loading={saving} disabled={!deckName.trim()}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ImportModal opened={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </Stack>
  );
}

