/**
 * VocabularyPanel - Compact list of vocabulary words looked up
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
} from "@mantine/core";
import { IconSearch, IconVolume, IconX, IconCards } from "@tabler/icons-react";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useRoute } from "../../../framework/hooks/useRoute.js";
import { useSpeech } from "../hooks/useSpeech.js";
import { useUIStore } from "../stores/uiStore.js";
import { collections } from "../schema.js";

/**
 * @param {{ onClose?: () => void }} props
 */
export function VocabularyPanel({ onClose }) {
  const { user } = useAuth();
  const { navigate } = useRoute();
  const [search, setSearch] = useState("");
  const { speak, supported: speechSupported } = useSpeech();
  const sourceLanguage = useUIStore((s) => s.sourceLanguage);

  // Memoize query options to prevent infinite re-renders
  const vocabQueryOptions = useMemo(
    () => ({
      where: user ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  const { data: vocabulary, loading } = useCollection(collections.vocabulary, vocabQueryOptions);

  // Count cards due for review
  const dueCount = useMemo(() => (vocabulary || []).filter((v) => {
    if (!v.nextReviewAt) return true;
    const nextReview = v.nextReviewAt.toDate ? v.nextReviewAt.toDate() : new Date(v.nextReviewAt);
    return nextReview <= new Date();
  }).length, [vocabulary]);

  // Filter and sort vocabulary
  const filteredVocab = (vocabulary || [])
    .filter((v) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        v.word.toLowerCase().includes(searchLower) ||
        v.translation.toLowerCase().includes(searchLower)
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

  return (
    <Paper
      h="100%"
      p="sm"
      withBorder
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--mantine-color-dark-7)",
        borderColor: "var(--mantine-color-dark-5)",
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Text fw={600} size="sm">
            Vocabulary
          </Text>
          <Badge size="xs" variant="light" color="blue">
            {vocabulary?.length || 0}
          </Badge>
        </Group>
        {onClose && (
          <ActionIcon variant="subtle" size="sm" onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        )}
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

      {/* Word list */}
      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <Stack gap={4}>
          {loading && !vocabulary ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              Loading...
            </Text>
          ) : filteredVocab.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              {search ? "No matches" : "No words yet"}
            </Text>
          ) : (
            filteredVocab.map((vocab) => (
              <Box
                key={vocab.id}
                p="xs"
                style={{
                  borderRadius: "4px",
                  background: "var(--mantine-color-dark-6)",
                  cursor: "default",
                }}
              >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Group gap={4} wrap="nowrap">
                      <Text
                        size="sm"
                        fw={500}
                        c="blue.4"
                        truncate
                        style={{ flex: 1 }}
                      >
                        {vocab.word}
                      </Text>
                      {speechSupported && (
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          color="gray"
                          onClick={() => handleSpeak(vocab.word)}
                        >
                          <IconVolume size={12} />
                        </ActionIcon>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {vocab.translation}
                    </Text>
                  </Box>
                  {vocab.masteryLevel > 0 && (
                    <Tooltip label={`Mastery: ${vocab.masteryLevel}/5`}>
                      <Badge size="xs" variant="dot" color="green">
                        {vocab.masteryLevel}
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
              </Box>
            ))
          )}
        </Stack>
      </ScrollArea>

      {/* Stats & Practice button */}
      {vocabulary && vocabulary.length > 0 && (
        <Box mt="sm" pt="sm" style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}>
          <Text size="xs" c="dimmed" ta="center" mb="xs">
            {vocabulary.filter((v) => v.masteryLevel >= 3).length} mastered •{" "}
            {vocabulary.filter((v) => v.masteryLevel < 3).length} learning
          </Text>
          <Button
            fullWidth
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconCards size={14} />}
            onClick={() => navigate("/practice")}
          >
            Practice Flashcards
            {dueCount > 0 && (
              <Badge size="xs" color="red" variant="filled" ml={6}>
                {dueCount}
              </Badge>
            )}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

