/**
 * ConversationChat - Interactive chat interface for language practice
 * 
 * Features:
 * - Chat with LLM in target language
 * - Click words in AI messages to translate (target → English)
 * - Lookup panel to translate English → target language for composing
 * - Vocabulary panel to save translated words to a flashcard deck
 * 
 * Now works with the scenario/instance model:
 * - conversationId refers to an instance (langbase_conversations)
 * - The instance has a scenarioId that links to the scenario (langbase_scenarios)
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  Box,
  Title,
  Center,
  Loader,
  Textarea,
  Paper,
  ActionIcon,
  Badge,
  Tooltip,
  TextInput,
  Divider,
  Alert,
  CloseButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconSend,
  IconLanguage,
  IconVolume,
  IconSearch,
  IconX,
  IconMessageCircle,
  IconVocabulary,
  IconAlertTriangle,
  IconPlus,
  IconCheck,
} from "@tabler/icons-react";
import { useDocument } from "../../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { collections, SUPPORTED_LANGUAGES } from "../../schema.js";
import { useSpeech } from "../../hooks/useSpeech.js";
import { VocabularyPanel } from "../reading/VocabularyPanel.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";
import { useUIStore } from "../../stores/uiStore.js";

/**
 * @param {{ conversationId: string, onBack: () => void }} props
 */
export function ConversationChat({ conversationId, onBack }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedWord, setSelectedWord] = useState(/** @type {{ word: string, translation: string | null, loading: boolean, position: { x: number, y: number }, added?: boolean, adding?: boolean } | null} */ (null));
  const [lookupWord, setLookupWord] = useState("");
  const [lookupResult, setLookupResult] = useState(/** @type {{ word: string, translation: string } | null} */ (null));
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Track if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Check screen size on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  const messagesEndRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const chatContainerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const initialMessageSent = useRef(false);
  
  // Load conversation instance
  const { data: conversation, loading: convoLoading, update: updateConversation } = useDocument(
    collections.conversations,
    conversationId
  );
  
  // Load the scenario that this conversation instance belongs to
  const { data: scenario, loading: scenarioLoading } = useDocument(
    collections.scenarios,
    conversation?.scenarioId || ""
  );
  
  // Load messages
  const messageQueryOptions = useMemo(() => ({
    where: [["conversationId", "==", conversationId]],
  }), [conversationId]);
  
  const { data: messages, loading: messagesLoading, add: addMessage } = useCollection(
    collections.messages,
    messageQueryOptions
  );
  
  // Sort messages by createdAt
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });
  }, [messages]);
  
  // LLM function
  const { call: callLLM } = useFunction("askLLM");
  
  // Speech - pass language key to speak() function
  const { speak, speaking, getVoiceInfo, availableVoices } = useSpeech();
  // Language is now stored on the conversation instance, not the scenario
  const languageKey = conversation?.language || "norwegian";
  const langInfo = SUPPORTED_LANGUAGES[languageKey] || null;
  
  // Check if voice is available for this language
  const voiceInfo = getVoiceInfo(languageKey);
  const [voiceWarningDismissed, setVoiceWarningDismissed] = useState(false);
  
  // Debug: log language being used
  useEffect(() => {
    if (conversation) {
      console.log("[ConversationChat] Conversation language field:", conversation.language);
      console.log("[ConversationChat] Using languageKey:", languageKey);
      console.log("[ConversationChat] Voice info:", voiceInfo);
    }
  }, [conversation, languageKey, voiceInfo]);
  
  // Set source language in UI store for VocabularyPanel speech
  const setSourceLanguage = useUIStore((s) => s.setSourceLanguage);
  
  useEffect(() => {
    if (languageKey) {
      setSourceLanguage(languageKey);
    }
  }, [languageKey, setSourceLanguage]);
  
  // Linked vocabulary deck
  const linkedDeckId = conversation?.linkedDeckId || null;
  
  // Translation hook - when a deck is linked, translations get added as cards
  const { translate: translateWithDeck, addToCurrentDeck, addedWords } = useTranslation(linkedDeckId);
  
  /**
   * Handle linking a deck to this conversation
   * @param {string} deckId
   */
  const handleLinkDeck = useCallback(async (deckId) => {
    await updateConversation({ linkedDeckId: deckId });
  }, [updateConversation]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages]);
  
  // Generate initial AI message when conversation is first opened
  useEffect(() => {
    const generateInitialMessage = async () => {
      if (
        initialMessageSent.current ||
        messagesLoading ||
        scenarioLoading ||
        !conversation ||
        !scenario ||
        !user?.uid ||
        !messages ||
        messages.length > 0
      ) {
        return;
      }
      
      initialMessageSent.current = true;
      setSending(true);
      
      try {
        const langName = langInfo?.name || "the target language";
        const scenarioTitle = scenario.title;
        const context = scenario.description || "";
        const scenarioQuestions = scenario.questions || [];
        
        const firstQuestion = scenarioQuestions.length > 0 
          ? `\nYour first goal is to eventually get the learner to answer: "${scenarioQuestions[0]}"`
          : "";
        
        const prompt = `You are starting a conversation practice session. The scenario is: "${scenarioTitle}"
${context ? `Context: ${context}` : ""}
${firstQuestion}

You are playing a role in this scenario (e.g., a shopkeeper, a friend, a colleague, etc.).
Start the conversation naturally in ${langName} with a greeting or opening line appropriate to the scenario.
Keep it short (1-2 sentences). Only respond in ${langName}.`;

        const result = await callLLM({
          provider: "openai",
          model: "gpt-4o-mini",
          message: prompt,
          temperature: 0.8,
        });
        
        if (result?.response) {
          await addMessage({
            conversationId,
            role: "assistant",
            content: result.response,
            owner: user.uid,
          });
          
          await updateConversation({
            messageCount: 1,
            lastMessageAt: new Date(),
          });
        }
      } catch (err) {
        console.error("Failed to generate initial message:", err);
        initialMessageSent.current = false; // Allow retry
      }
      
      setSending(false);
    };
    
    generateInitialMessage();
  }, [conversation, scenario, scenarioLoading, messages, messagesLoading, user?.uid, conversationId]);
  
  /**
   * Handle sending a message
   */
  const handleSend = async () => {
    if (!input.trim() || !user?.uid || !conversation || !scenario) return;
    
    const userMessage = input.trim();
    setInput("");
    setSending(true);
    
    try {
      // Add user message
      await addMessage({
        conversationId,
        role: "user",
        content: userMessage,
        owner: user.uid,
      });
      
      // Build conversation history for LLM
      const history = sortedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: "user", content: userMessage });
      
      // Build system prompt using scenario details
      const langName = langInfo?.name || "the target language";
      const scenarioTitle = scenario.title;
      const context = scenario.description || "";
      const scenarioQuestions = scenario.questions || [];
      
      // Build questions section for the prompt
      const questionsSection = scenarioQuestions.length > 0
        ? `
CONVERSATION GOALS:
You should naturally try to get the learner to answer these questions during the conversation (in order when possible):
${scenarioQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

After you feel the learner has adequately answered a question (or after a few exchanges on that topic), smoothly transition to the next question. Don't rush - let the conversation flow naturally, but gently guide it to cover these topics.`
        : "";
      
      const systemPrompt = `You are a helpful language practice partner. You are helping the user practice ${langName} conversation.

The scenario is: "${scenarioTitle}"
${context ? `Additional context: ${context}` : ""}
${questionsSection}

Guidelines:
- ONLY if the user's message has actual spelling mistakes, grammar errors, or incorrect word usage, provide a correction on its own line starting with "✏️ " followed by the corrected sentence. Then add a blank line and your response.
- Do NOT provide a correction if the user's message is understandable and grammatically acceptable, even if you might phrase it differently. Only correct actual errors where specific characters or words need to change.
- If the message is correct or acceptable, just respond normally without any correction prefix.
- Respond ONLY in ${langName} (both corrections and responses)
- Keep responses conversational and natural
- Use vocabulary appropriate for an intermediate learner
- IMPORTANT: Keep responses very short - ideally 1 sentence, under 15 words. This maintains a natural back-and-forth conversation pace.
- Stay in character for the scenario
- Ask questions to keep the conversation going and encourage the learner to practice

Example with correction (actual spelling error):
✏️ Jeg vil gjerne ha en kopp kaffe.

Selvfølgelig! Vil du ha melk eller sukker?

Example without correction (message was correct or acceptable):
Selvfølgelig! Vil du ha melk eller sukker?`;

      // Call LLM
      const response = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
        ],
      });
      
      // Add assistant message
      if (response?.response) {
        await addMessage({
          conversationId,
          role: "assistant",
          content: response.response,
          owner: user.uid,
        });
        
        // Update conversation metadata
        await updateConversation({
          messageCount: (conversation.messageCount || 0) + 2,
          lastMessageAt: new Date(),
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    
    setSending(false);
  };
  
  /**
   * Handle word click in AI message
   * @param {React.MouseEvent} e
   * @param {string} word
   */
  const handleWordClick = async (e, word) => {
    e.stopPropagation();
    
    // Clean the word
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, "").trim();
    if (!cleanWord) return;
    
    // Use viewport coordinates for fixed positioning
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = rect.left + rect.width / 2;
    const posY = rect.top;
    
    setSelectedWord({
      word: cleanWord,
      translation: null,
      loading: true,
      position: {
        x: posX,
        y: posY,
      },
    });
    
    try {
      // If deck is linked, use the translation hook (which adds to deck)
      if (linkedDeckId && langInfo) {
        const result = await translateWithDeck(cleanWord, langInfo.code);
        setSelectedWord((prev) =>
          prev?.word === cleanWord
            ? { ...prev, translation: result?.translation || "Translation failed", loading: false }
            : prev
        );
      } else {
        // No deck linked - just translate without saving
        const prompt = `Translate the ${langInfo?.name || "Norwegian"} word or phrase "${cleanWord}" to English. Only respond with the translation, nothing else.`;
        const result = await callLLM({
          provider: "openai",
          model: "gpt-4o-mini",
          message: prompt,
          temperature: 0.1,
        });
        
        setSelectedWord((prev) =>
          prev?.word === cleanWord
            ? { ...prev, translation: result?.response || "Translation failed", loading: false }
            : prev
        );
      }
    } catch (err) {
      setSelectedWord((prev) =>
        prev?.word === cleanWord
          ? { ...prev, translation: "Translation failed", loading: false }
          : prev
      );
    }
  };
  
  /**
   * Handle English → target language lookup
   */
  const handleLookup = async () => {
    if (!lookupWord.trim() || !langInfo) return;
    
    setLookupLoading(true);
    setLookupResult(null);
    
    try {
      const prompt = `Translate the English word or phrase "${lookupWord.trim()}" to ${langInfo.name}. Only respond with the translation, nothing else.`;
      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: prompt,
        temperature: 0.1,
      });
      
      setLookupResult({
        word: lookupWord.trim(),
        translation: result?.response || "Translation failed",
      });
    } catch (err) {
      setLookupResult({
        word: lookupWord.trim(),
        translation: "Translation failed",
      });
    }
    
    setLookupLoading(false);
  };
  
  /**
   * Speak text in the conversation's language
   * @param {string} text
   */
  const handleSpeak = (text) => {
    speak(text, languageKey);
  };
  
  /**
   * Clear word selection when clicking outside
   */
  const handleContainerClick = () => {
    setSelectedWord(null);
  };

  /**
   * Handle text selection (highlight a phrase)
   */
  const handleTextSelection = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;

    // Check if selection is within our chat container
    if (!chatContainerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!chatContainerRef.current.contains(range.commonAncestorContainer)) return;

    // Get position for tooltip
    const rect = range.getBoundingClientRect();
    const posX = rect.left + rect.width / 2;
    const posY = rect.top;

    setSelectedWord({
      word: selectedText,
      translation: null,
      loading: true,
      position: { x: posX, y: posY },
    });

    try {
      // Translate the selection
      if (linkedDeckId && langInfo) {
        const result = await translateWithDeck(selectedText, langInfo.code);
        setSelectedWord((prev) =>
          prev?.word === selectedText
            ? { ...prev, translation: result?.translation || "Translation failed", loading: false }
            : prev
        );
      } else {
        const prompt = `Translate the ${langInfo?.name || "Norwegian"} phrase "${selectedText}" to English. Only respond with the translation, nothing else.`;
        const result = await callLLM({
          provider: "openai",
          model: "gpt-4o-mini",
          message: prompt,
          temperature: 0.1,
        });
        setSelectedWord((prev) =>
          prev?.word === selectedText
            ? { ...prev, translation: result?.response || "Translation failed", loading: false }
            : prev
        );
      }
    } catch {
      setSelectedWord((prev) =>
        prev?.word === selectedText
          ? { ...prev, translation: "Translation failed", loading: false }
          : prev
      );
    }

    // Clear the selection
    selection.removeAllRanges();
  }, [langInfo, linkedDeckId, translateWithDeck, callLLM]);

  // Listen for mouseup to detect text selection
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(() => {
        handleTextSelection();
      }, 10);
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener("mouseup", handleMouseUp);
      return () => container.removeEventListener("mouseup", handleMouseUp);
    }
  }, [handleTextSelection]);
  
  // Loading state - also wait for scenario if conversation has a scenarioId
  const waitingForScenario = conversation?.scenarioId && !scenario && !scenarioLoading;
  if (convoLoading || scenarioLoading || waitingForScenario || (messagesLoading && !messages)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }
  
  // Not found - only show if we're definitely not loading and data is missing
  if (!conversation || !scenario) {
    return (
      <Stack align="center" py="xl" gap="md">
        <Text c="dimmed">Conversation not found.</Text>
        <Button onClick={onBack} variant="light">
          Go Back
        </Button>
      </Stack>
    );
  }
  
  return (
    <>
    <Box style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      {/* Header - compact layout */}
      <Group mb="sm" justify="space-between" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <ActionIcon variant="subtle" onClick={onBack} size="sm">
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
            {scenario.title}
          </Text>
          <Badge variant="light" color="pink" size="xs">
            {langInfo?.name || scenario.language}
          </Badge>
        </Group>
        
        {/* Toggle sidebar button - mobile only */}
        {isMobile && (
          <Button
            variant={showMobileSidebar ? "filled" : "light"}
            color="pink"
            size="xs"
            leftSection={<IconVocabulary size={14} />}
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {showMobileSidebar ? "Hide" : "Tools"}
          </Button>
        )}
      </Group>
      
      {/* Voice not available warning */}
      {availableVoices.length > 0 && !voiceInfo.hasVoice && !voiceWarningDismissed && (
        <Alert 
          variant="light" 
          color="yellow" 
          icon={<IconAlertTriangle size={16} />}
          withCloseButton
          onClose={() => setVoiceWarningDismissed(true)}
          p="xs"
        >
          <Text size="xs">
            <strong>Audio not available for {langInfo?.name || "this language"}.</strong>{" "}
            Your browser doesn't have a {langInfo?.name} voice installed.
          </Text>
          <Text size="xs" mt={4} c="dimmed">
            <strong>To fix:</strong> On macOS, go to System Settings → Accessibility → Spoken Content → System Voice → Manage Voices, 
            then download a {langInfo?.name} voice. On Windows, go to Settings → Time & Language → Speech → Add voices.
          </Text>
        </Alert>
      )}
      
      {/* Main chat area */}
      <Box style={{ display: "flex", flex: 1, gap: isMobile ? 0 : "1rem", minHeight: 0, overflow: "hidden" }}>
        {/* Messages + Input */}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Messages - scrollable area */}
          <Box
            ref={chatContainerRef}
            style={{ flex: 1, position: "relative", overflow: "auto", minHeight: 0 }}
            onClick={handleContainerClick}
          >
            <Stack gap="md" p="md">
              {sortedMessages.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="sm">
                    <IconMessageCircle size={48} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" ta="center">
                      Start the conversation!<br />
                      Write in {langInfo?.name || scenario.language} to practice.
                    </Text>
                  </Stack>
                </Center>
              ) : (
                sortedMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isUser={msg.role === "user"}
                    onWordClick={msg.role === "assistant" ? handleWordClick : undefined}
                    onSpeak={() => handleSpeak(msg.content)}
                    speaking={speaking}
                  />
                ))
              )}
              {/* Typing indicator while AI is thinking */}
              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>
          
          {/* Input area - fixed at bottom */}
          <Group mt="sm" gap="sm" style={{ flexShrink: 0 }}>
            <Textarea
              placeholder={`Write in ${langInfo?.name || scenario.language}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ flex: 1 }}
              minRows={1}
              maxRows={3}
              autosize
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              leftSection={<IconSend size={16} />}
              size="sm"
            >
              Send
            </Button>
          </Group>
        </Box>
        
        {/* Desktop sidebar - always visible */}
        {!isMobile && (
          <Stack style={{ width: 280, flexShrink: 0 }} gap="sm">
            {/* Lookup panel */}
            <Paper withBorder p="md">
              <Text fw={600} size="sm" mb="sm">
                <IconSearch size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                English → {langInfo?.name || "Target"}
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Look up words to help compose your message
              </Text>
              
              <Group gap="xs" mb="md">
                <TextInput
                  placeholder="Type English word..."
                  value={lookupWord}
                  onChange={(e) => setLookupWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <ActionIcon
                  variant="light"
                  color="pink"
                  onClick={handleLookup}
                  loading={lookupLoading}
                >
                  <IconSearch size={16} />
                </ActionIcon>
              </Group>
              
              {lookupResult && (
                <Paper withBorder p="sm">
                  <Text size="xs" c="dimmed">
                    {lookupResult.word}
                  </Text>
                  <Group gap="xs" mt="xs">
                    <Text fw={600}>{lookupResult.translation}</Text>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={() => handleSpeak(lookupResult.translation)}
                    >
                      <IconVolume size={12} />
                    </ActionIcon>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="pink"
                    mt="xs"
                    onClick={() => {
                      setInput((prev) => prev + (prev ? " " : "") + lookupResult.translation);
                      setLookupResult(null);
                      setLookupWord("");
                    }}
                  >
                    Insert into message
                  </Button>
                </Paper>
              )}
              
              <Divider my="md" />
              
              <Text size="xs" c="dimmed">
                <strong>Tip:</strong> Click any word in the AI's messages to see its English translation.
                {linkedDeckId && " Words are saved to your deck!"}
              </Text>
            </Paper>
            
            {/* Vocabulary panel */}
            <Box style={{ flex: 1, minHeight: 200 }}>
              <VocabularyPanel 
                linkedDeckId={linkedDeckId}
                onLinkDeck={handleLinkDeck}
                context="conversation"
              />
            </Box>
          </Stack>
        )}
      </Box>
      
      {/* Mobile sidebar - slide-in drawer */}
      {isMobile && showMobileSidebar && (
        <>
          {/* Backdrop overlay */}
          <Box
            onClick={() => setShowMobileSidebar(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 199,
            }}
          />
          <Stack 
            gap="sm"
            style={{ 
              width: 300, 
              maxWidth: "90vw",
              background: isDark ? "var(--mantine-color-dark-7)" : "var(--mantine-color-white)",
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 200,
              padding: "1rem",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
              overflowY: "auto",
            }}
          >
            {/* Header with close button */}
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Translation Tools</Text>
              <ActionIcon 
                variant="subtle" 
                onClick={() => setShowMobileSidebar(false)}
                size="sm"
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
            
            {/* Lookup panel */}
            <Paper withBorder p="md">
              <Text fw={600} size="sm" mb="sm">
                <IconSearch size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                English → {langInfo?.name || "Target"}
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Look up words to help compose your message
              </Text>
              
              <Group gap="xs" mb="md">
                <TextInput
                  placeholder="Type English word..."
                  value={lookupWord}
                  onChange={(e) => setLookupWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <ActionIcon
                  variant="light"
                  color="pink"
                  onClick={handleLookup}
                  loading={lookupLoading}
                >
                  <IconSearch size={16} />
                </ActionIcon>
              </Group>
              
              {lookupResult && (
                <Paper withBorder p="sm">
                  <Text size="xs" c="dimmed">
                    {lookupResult.word}
                  </Text>
                  <Group gap="xs" mt="xs">
                    <Text fw={600}>{lookupResult.translation}</Text>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={() => handleSpeak(lookupResult.translation)}
                    >
                      <IconVolume size={12} />
                    </ActionIcon>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="pink"
                    mt="xs"
                    onClick={() => {
                      setInput((prev) => prev + (prev ? " " : "") + lookupResult.translation);
                      setLookupResult(null);
                      setLookupWord("");
                    }}
                  >
                    Insert into message
                  </Button>
                </Paper>
              )}
              
              <Divider my="md" />
              
              <Text size="xs" c="dimmed">
                <strong>Tip:</strong> Click any word in the AI's messages to see its English translation.
                {linkedDeckId && " Words are saved to your deck!"}
              </Text>
            </Paper>
            
            {/* Vocabulary panel */}
            <Box style={{ flex: 1, minHeight: 200 }}>
              <VocabularyPanel 
                linkedDeckId={linkedDeckId}
                onLinkDeck={handleLinkDeck}
                context="conversation"
              />
            </Box>
          </Stack>
        </>
      )}
      
    </Box>
    
    {/* Word tooltip - rendered outside all containers with fixed positioning */}
    {selectedWord && (
      <Paper
        shadow="lg"
        p="sm"
        withBorder
        style={{
          position: "fixed",
          left: selectedWord.position.x,
          top: selectedWord.position.y,
          transform: "translate(-50%, -100%)",
          zIndex: 10000,
          minWidth: 150,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap="xs">
          <Group justify="space-between" gap="xs">
            <Text fw={600} size="sm">
              {selectedWord.word}
            </Text>
            <ActionIcon size="xs" variant="subtle" onClick={() => setSelectedWord(null)}>
              <IconX size={12} />
            </ActionIcon>
          </Group>
          {selectedWord.loading ? (
            <Loader size="xs" />
          ) : (
            <>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  {selectedWord.translation}
                </Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => handleSpeak(selectedWord.word)}
                >
                  <IconVolume size={12} />
                </ActionIcon>
              </Group>
              {/* Add to deck button */}
              {linkedDeckId && selectedWord.translation && (
                <Button
                  size="xs"
                  variant={selectedWord.added || addedWords.has(selectedWord.word.toLowerCase()) ? "light" : "subtle"}
                  color={selectedWord.added || addedWords.has(selectedWord.word.toLowerCase()) ? "green" : "pink"}
                  leftSection={selectedWord.added || addedWords.has(selectedWord.word.toLowerCase()) ? <IconCheck size={12} /> : <IconPlus size={12} />}
                  onClick={async () => {
                    if (selectedWord.added || addedWords.has(selectedWord.word.toLowerCase())) return;
                    setSelectedWord((prev) => prev ? { ...prev, adding: true } : null);
                    const success = await addToCurrentDeck(selectedWord.word, selectedWord.translation);
                    setSelectedWord((prev) => prev ? { ...prev, adding: false, added: success } : null);
                  }}
                  loading={selectedWord.adding}
                  disabled={selectedWord.added || addedWords.has(selectedWord.word.toLowerCase())}
                  fullWidth
                >
                  {selectedWord.added || addedWords.has(selectedWord.word.toLowerCase()) ? "Added" : "Add to deck"}
                </Button>
              )}
            </>
          )}
        </Stack>
      </Paper>
    )}
    </>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message, isUser, onWordClick, onSpeak, speaking }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  /**
   * Parse message content to extract correction (if any) and main response
   * @param {string} content
   * @returns {{ correction: string | null, response: string }}
   */
  const parseContent = (content) => {
    if (isUser || !content.startsWith("✏️")) {
      return { correction: null, response: content };
    }
    
    // Find the first blank line that separates correction from response
    const parts = content.split(/\n\n/);
    if (parts.length >= 2) {
      const correction = parts[0].replace(/^✏️\s*/, "").trim();
      const response = parts.slice(1).join("\n\n").trim();
      return { correction, response };
    }
    
    // No clear separation - treat as just response
    return { correction: null, response: content.replace(/^✏️\s*/, "") };
  };
  
  const { correction, response } = parseContent(message.content);
  
  /**
   * Render clickable words
   * @param {string} text
   */
  const renderClickableText = (text) => {
    if (!onWordClick) return text;
    
    // Split by whitespace while preserving punctuation attached to words
    const words = text.split(/(\s+)/);
    
    return words.map((word, i) => {
      // If it's whitespace, render as-is
      if (/^\s+$/.test(word)) return word;
      
      return (
        <span
          key={i}
          onClick={(e) => onWordClick(e, word)}
          style={{
            cursor: "pointer",
            borderRadius: 2,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {word}
        </span>
      );
    });
  };
  
  return (
    <Box
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <Stack gap={4} style={{ maxWidth: "75%" }}>
        {/* Correction notice (if any) */}
        {correction && (
          <Paper
            p="xs"
            radius="md"
            style={{
              background: "rgba(233, 69, 96, 0.1)",
              border: "1px solid rgba(233, 69, 96, 0.25)",
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" c="pink.5">✏️</Text>
              <Text size="xs" c="pink.6" style={{ fontStyle: "italic" }}>
                {renderClickableText(correction)}
              </Text>
            </Group>
          </Paper>
        )}
        
        {/* Main message bubble */}
        <Paper
          p="sm"
          radius="lg"
          style={{
            background: isUser
              ? "var(--mantine-color-pink-6)"
              : isDark ? "var(--mantine-color-dark-6)" : "var(--mantine-color-gray-1)",
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: !isUser ? 4 : undefined,
          }}
        >
          <Text size="sm" c={isUser ? "white" : undefined} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {isUser ? message.content : renderClickableText(response)}
          </Text>
          {!isUser && (
            <Group justify="flex-end" mt="xs">
              <Tooltip label="Listen">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpeak?.();
                  }}
                  loading={speaking}
                >
                  <IconVolume size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}

/**
 * Typing indicator - animated dots shown while AI is generating a response
 */
function TypingIndicator() {
  return (
    <Box style={{ display: "flex", justifyContent: "flex-start" }}>
      <Paper
        p="xs"
        radius="md"
        style={{
          background: "var(--mantine-color-default)",
          border: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Group gap={3}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--mantine-color-dimmed)",
                animation: "typing-bounce 1.4s infinite ease-in-out",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </Group>
        <style>{`
          @keyframes typing-bounce {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.4;
            }
            30% {
              transform: translateY(-3px);
              opacity: 1;
            }
          }
        `}</style>
      </Paper>
    </Box>
  );
}
