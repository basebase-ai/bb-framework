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
  Switch,
  Select,
  Divider,
  Alert,
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
  IconWorld,
  IconLock,
  IconCopy,
  IconCheck,
  IconArrowsExchange,
  IconAlertCircle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections, SUPPORTED_LANGUAGES } from "../schema.js";
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
  const [editingDeck, setEditingDeck] = useState(/** @type {{ id: string, name: string, description: string, isPublic: boolean, language: string } | null} */ (null));

  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [deckLanguage, setDeckLanguage] = useState("norwegian");
  const [saving, setSaving] = useState(false);
  const [swappingCards, setSwappingCards] = useState(false);
  const [copying, setCopying] = useState(/** @type {string | null} */ (null));
  const [copiedDecks, setCopiedDecks] = useState(/** @type {Set<string>} */ (new Set()));

  // Query for user's own decks
  const myDecksQueryOptions = useMemo(() => ({
    where: user?.uid ? [["owner", "==", user.uid]] : [],
  }), [user?.uid]);

  const {
    data: myDecksRaw,
    loading: myDecksLoading,
    add,
    update,
    remove,
  } = useCollection(collections.decks, myDecksQueryOptions);

  // Query for public decks
  const publicDecksQueryOptions = useMemo(() => ({
    where: [["isPublic", "==", true]],
  }), []);

  const { data: publicDecksRaw, loading: publicDecksLoading } = useCollection(
    collections.decks,
    publicDecksQueryOptions
  );

  const loading = myDecksLoading || publicDecksLoading;

  // Sort user's decks by createdAt descending
  const myDecks = useMemo(() => {
    return [...myDecksRaw].sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [myDecksRaw]);

  // Filter public decks (exclude user's own) and sort by card count
  const publicDecks = useMemo(() => {
    return publicDecksRaw
      .filter((deck) => deck.owner !== user?.uid)
      .sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0));
  }, [publicDecksRaw, user?.uid]);

  // Filter both sets when searching
  const filteredMyDecks = myDecks.filter(
    (deck) =>
      deck.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPublicDecks = publicDecks.filter(
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
        isPublic,
        tags: [],
      });
      setDeckName("");
      setDeckDescription("");
      setIsPublic(false);
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Error creating deck:", err);
    } finally {
      setSaving(false);
    }
  };

  /** @param {{ id: string, name?: string, description?: string, isPublic?: boolean, language?: string }} deck */
  const handleEditClick = (deck) => {
    setEditingDeck({
      id: deck.id,
      name: deck.name || "",
      description: deck.description || "",
      isPublic: deck.isPublic || false,
      language: deck.language || "norwegian",
    });
    setDeckName(deck.name || "");
    setDeckDescription(deck.description || "");
    setIsPublic(deck.isPublic || false);
    setDeckLanguage(deck.language || "norwegian");
    setEditModalOpen(true);
  };

  const handleUpdateDeck = async () => {
    if (!deckName.trim() || !editingDeck) return;

    setSaving(true);
    try {
      // If making public, recalculate card count to ensure it's accurate
      let cardCount;
      if (isPublic) {
        const cardsQuery = query(
          collection(db, collections.cards),
          where("deckId", "==", editingDeck.id)
        );
        const cardsSnapshot = await getDocs(cardsQuery);
        cardCount = cardsSnapshot.size;
      }

      await update(editingDeck.id, {
        name: deckName.trim(),
        description: deckDescription.trim(),
        isPublic,
        language: deckLanguage,
        ...(cardCount !== undefined && { cardCount }),
      });
      setEditingDeck(null);
      setDeckName("");
      setDeckDescription("");
      setIsPublic(false);
      setDeckLanguage("norwegian");
      setEditModalOpen(false);
    } catch (err) {
      console.error("Error updating deck:", err);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Swap front/back for all cards in a deck
   */
  const handleSwapCards = async () => {
    if (!editingDeck) return;
    
    setSwappingCards(true);
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      
      const cardsQuery = query(
        collection(db, collections.cards),
        where("deckId", "==", editingDeck.id)
      );
      const cardsSnapshot = await getDocs(cardsQuery);
      
      console.log(`[Swap] Swapping front/back for ${cardsSnapshot.size} cards...`);
      
      let swapped = 0;
      for (const cardDoc of cardsSnapshot.docs) {
        const data = cardDoc.data();
        await updateDoc(doc(db, collections.cards, cardDoc.id), {
          front: data.back,
          back: data.front,
          frontAudio: data.backAudio || [],
          backAudio: data.frontAudio || [],
        });
        swapped++;
      }
      
      console.log(`[Swap] Successfully swapped ${swapped} cards`);
      notifications.show({
        title: "Cards Swapped",
        message: `Successfully swapped front/back for ${swapped} cards`,
        color: "green",
      });
    } catch (err) {
      console.error("Error swapping cards:", err);
      notifications.show({
        title: "Error",
        message: "Failed to swap cards",
        color: "red",
      });
    } finally {
      setSwappingCards(false);
    }
  };

  /** @param {string} deckId */
  const handleDeleteDeck = async (deckId) => {
    if (!confirm("Are you sure you want to delete this deck? All cards will be permanently deleted.")) {
      return;
    }
    try {
      // First, delete all cards belonging to this deck
      const { deleteDoc, doc } = await import("firebase/firestore");
      
      const cardsQuery = query(
        collection(db, collections.cards),
        where("deckId", "==", deckId)
      );
      const cardsSnapshot = await getDocs(cardsQuery);
      
      console.log(`[Delete] Removing ${cardsSnapshot.size} cards from deck...`);
      for (const cardDoc of cardsSnapshot.docs) {
        await deleteDoc(doc(db, collections.cards, cardDoc.id));
      }
      
      // Then delete the deck itself
      await remove(deckId);
      console.log(`[Delete] Deck and cards deleted successfully`);
    } catch (err) {
      console.error("Error deleting deck:", err);
    }
  };

  /**
   * Copy a public deck and all its cards to the current user's account
   * @param {string} deckId
   * @param {string} deckName
   */
  const handleCopyDeck = async (deckId, deckName) => {
    if (!user) return;

    setCopying(deckId);
    try {
      const cardsQuery = query(
        collection(db, collections.cards),
        where("deckId", "==", deckId)
      );
      const cardsSnapshot = await getDocs(cardsQuery);
      
      const newDeckRef = await addDoc(collection(db, collections.decks), {
        name: `${deckName} (copy)`,
        description: `Copied from community deck`,
        owner: user.uid,
        cardCount: cardsSnapshot.size,
        masteredCount: 0,
        isPublic: false,
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      let importOrder = 0;
      for (const cardDoc of cardsSnapshot.docs) {
        const cardData = cardDoc.data();
        await addDoc(collection(db, collections.cards), {
          deckId: newDeckRef.id,
          front: cardData.front,
          back: cardData.back,
          frontAudio: cardData.frontAudio || [],
          backAudio: cardData.backAudio || [],
          owner: user.uid,
          box: 1,
          nextReviewAt: null,
          lastReviewedAt: null,
          correctCount: 0,
          incorrectCount: 0,
          importOrder: importOrder++,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setCopiedDecks((prev) => new Set([...prev, deckId]));
      
      notifications.show({
        title: "Deck copied!",
        message: `"${deckName}" with ${cardsSnapshot.size} cards added to your decks.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Error copying deck:", err);
      notifications.show({
        title: "Error",
        message: "Failed to copy deck. Please try again.",
        color: "red",
      });
    } finally {
      setCopying(null);
    }
  };

  const handleCloseCreateModal = () => {
    setDeckName("");
    setDeckDescription("");
    setIsPublic(false);
    setCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditingDeck(null);
    setDeckName("");
    setDeckDescription("");
    setIsPublic(false);
    setDeckLanguage("norwegian");
    setEditModalOpen(false);
  };

  if (loading) {
    return (
      <Box py="xl" ta="center">
        <Text c="dimmed">Loading decks...</Text>
      </Box>
    );
  }

  /**
   * Render a deck card (reused for both my decks and public decks)
   * @param {any} deck
   * @param {boolean} isOwned
   */
  const renderDeckCard = (deck, isOwned) => {
    const cardCount = deck.cardCount || 0;
    const masteredCount = deck.masteredCount || 0;
    const progress = cardCount > 0 ? (masteredCount / cardCount) * 100 : 0;
    const isCopied = copiedDecks.has(deck.id);
    const isCopying = copying === deck.id;

    return (
      <Card
        key={deck.id}
        padding="lg"
        radius="md"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: isOwned ? "1px solid rgba(233, 69, 96, 0.2)" : "1px solid rgba(6, 182, 212, 0.2)",
          cursor: isOwned ? "pointer" : "default",
          transition: "all 0.2s ease",
        }}
        onClick={isOwned ? () => onViewDeck(deck.id) : undefined}
      >
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="lg" c="white" lineClamp={1}>
            {deck.name}
          </Text>
          {isOwned && (
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
          )}
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
          {isOwned && masteredCount > 0 && (
            <Badge variant="light" color="green" size="sm">
              <IconChartBar size={12} style={{ marginRight: 4 }} />
              {masteredCount} mastered
            </Badge>
          )}
          {deck.isPublic && (
            <Badge variant="light" color="cyan" size="sm">
              <IconWorld size={12} style={{ marginRight: 4 }} />
              Public
            </Badge>
          )}
        </Group>

        {isOwned && cardCount > 0 && (
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

        {isOwned ? (
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
        ) : (
          <Button
            fullWidth
            variant={isCopied ? "light" : "gradient"}
            gradient={{ from: "cyan", to: "teal" }}
            color={isCopied ? "green" : undefined}
            leftSection={isCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            onClick={() => handleCopyDeck(deck.id, deck.name)}
            loading={isCopying}
            disabled={isCopied}
          >
            {isCopied ? "Added to My Decks" : "Copy to My Decks"}
          </Button>
        )}
      </Card>
    );
  };

  return (
    <Stack gap="lg" py="md">
      {/* Header with actions */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2} c="white">My Decks</Title>
          <Text size="sm" c="dimmed">
            {myDecks.length} deck{myDecks.length !== 1 ? "s" : ""} • Create, study, and track your progress
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

      {/* Search */}
      <TextInput
        placeholder="Search all decks..."
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

      {/* My Decks Section */}
      {filteredMyDecks.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredMyDecks.map((deck) => renderDeckCard(deck, true))}
        </SimpleGrid>
      )}

      {/* Empty state for my decks (only show if not searching) */}
      {myDecks.length === 0 && !searchQuery && (
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
              No decks yet. Create your first deck or copy one from the community!
            </Text>
            <Button
              variant="light"
              color="pink"
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Deck
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Community Decks Section */}
      {filteredPublicDecks.length > 0 && (
        <>
          <Group gap="sm" mt="lg">
            <IconWorld size={20} color="#06b6d4" />
            <Title order={3} c="white">Community Decks</Title>
            <Text size="sm" c="dimmed">• Copy to start studying</Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {filteredPublicDecks.map((deck) => renderDeckCard(deck, false))}
          </SimpleGrid>
        </>
      )}

      {/* No results message */}
      {searchQuery && filteredMyDecks.length === 0 && filteredPublicDecks.length === 0 && (
        <Paper
          p="xl"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
          withBorder
        >
          <Stack align="center" gap="md">
            <IconSearch size={48} color="#666" />
            <Text size="lg" c="dimmed" ta="center">
              No decks match "{searchQuery}"
            </Text>
          </Stack>
        </Paper>
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
          <Switch
            label="Make this deck public"
            description="Other users can discover and copy this deck to study"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
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
          <Select
            label="Card Language"
            description="Used for text-to-speech audio"
            value={deckLanguage}
            onChange={(v) => setDeckLanguage(v || "norwegian")}
            data={Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => ({
              value: key,
              label: lang.name,
            }))}
          />
          <Switch
            label="Make this deck public"
            description="Other users can discover and copy this deck to study"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
          />
          
          <Divider label="Card Operations" labelPosition="center" />
          
          <Alert 
            icon={<IconArrowsExchange size={16} />} 
            color="orange" 
            variant="light"
            title="Swap Front ↔ Back"
          >
            <Text size="sm" mb="sm">
              Swap the front and back content of all cards in this deck. 
              Useful if you imported cards in the wrong direction.
            </Text>
            <Button
              variant="light"
              color="orange"
              size="xs"
              leftSection={<IconArrowsExchange size={14} />}
              onClick={handleSwapCards}
              loading={swappingCards}
            >
              Swap All Cards
            </Button>
          </Alert>
          
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

