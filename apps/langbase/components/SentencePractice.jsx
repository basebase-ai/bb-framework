/**
 * SentencePractice - Generate practice sentences using vocabulary from a specific Leitner box
 * Users click on words they didn't know, which get marked as "hard"
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  Loader,
  NumberInput,
  RangeSlider,
  Alert,
  SegmentedControl,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconVolume,
  IconChevronRight,
  IconAlertCircle,
  IconBook,
  IconMessages,
  IconBox,
} from "@tabler/icons-react";
import { serverTimestamp } from "firebase/firestore";

import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections, LEITNER_INTERVALS, SUPPORTED_LANGUAGES } from "../schema.js";
import { useUIStore } from "../stores/uiStore.js";

/**
 * @typedef {Object} VocabWord
 * @property {string} word - The vocabulary word (base form)
 * @property {string} cardId - The card ID for this word
 */

/**
 * @typedef {Object} GeneratedSentence
 * @property {string} target - Sentence in target language
 * @property {string} english - English translation
 * @property {string[]} vocabularyUsed - Words from deck used in this sentence
 * @property {VocabWord[]} vocabWithIds - Words with their card IDs
 */

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
 * @param {{ deckId: string, onBack: () => void }} props
 */
export function SentencePractice({ deckId, onBack }) {
  const { user } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  // Card cache for updates
  const updateCachedCard = useUIStore((s) => s.updateCachedCard);
  const cardCache = useUIStore((s) => s.cardCache);
  
  // Configuration state
  const [mode, setMode] = useState(/** @type {'sentences' | 'story'} */ ("sentences"));
  const [numSentences, setNumSentences] = useState(/** @type {number | ''} */ (20));
  const [wordRange, setWordRange] = useState(/** @type {[number, number]} */ ([6, 10]));
  const [selectedBoxes, setSelectedBoxes] = useState(/** @type {number[]} */ ([]));
  const [started, setStarted] = useState(false);
  const [storyTitle, setStoryTitle] = useState("");
  
  // Practice state
  const [sentences, setSentences] = useState(/** @type {GeneratedSentence[]} */ ([]));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Words the user clicked as "didn't know" for current sentence
  const [unknownWords, setUnknownWords] = useState(/** @type {Set<string>} */ (new Set()));
  
  // Stats for the session
  const [sessionStats, setSessionStats] = useState({ easy: 0, hard: 0 });
  const [updating, setUpdating] = useState(false);
  
  // Track which cards have been updated (to avoid double-counting)
  const updatedCardIds = useRef(/** @type {Set<string>} */ (new Set()));
  
  const { call: callLLM } = useFunction("askLLM");
  const { data: deck } = useDocument(collections.decks, deckId);
  
  const cardQueryOptions = useMemo(() => ({
    where: user?.uid ? [
      ["deckId", "==", deckId],
      ["owner", "==", user.uid],
    ] : [],
  }), [deckId, user?.uid]);

  const { data: allCards, update: updateCard } = useCollection(collections.cards, cardQueryOptions);

  // Get vocabulary from selected boxes
  const availableVocab = useMemo(() => {
    if (!allCards) return [];
    return allCards
      .filter((card) => {
        const box = card.box || 1;
        return selectedBoxes.includes(box);
      })
      .map((card) => {
        // Extract just the word from front (remove parenthetical part of speech)
        const word = card.front.replace(/\s*\([^)]*\)/g, "").trim();
        return { 
          word, 
          meaning: extractDefinition(card.back),
          cardId: card.id,
          box: card.box || 1,
        };
      })
      .filter((v) => v.word.length > 0);
  }, [allCards, selectedBoxes]);

  // Count cards per box
  const boxCounts = useMemo(() => {
    if (!allCards) return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allCards.forEach((card) => {
      const box = card.box || 1;
      if (box >= 1 && box <= 5) counts[box]++;
    });
    return counts;
  }, [allCards]);

  // Get language info
  const languageKey = deck?.language || "spanish";
  const langInfo = SUPPORTED_LANGUAGES[languageKey] || SUPPORTED_LANGUAGES.spanish;

  /**
   * Extract the main definition from card content
   * @param {string} content
   * @returns {string}
   */
  function extractDefinition(content) {
    if (!content) return "";
    
    // Look for first bold text
    const boldMatch = content.match(/\*\*([^*]{1,50})\*\*/) || 
                      content.match(/<strong>([^<]{1,50})<\/strong>/i);
    if (boldMatch) return boldMatch[1];
    
    // Otherwise return first line
    return content.split("\n")[0].replace(/<[^>]*>/g, "").substring(0, 50);
  }

  /**
   * Speak text using Web Speech API
   * @param {string} text
   */
  const speak = useCallback((text) => {
    if (!text || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) => v.lang.startsWith(langInfo.code) || v.lang.startsWith(langInfo.speechCode?.split("-")[0] || langInfo.code)
    );
    
    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    } else {
      utterance.lang = langInfo.speechCode || langInfo.code;
    }
    
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [langInfo]);

  /**
   * Toggle box selection
   * @param {number} box
   */
  const toggleBox = (box) => {
    setSelectedBoxes((prev) => {
      if (prev.includes(box)) {
        return prev.filter((b) => b !== box);
      }
      return [...prev, box].sort();
    });
  };

  /**
   * Toggle a word as unknown/known
   * @param {string} word
   */
  const toggleUnknownWord = (word) => {
    setUnknownWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  };

  /**
   * Generate sentences or story using LLM
   */
  const generateContent = useCallback(async () => {
    if (availableVocab.length < 3) {
      setError(`You need at least 3 words in the selected boxes to generate content. Currently: ${availableVocab.length} words available.`);
      return;
    }

    setGenerating(true);
    setError(null);
    setStoryTitle("");
    updatedCardIds.current.clear();
    
    // Use all available vocab (up to 100 words for better sentence variety)
    const maxVocab = mode === "story" ? 60 : 100;
    const vocabSample = [...availableVocab]
      .sort(() => Math.random() - 0.5)
      .slice(0, maxVocab);
    
    // Create a mapping from word to cardId for tracking
    /** @type {Record<string, string>} */
    const wordToCardId = {};
    vocabSample.forEach((v) => {
      wordToCardId[v.word.toLowerCase()] = v.cardId;
    });
    
    const vocabList = vocabSample
      .map((v) => `${v.word} (${v.meaning})`)
      .join("\n");

    const count = typeof numSentences === "number" ? numSentences : 20;
    const [minWords, maxWords] = wordRange;

    const grammarWords = "I, you, he, she, we, they, is, was, are, were, have, had, can, will, must, should, not, it, the, this, that, which, of, for, about, but, or, if, when, here, there, now, then, a, an, and, on, in, to, from, with, my, your, his, her, our, their, what, who, where, why, how, yes, no, so, also, only, always, never, often, some, all, none, many, few, more, most, less, least, good, better, best, big, small, new, old, young, first, last, other, same, own, each, both, either, neither, because, therefore, even, very, quite, really";

    let prompt;
    
    if (mode === "story") {
      prompt = `You are helping someone learn ${langInfo.name}. Create a cohesive mini-story in ${langInfo.name} using AS MANY vocabulary words as possible from the list below.

VOCABULARY (${langInfo.name} word - English meaning):
${vocabList}

STORY REQUIREMENTS:
1. Write a story with exactly ${count} sentences
2. Each sentence should be ${minWords}-${maxWords} words long
3. MAXIMIZE the use of vocabulary words from the list - try to use each word at least once if possible
4. You may use basic grammar words: ${grammarWords}
5. Include 1-2 characters with authentic names from ${langInfo.name}-speaking cultures
6. The story must have a clear beginning, middle, and ending
7. Make it interesting - could be funny, heartwarming, mysterious, or surprising
8. The sentences should flow naturally as a narrative

OUTPUT FORMAT (JSON object, no markdown):
{
  "title": "Story title in ${langInfo.name}",
  "titleEnglish": "Story title in English", 
  "sentences": [
    {"target": "First sentence in ${langInfo.name}", "english": "English translation", "vocabularyUsed": ["word1", "word2"]},
    {"target": "Second sentence in ${langInfo.name}", "english": "English translation", "vocabularyUsed": ["word3"]},
    ...
  ]
}

Generate the story now:`;
    } else {
      prompt = `You are helping someone learn ${langInfo.name}. Generate exactly ${count} simple ${langInfo.name} sentences using AS MANY vocabulary words as possible from the list below.

VOCABULARY (${langInfo.name} word - English meaning):
${vocabList}

REQUIREMENTS:
1. Each sentence must be ${minWords}-${maxWords} words long
2. MAXIMIZE vocabulary usage - try to use EVERY word from the list at least once across all sentences
3. Try to include 2-4 vocabulary words per sentence when natural
4. You may use basic grammar words: ${grammarWords}
5. Make sentences that are natural and useful for daily conversation
6. Vary the sentence structures

OUTPUT FORMAT (JSON array, no markdown):
[
  {"target": "sentence in ${langInfo.name}", "english": "English translation", "vocabularyUsed": ["word1", "word2"]},
  ...
]

Generate the sentences now:`;
    }

    try {
      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: prompt,
        options: { maxTokens: 4000, temperature: 0.85 },
      });

      const responseText = result?.response || "";
      
      /** @type {Array<{target?: string, norwegian?: string, english: string, vocabularyUsed: string[]}>} */
      let parsed;
      
      if (mode === "story") {
        // Parse story format
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid story format");
        const storyData = JSON.parse(jsonMatch[0]);
        
        if (!storyData.sentences || !Array.isArray(storyData.sentences)) {
          throw new Error("Invalid story format - missing sentences");
        }
        
        setStoryTitle(storyData.title || "");
        parsed = storyData.sentences;
      } else {
        // Parse sentences format
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(responseText);
        }
      }
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid response format");
      }
      
      // Map vocabulary to card IDs
      const sentencesWithCardIds = parsed.map((s) => {
        const vocabWithIds = (s.vocabularyUsed || [])
          .map((word) => ({
            word,
            cardId: wordToCardId[word.toLowerCase()] || "",
          }))
          .filter((v) => v.cardId); // Only include words we have cards for
        
        return {
          target: s.target || s.norwegian || "", // Support both old and new format
          english: s.english,
          vocabularyUsed: s.vocabularyUsed || [],
          vocabWithIds,
        };
      });
      
      setSentences(sentencesWithCardIds);
      setCurrentIndex(0);
      setShowTranslation(false);
      setUnknownWords(new Set());
      setStarted(true);
      setSessionStats({ easy: 0, hard: 0 });
    } catch (err) {
      console.error("Error generating content:", err);
      setError(err instanceof Error ? err.message : "Failed to generate content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [availableVocab, numSentences, wordRange, mode, callLLM, langInfo]);

  const currentSentence = sentences[currentIndex];
  const progress = sentences.length > 0 ? ((currentIndex + 1) / sentences.length) * 100 : 0;

  /**
   * Continue to next sentence, updating cards based on which words were marked unknown
   */
  const handleContinue = async () => {
    if (!currentSentence || updating) return;
    
    setUpdating(true);
    
    const vocabWords = currentSentence.vocabWithIds || [];
    let easyCount = 0;
    let hardCount = 0;

    // Update each card based on whether the user marked it as unknown
    for (const { word, cardId } of vocabWords) {
      if (updatedCardIds.current.has(cardId)) continue;
      
      const card = allCards?.find((c) => c.id === cardId);
      if (!card) continue;
      
      const isHard = unknownWords.has(word);
      const currentBox = card.box || 1;
      let newBox = currentBox;
      
      if (isHard) {
        // Move back to box 1
        newBox = 1;
        hardCount++;
      } else {
        // Move up one box (max 5)
        newBox = Math.min(currentBox + 1, 5);
        easyCount++;
      }
      
      // Calculate next review date based on new box
      const intervalDays = LEITNER_INTERVALS[newBox] || 1;
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);
      
      const updates = {
        box: newBox,
        nextReviewAt,
        lastReviewedAt: serverTimestamp(),
        ...(isHard 
          ? { incorrectCount: (card.incorrectCount || 0) + 1 }
          : { correctCount: (card.correctCount || 0) + 1 }
        ),
      };
      
      try {
        await updateCard(cardId, updates);
        // Update cache if present
        if (cardCache[deckId]) {
          updateCachedCard(deckId, cardId, updates);
        }
        updatedCardIds.current.add(cardId);
      } catch (err) {
        console.error("Error updating card:", err);
      }
    }
    
    // Update session stats
    setSessionStats((prev) => ({
      easy: prev.easy + easyCount,
      hard: prev.hard + hardCount,
    }));
    
    setUpdating(false);
    setUnknownWords(new Set());
    
    // Move to next sentence
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowTranslation(false);
    } else {
      setFinished(true);
    }
  };

  const handleReveal = () => {
    setShowTranslation(true);
    if (currentSentence) {
      speak(currentSentence.target);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!started || finished) return;

    /** @param {KeyboardEvent} e */
    const handleKeyDown = (e) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!showTranslation) {
            handleReveal();
          }
          break;
        case "Enter":
          e.preventDefault();
          if (showTranslation && !updating) {
            handleContinue();
          }
          break;
        case "Escape":
          onBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, finished, showTranslation, updating, currentIndex, sentences.length, onBack]);

  // Configuration screen
  if (!started) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" withBorder shadow="sm" style={{ maxWidth: 550, width: "100%" }}>
          <Group justify="space-between" mb="xl">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={3}>Sentence Practice</Title>
            <Box w={28} />
          </Group>

          <Text c="dimmed" size="sm" mb="lg">
            Practice reading sentences generated from your flashcard vocabulary. Click on any words you didn't know to mark them for review.
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          {/* Box Selection */}
          <Text fw={500} size="sm" mb="xs">Select Leitner Boxes to include:</Text>
          <Group gap="xs" mb="lg">
            {[1, 2, 3, 4, 5].map((box) => {
              const count = boxCounts[box];
              const isSelected = selectedBoxes.includes(box);
              return (
                <Button
                  key={box}
                  size="sm"
                  variant={isSelected ? "filled" : "outline"}
                  color={getBoxColor(box)}
                  onClick={() => toggleBox(box)}
                  leftSection={<IconBox size={14} />}
                  disabled={count === 0}
                >
                  Box {box} ({count})
                </Button>
              );
            })}
          </Group>
          
          <Text size="xs" c="dimmed" mb="lg">
            {availableVocab.length} words available from selected boxes
          </Text>

          <Text fw={500} size="sm" mb="xs">Practice type</Text>
          <SegmentedControl
            value={mode}
            onChange={(val) => setMode(/** @type {'sentences' | 'story'} */ (val))}
            fullWidth
            mb="lg"
            data={[
              { 
                label: (
                  <Group gap="xs" justify="center">
                    <IconMessages size={16} />
                    <span>Random Sentences</span>
                  </Group>
                ), 
                value: "sentences" 
              },
              { 
                label: (
                  <Group gap="xs" justify="center">
                    <IconBook size={16} />
                    <span>Story Mode</span>
                  </Group>
                ), 
                value: "story" 
              },
            ]}
          />

          {mode === "story" && (
            <Alert color="violet" variant="light" mb="lg">
              <Text size="sm">
                📖 Story Mode generates a cohesive narrative using your vocabulary words!
              </Text>
            </Alert>
          )}

          <Text fw={500} size="sm" mb="xs">
            {mode === "story" ? "Number of sentences in story" : "Number of sentences"}
          </Text>
          <NumberInput
            value={numSentences}
            onChange={(val) => setNumSentences(val)}
            min={mode === "story" ? 5 : 5}
            max={mode === "story" ? 20 : 50}
            mb="lg"
          />

          <Text fw={500} size="sm" mb="xs">Sentence length (words): {wordRange[0]} - {wordRange[1]}</Text>
          <RangeSlider
            value={wordRange}
            onChange={setWordRange}
            min={2}
            max={15}
            step={1}
            minRange={2}
            marks={[
              { value: 2, label: "2" },
              { value: 8, label: "8" },
              { value: 15, label: "15" },
            ]}
            mb="xl"
            color="violet"
          />

          <Group justify="center" gap="md" mt="xl">
            <Button variant="light" color="gray" onClick={onBack}>
              Cancel
            </Button>
            <Button
              variant="filled"
              color="violet"
              size="lg"
              leftSection={mode === "story" ? <IconBook size={18} /> : <IconMessages size={18} />}
              onClick={generateContent}
              loading={generating}
              disabled={selectedBoxes.length === 0 || availableVocab.length < 3}
            >
              {generating ? "Generating..." : mode === "story" ? "Generate Story" : "Generate Sentences"}
            </Button>
          </Group>

          {selectedBoxes.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" mt="md">
              Select at least one Leitner box to start practicing.
            </Text>
          )}
          {selectedBoxes.length > 0 && availableVocab.length < 3 && (
            <Text c="dimmed" size="sm" ta="center" mt="md">
              Selected boxes need at least 3 words total to start practicing.
            </Text>
          )}
        </Paper>
      </Box>
    );
  }

  // Completion screen
  if (finished) {
    const totalUpdated = updatedCardIds.current.size;
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" withBorder shadow="sm" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <Title order={2} mb="lg">
            {mode === "story" ? "📖 The End!" : "🎉 Practice Complete!"}
          </Title>
          {mode === "story" && storyTitle && (
            <Text c="violet.4" fw={500} mb="sm">"{storyTitle}"</Text>
          )}
          <Text c="dimmed" mb="md">
            {mode === "story" 
              ? `You read a ${sentences.length}-part story!` 
              : `You practiced with ${sentences.length} sentences!`}
          </Text>
          
          {/* Session Stats */}
          <Paper p="md" withBorder radius="md" mb="lg">
            <Group justify="center" gap="xl">
              <Stack align="center" gap={4}>
                <Text size="2rem" fw={700} c="green">{sessionStats.easy}</Text>
                <Text size="sm" c="dimmed">Words Known</Text>
              </Stack>
              <Stack align="center" gap={4}>
                <Text size="2rem" fw={700} c="red">{sessionStats.hard}</Text>
                <Text size="sm" c="dimmed">Words to Review</Text>
              </Stack>
            </Group>
            <Text size="sm" c="dimmed" mt="md">
              {totalUpdated} card{totalUpdated !== 1 ? "s" : ""} updated
            </Text>
          </Paper>
          
          <Group justify="center" gap="md">
            <Button variant="light" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
              Back to Deck
            </Button>
            <Button
              variant="filled"
              color="violet"
              leftSection={<IconRefresh size={16} />}
              onClick={() => {
                setStarted(false);
                setSentences([]);
                setCurrentIndex(0);
                setShowTranslation(false);
                setFinished(false);
                setStoryTitle("");
                setSessionStats({ easy: 0, hard: 0 });
                setUnknownWords(new Set());
                updatedCardIds.current.clear();
              }}
            >
              Practice More
            </Button>
          </Group>
        </Paper>
      </Box>
    );
  }

  // Practice screen
  const vocabWords = currentSentence?.vocabWithIds || [];

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <Group justify="space-between" maw={800} mx="auto">
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Box>
              <Text fw={500}>
                {mode === "story" && storyTitle ? `📖 ${storyTitle}` : "Sentence Practice"}
              </Text>
              {mode === "story" && (
                <Text size="xs" c="dimmed">Story Mode</Text>
              )}
            </Box>
          </Group>
          <Group gap="md">
            <Badge color="green" variant="light" size="sm">Known: {sessionStats.easy}</Badge>
            <Badge color="red" variant="light" size="sm">Review: {sessionStats.hard}</Badge>
            <Text size="sm" c="dimmed">{currentIndex + 1} / {sentences.length}</Text>
          </Group>
        </Group>
        <Progress value={progress} color="violet" size="xs" radius={0} mt="sm" />
      </Box>

      {/* Main content */}
      <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Box style={{ width: "100%", maxWidth: 600 }}>
          <Paper
            p="xl"
            radius="lg"
            withBorder
            shadow="sm"
            style={{
              borderColor: showTranslation ? "var(--mantine-color-violet-6)" : undefined,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Badge variant="light" color="violet" size="sm" mb="md">
              {mode === "story" ? `Part ${currentIndex + 1}` : `Sentence ${currentIndex + 1}`}
            </Badge>

            {/* Target language sentence */}
            <Text
              size="1.5rem"
              fw={600}
              c="violet"
              ta="center"
              mb="md"
              style={{ lineHeight: 1.5 }}
            >
              {currentSentence?.target}
            </Text>

            {/* Speak button */}
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconVolume size={14} />}
              onClick={() => currentSentence && speak(currentSentence.target)}
              loading={isSpeaking}
              mb="md"
            >
              Listen
            </Button>

            {/* Translation and vocabulary (shown after reveal) */}
            {showTranslation && (
              <>
                <Box
                  style={{
                    width: "100%",
                    height: 1,
                    background: "var(--mantine-color-default-border)",
                    margin: "1rem 0",
                  }}
                />
                <Text size="lg" c="dimmed" ta="center" mb="md">
                  {currentSentence?.english}
                </Text>
                
                {/* Clickable vocabulary words */}
                {vocabWords.length > 0 && (
                  <>
                    <Text size="sm" c="dimmed" mb="xs">
                      Click any words you didn't know:
                    </Text>
                    <Group gap="xs" justify="center" wrap="wrap">
                      {vocabWords.map(({ word, cardId }) => {
                        const isUnknown = unknownWords.has(word);
                        return (
                          <Badge
                            key={cardId}
                            variant={isUnknown ? "filled" : "light"}
                            color={isUnknown ? "red" : "grape"}
                            size="lg"
                            style={{ 
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => toggleUnknownWord(word)}
                          >
                            {word} {isUnknown && "✗"}
                          </Badge>
                        );
                      })}
                    </Group>
                  </>
                )}
              </>
            )}
          </Paper>

          {/* Action buttons */}
          <Group justify="center" mt="xl" gap="md">
            {!showTranslation ? (
              <Button
                size="lg"
                variant="filled"
                color="violet"
                onClick={handleReveal}
              >
                Show Translation
              </Button>
            ) : (
              <Button
                size="lg"
                variant="filled"
                color="violet"
                rightSection={!updating && <IconChevronRight size={20} />}
                onClick={handleContinue}
                loading={updating}
                disabled={updating}
              >
                {currentIndex < sentences.length - 1 ? "Continue" : "Finish"}
              </Button>
            )}
          </Group>

          <Text size="xs" c="dimmed" ta="center" mt="xl">
            Press Space to reveal • Enter to continue • Esc to exit
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
