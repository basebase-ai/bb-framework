/**
 * SentencePractice - Generate practice sentences using mastered vocabulary
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
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
} from "@mantine/core";
import {
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconPlayerPlay,
  IconVolume,
  IconChevronRight,
  IconAlertCircle,
  IconBook,
  IconMessages,
} from "@tabler/icons-react";

import { useCollection } from "../../../framework/hooks/useCollection.js";
import { useDocument } from "../../../framework/hooks/useDocument.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { collections } from "../schema.js";

/**
 * @typedef {Object} GeneratedSentence
 * @property {string} norwegian
 * @property {string} english
 * @property {string[]} vocabularyUsed
 */

/**
 * @param {{ deckId: string, onBack: () => void }} props
 */
export function SentencePractice({ deckId, onBack }) {
  const { user } = useAuth();
  
  // Configuration state
  const [mode, setMode] = useState(/** @type {'sentences' | 'story'} */ ("sentences"));
  const [numSentences, setNumSentences] = useState(/** @type {number | ''} */ (5));
  const [wordRange, setWordRange] = useState(/** @type {[number, number]} */ ([4, 8]));
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
  
  const { call: callLLM } = useFunction("askLLM");
  const { data: deck } = useDocument(collections.decks, deckId);
  
  const cardQueryOptions = useMemo(() => ({
    where: user?.uid ? [
      ["deckId", "==", deckId],
      ["owner", "==", user.uid],
    ] : [],
  }), [deckId, user?.uid]);

  const { data: allCards } = useCollection(collections.cards, cardQueryOptions);

  // Get mastered vocabulary (Box 2+ or recently answered "easy")
  const masteredVocab = useMemo(() => {
    return allCards
      .filter((card) => {
        const box = card.box || 1;
        // Include cards in Box 2+ (progressing/mastered)
        // or cards in Box 1 that have been reviewed and have more correct than incorrect
        if (box >= 2) return true;
        if (card.lastReviewedAt && (card.correctCount || 0) > (card.incorrectCount || 0)) return true;
        return false;
      })
      .map((card) => {
        // Extract just the word from front (remove parenthetical part of speech)
        const word = card.front.replace(/\s*\([^)]*\)/g, "").trim();
        return { word, meaning: extractDefinition(card.back) };
      })
      .filter((v) => v.word.length > 0);
  }, [allCards]);

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
    const norwegianVoice = voices.find(
      (v) => v.lang.startsWith("no") || v.lang.startsWith("nb") || v.lang.startsWith("nn")
    );
    
    if (norwegianVoice) {
      utterance.voice = norwegianVoice;
      utterance.lang = norwegianVoice.lang;
    } else {
      utterance.lang = "nb-NO";
    }
    
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Generate sentences or story using LLM
   */
  const generateContent = useCallback(async () => {
    if (masteredVocab.length < 3) {
      setError("You need at least 3 mastered words to generate content. Keep studying!");
      return;
    }

    setGenerating(true);
    setError(null);
    setStoryTitle("");
    
    // Pick a random subset of vocabulary (max 40 words for stories, 30 for sentences)
    const maxVocab = mode === "story" ? 40 : 30;
    const vocabSample = [...masteredVocab]
      .sort(() => Math.random() - 0.5)
      .slice(0, maxVocab);
    
    const vocabList = vocabSample
      .map((v) => `${v.word} (${v.meaning})`)
      .join("\n");

    const count = typeof numSentences === "number" ? numSentences : 5;
    const [minWords, maxWords] = wordRange;

    const grammarWords = "jeg, du, han, hun, vi, de, er, var, har, hadde, kan, vil, må, skal, ikke, det, den, denne, som, av, for, om, men, eller, hvis, når, her, der, nå, da, en, et, og, på, i, til, fra, med, sitt, sin, sine, meg, deg, seg, oss, dem, min, din, hans, hennes, vår, deres, hva, hvem, hvor, hvorfor, hvordan, ja, nei, så, også, bare, alltid, aldri, ofte, noen, alle, ingen, mange, få, mer, mest, mindre, minst, god, bedre, best, stor, liten, ny, gammel, ung, første, siste, annen, samme, egen, hver, begge, både, enten, verken, fordi, derfor, selv, meget, ganske, veldig";

    let prompt;
    
    if (mode === "story") {
      prompt = `You are helping someone learn Norwegian by writing a short story. Create a cohesive mini-story in Norwegian using ONLY the vocabulary words provided below.

VOCABULARY (Norwegian word - English meaning):
${vocabList}

STORY REQUIREMENTS:
1. Write a story with exactly ${count} sentences
2. Each sentence should be ${minWords}-${maxWords} words long
3. Use ONLY Norwegian words from the vocabulary list above (plus basic grammar words: ${grammarWords})
4. Include 1-2 characters with authentic Norwegian names (like Erik, Ingrid, Lars, Astrid, Knut, Liv, etc.)
5. The story must have a clear beginning, middle, and ending
6. Make it interesting - could be funny, heartwarming, mysterious, or surprising
7. The sentences should flow naturally as a narrative

OUTPUT FORMAT (JSON object, no markdown):
{
  "title": "Story title in Norwegian",
  "titleEnglish": "Story title in English", 
  "sentences": [
    {"norwegian": "First sentence", "english": "English translation", "vocabularyUsed": ["word1", "word2"]},
    {"norwegian": "Second sentence", "english": "English translation", "vocabularyUsed": ["word3"]},
    ...
  ]
}

Generate the story now:`;
    } else {
      prompt = `You are helping someone learn Norwegian. Generate exactly ${count} simple Norwegian sentences using ONLY the vocabulary words provided below. 

VOCABULARY (Norwegian word - English meaning):
${vocabList}

REQUIREMENTS:
1. Each sentence must be ${minWords}-${maxWords} words long
2. Use ONLY the Norwegian words from the vocabulary list above (plus basic grammar words: ${grammarWords})
3. Make sentences that are natural and useful for daily conversation
4. Vary the sentence structures

OUTPUT FORMAT (JSON array, no markdown):
[
  {"norwegian": "sentence in Norwegian", "english": "English translation", "vocabularyUsed": ["word1", "word2"]},
  ...
]

Generate the sentences now:`;
    }

    try {
      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: prompt,
        options: { maxTokens: 3000, temperature: 0.85 },
      });

      const responseText = result?.response || "";
      
      /** @type {GeneratedSentence[]} */
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
      
      setSentences(parsed);
      setCurrentIndex(0);
      setShowTranslation(false);
      setStarted(true);
    } catch (err) {
      console.error("Error generating content:", err);
      setError(err instanceof Error ? err.message : "Failed to generate content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [masteredVocab, numSentences, wordRange, mode, callLLM]);

  const currentSentence = sentences[currentIndex];
  const progress = sentences.length > 0 ? ((currentIndex + 1) / sentences.length) * 100 : 0;

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowTranslation(false);
    } else {
      // Last sentence - mark as finished
      setFinished(true);
    }
  };

  const handleReveal = () => {
    setShowTranslation(true);
    if (currentSentence) {
      speak(currentSentence.norwegian);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          if (!showTranslation) {
            handleReveal();
          } else if (currentIndex < sentences.length - 1) {
            handleNext();
          }
          break;
        case "Escape":
          onBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, showTranslation, currentIndex, sentences.length, onBack]);

  // Configuration screen
  if (!started) {
    return (
      <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(147, 51, 234, 0.3)", maxWidth: 500, width: "100%" }}>
          <Group justify="space-between" mb="xl">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={3} c="white">Practice Mode</Title>
            <Box w={28} />
          </Group>

          <Text c="dimmed" size="sm" mb="lg">
            Practice with your mastered vocabulary ({masteredVocab.length} words available)
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <Text c="dimmed" size="sm" mb="xs">Practice type</Text>
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
            styles={{
              root: { background: "rgba(255, 255, 255, 0.05)" },
            }}
          />

          {mode === "story" && (
            <Paper p="sm" mb="lg" style={{ background: "rgba(147, 51, 234, 0.1)", border: "1px solid rgba(147, 51, 234, 0.2)" }}>
              <Text size="sm" c="violet.3">
                📖 Story Mode generates a cohesive narrative with Norwegian characters and a beginning, middle, and end!
              </Text>
            </Paper>
          )}

          <Text c="dimmed" size="sm" mb="xs">
            {mode === "story" ? "Number of sentences in story" : "Number of sentences"}
          </Text>
          <NumberInput
            value={numSentences}
            onChange={(val) => setNumSentences(val)}
            min={mode === "story" ? 5 : 1}
            max={mode === "story" ? 15 : 20}
            mb="lg"
            styles={{
              input: { background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)", color: "white" },
            }}
          />

          <Text c="dimmed" size="sm" mb="xs">Sentence length (words): {wordRange[0]} - {wordRange[1]}</Text>
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
              variant="gradient"
              gradient={{ from: "violet", to: "grape" }}
              size="lg"
              leftSection={mode === "story" ? <IconBook size={18} /> : <IconMessages size={18} />}
              onClick={generateContent}
              loading={generating}
              disabled={masteredVocab.length < 3}
            >
              {generating ? "Generating..." : mode === "story" ? "Generate Story" : "Generate Sentences"}
            </Button>
          </Group>

          {masteredVocab.length < 3 && (
            <Text c="dimmed" size="sm" ta="center" mt="md">
              Study more cards first! You need at least 3 mastered words.
            </Text>
          )}
        </Paper>
      </Box>
    );
  }

  // Completion screen
  if (finished) {
    return (
      <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Paper p="xl" radius="lg" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(147, 51, 234, 0.3)", maxWidth: 500, width: "100%", textAlign: "center" }}>
          <Title order={2} c="white" mb="lg">
            {mode === "story" ? "📖 The End!" : "🎉 Practice Complete!"}
          </Title>
          {mode === "story" && storyTitle && (
            <Text c="violet.4" fw={500} mb="sm">"{storyTitle}"</Text>
          )}
          <Text c="dimmed" mb="xl">
            {mode === "story" 
              ? `You read a ${sentences.length}-part story!` 
              : `You practiced with ${sentences.length} sentences!`}
          </Text>
          
          <Group justify="center" gap="md">
            <Button variant="light" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
              Back
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "violet", to: "grape" }}
              leftSection={<IconRefresh size={16} />}
              onClick={() => {
                setStarted(false);
                setSentences([]);
                setCurrentIndex(0);
                setShowTranslation(false);
                setFinished(false);
                setStoryTitle("");
              }}
            >
              Generate More
            </Button>
          </Group>
        </Paper>
      </Box>
    );
  }

  // Practice screen
  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box px="md" py="sm" style={{ background: "rgba(0, 0, 0, 0.3)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Group justify="space-between" maw={800} mx="auto">
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" onClick={onBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Box>
              <Text c="white" fw={500}>
                {mode === "story" && storyTitle ? `📖 ${storyTitle}` : "Sentence Practice"}
              </Text>
              {mode === "story" && (
                <Text size="xs" c="dimmed">Story Mode</Text>
              )}
            </Box>
          </Group>
          <Text size="sm" c="dimmed">{currentIndex + 1} / {sentences.length}</Text>
        </Group>
        <Progress value={progress} color="violet" size="xs" radius={0} mt="sm" style={{ background: "rgba(255, 255, 255, 0.1)" }} />
      </Box>

      {/* Main content */}
      <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Box style={{ width: "100%", maxWidth: 600 }}>
          <Paper
            p="xl"
            radius="lg"
            style={{
              background: showTranslation 
                ? "linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.05))" 
                : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${showTranslation ? "rgba(147, 51, 234, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              minHeight: 250,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Badge variant="light" color="violet" size="sm" mb="md">
              {mode === "story" ? `Part ${currentIndex + 1}` : `Sentence ${currentIndex + 1}`}
            </Badge>

            {/* Norwegian sentence */}
            <Text
              size="1.5rem"
              fw={600}
              c="white"
              ta="center"
              mb="md"
              style={{ lineHeight: 1.5 }}
            >
              {currentSentence?.norwegian}
            </Text>

            {/* Speak button */}
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconVolume size={14} />}
              onClick={() => currentSentence && speak(currentSentence.norwegian)}
              loading={isSpeaking}
              mb="md"
            >
              Listen
            </Button>

            {/* English translation (shown after reveal) */}
            {showTranslation && (
              <>
                <Box
                  style={{
                    width: "100%",
                    height: 1,
                    background: "rgba(255, 255, 255, 0.1)",
                    margin: "1rem 0",
                  }}
                />
                <Text size="lg" c="dimmed" ta="center" mb="sm">
                  {currentSentence?.english}
                </Text>
                <Group gap="xs" justify="center">
                  {currentSentence?.vocabularyUsed.map((word, i) => (
                    <Badge key={i} variant="light" color="grape" size="sm">
                      {word}
                    </Badge>
                  ))}
                </Group>
              </>
            )}
          </Paper>

          {/* Action buttons */}
          <Group justify="center" mt="xl">
            {!showTranslation ? (
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: "violet", to: "grape" }}
                onClick={handleReveal}
              >
                Show Translation
              </Button>
            ) : currentIndex < sentences.length - 1 ? (
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: "violet", to: "grape" }}
                rightSection={<IconChevronRight size={20} />}
                onClick={handleNext}
              >
                Next Sentence
              </Button>
            ) : (
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: "violet", to: "grape" }}
                leftSection={<IconCheck size={20} />}
                onClick={handleNext}
              >
                Finish
              </Button>
            )}
          </Group>

          <Text size="xs" c="dimmed" ta="center" mt="xl">
            Press Space to reveal/next • Esc to exit
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

