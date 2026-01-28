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
  CloseButton,
  Loader,
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
  IconCheck,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
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
  const [deleting, setDeleting] = useState(/** @type {string | null} */ (null));

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

  // Sort decks by createdAt descending
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
    if (!confirm("Are you sure you want to delete this deck? All cards will be permanently deleted.")) {
      return;
    }
    
    setDeleting(deckId);
    try {
      // Delete all cards first
      const cardsQuery = query(
        collection(db, collections.cards),
        where("deckId", "==", deckId)
      );
      const cardsSnapshot = await getDocs(cardsQuery);
      
      const BATCH_SIZE = 500;
      const cardDocs = cardsSnapshot.docs;
      
      for (let i = 0; i < cardDocs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchDocs = cardDocs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach((cardDoc) => {
          batch.delete(doc(db, collections.cards, cardDoc.id));
        });
        
        await batch.commit();
      }
      
      // Then delete the deck
      await remove(deckId);
      
      notifications.show({
        title: "Deck deleted",
        message: `Deck and ${cardsSnapshot.size} cards have been deleted.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Error deleting deck:", err);
      notifications.show({
        title: "Error",
        message: "Failed to delete deck. Please try again.",
        color: "red",
      });
    } finally {
      setDeleting(null);
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
        <Loader color="blue" />
        <Text c="dimmed" mt="md">Loading decks...</Text>
      </Box>
    );
  }

  return (
    <Stack gap="md">
      {/* Header with search and actions */}
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search decks..."
          leftSection={<IconSearch size={16} />}
          rightSection={searchQuery && <CloseButton size="sm" onClick={() => setSearchQuery("")} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <Group gap="sm">
          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={() => setImportModalOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="filled"
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            New Deck
          </Button>
        </Group>
      </Group>

      {/* Empty state */}
      {decks.length === 0 && !searchQuery && (
        <Paper p="xl" withBorder shadow="xs">
          <Stack align="center" gap="md">
            <IconCards size={48} color="var(--mantine-color-dimmed)" />
            <Text size="lg" c="dimmed" ta="center">
              No decks yet. Create your first deck or import from Anki!
            </Text>
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconUpload size={16} />}
                onClick={() => setImportModalOpen(true)}
              >
                Import Anki Deck
              </Button>
              <Button
                variant="filled"
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create Deck
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Deck cards grid */}
      {filteredDecks.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredDecks.map((deck) => {
            const cardCount = deck.cardCount || 0;
            const masteredCount = deck.masteredCount || 0;
            const progress = cardCount > 0 ? (masteredCount / cardCount) * 100 : 0;
            const isDeleting = deleting === deck.id;

            return (
              <Card
                key={deck.id}
                padding="lg"
                radius="md"
                withBorder
                shadow="xs"
                style={{
                  cursor: isDeleting ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: isDeleting ? 0.5 : 1,
                }}
                onClick={!isDeleting ? () => onViewDeck(deck.id) : undefined}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--mantine-color-blue-6)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={600} size="lg" lineClamp={1}>
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
                        leftSection={isDeleting ? <Loader size={16} /> : <IconTrash size={16} />}
                        color="red"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
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
                  <Badge variant="light" size="sm">
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
                      size="sm"
                      radius="xl"
                    />
                    <Text size="xs" c="dimmed" ta="right" mt={4}>
                      {Math.round(progress)}% mastered
                    </Text>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="light"
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

      {/* No results */}
      {searchQuery && filteredDecks.length === 0 && (
        <Paper p="xl" withBorder shadow="xs">
          <Stack align="center" gap="md">
            <IconSearch size={48} color="var(--mantine-color-dimmed)" />
            <Text size="lg" c="dimmed" ta="center">
              No decks match "{searchQuery}"
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Create Modal */}
      <Modal opened={createModalOpen} onClose={handleCloseCreateModal} title="Create New Deck" size="md">
        <Stack gap="md">
          <TextInput
            label="Deck Name"
            placeholder="e.g., Biology Chapter 1"
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

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={handleCloseEditModal} title="Edit Deck" size="md">
        <Stack gap="md">
          <TextInput
            label="Deck Name"
            placeholder="e.g., Biology Chapter 1"
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

      {/* Import Modal */}
      <ImportModal opened={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </Stack>
  );
}
