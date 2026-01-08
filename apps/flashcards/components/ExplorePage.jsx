/**
 * ExplorePage - Browse and copy public decks from the community
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
  Badge,
  SimpleGrid,
  Box,
  Card,
  Loader,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconSearch,
  IconCards,
  IconCopy,
  IconUser,
  IconWorld,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../framework/core/firebase-init.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { collections } from "../schema.js";

/**
 * @param {{ onViewDeck: (deckId: string) => void }} props
 */
export function ExplorePage({ onViewDeck }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [copying, setCopying] = useState(/** @type {string | null} */ (null));
  const [copiedDecks, setCopiedDecks] = useState(/** @type {Set<string>} */ (new Set()));

  // Query for public decks (not owned by current user)
  const queryOptions = useMemo(() => ({
    where: [["isPublic", "==", true]],
  }), []);

  const { data: publicDecksRaw, loading } = useCollection(collections.decks, queryOptions);

  // Filter out user's own decks and sort by card count (most popular first)
  const publicDecks = useMemo(() => {
    return publicDecksRaw
      .filter((deck) => deck.owner !== user?.uid)
      .sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0));
  }, [publicDecksRaw, user?.uid]);

  const filteredDecks = publicDecks.filter(
    (deck) =>
      deck.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Copy a public deck and all its cards to the current user's account
   * @param {string} deckId
   * @param {string} deckName
   */
  const handleCopyDeck = async (deckId, deckName) => {
    if (!user) return;

    setCopying(deckId);
    try {
      // 1. Fetch all cards from the source deck
      const cardsQuery = query(
        collection(db, collections.cards),
        where("deckId", "==", deckId)
      );
      const cardsSnapshot = await getDocs(cardsQuery);
      
      // 2. Create a new deck for the current user
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

      // 3. Copy all cards to the new deck (reset progress)
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
        message: `"${deckName}" with ${cardsSnapshot.size} cards has been added to your decks.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("Error copying deck:", err);
      notifications.show({
        title: "Error",
        message: "Failed to copy deck. Please try again.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setCopying(null);
    }
  };

  if (loading) {
    return (
      <Box py="xl" ta="center">
        <Loader color="pink" />
        <Text c="dimmed" mt="md">Loading community decks...</Text>
      </Box>
    );
  }

  return (
    <Stack gap="lg" py="md">
      <div>
        <Title order={2} c="white">
          <IconWorld size={28} style={{ marginRight: 8, verticalAlign: "middle" }} />
          Explore Community Decks
        </Title>
        <Text size="sm" c="dimmed">
          Discover and copy decks shared by other users
        </Text>
      </div>

      <TextInput
        placeholder="Search public decks..."
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
            <IconWorld size={48} color="#666" />
            <Text size="lg" c="dimmed" ta="center">
              {searchQuery
                ? "No public decks match your search"
                : "No public decks available yet. Be the first to share!"}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filteredDecks.map((deck) => {
            const cardCount = deck.cardCount || 0;
            const isCopied = copiedDecks.has(deck.id);
            const isCopying = copying === deck.id;

            return (
              <Card
                key={deck.id}
                padding="lg"
                radius="md"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                <Text fw={600} size="lg" c="white" mb="xs" lineClamp={1}>
                  {deck.name}
                </Text>
                
                {deck.description && (
                  <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                    {deck.description}
                  </Text>
                )}

                <Group gap="xs" mb="md">
                  <Badge variant="light" color="pink" size="sm">
                    <IconCards size={12} style={{ marginRight: 4 }} />
                    {cardCount} card{cardCount !== 1 ? "s" : ""}
                  </Badge>
                </Group>

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
                  {isCopied ? "Copied to My Decks" : "Copy to My Decks"}
                </Button>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}

