/**
 * ConversationChat - Interactive chat interface for language practice
 * 
 * Features:
 * - Chat with LLM in target language
 * - Click words in AI messages to translate (target → English)
 * - Lookup panel to translate English → target language for composing
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
} from "@mantine/core";
import {
  IconArrowLeft,
  IconSend,
  IconLanguage,
  IconVolume,
  IconSearch,
  IconX,
  IconMessageCircle,
} from "@tabler/icons-react";
import { useDocument } from "../../../../framework/hooks/useDocument.js";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { collections, SUPPORTED_LANGUAGES } from "../../schema.js";
import { useSpeech } from "../../hooks/useSpeech.js";

/**
 * @param {{ conversationId: string, onBack: () => void }} props
 */
export function ConversationChat({ conversationId, onBack }) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedWord, setSelectedWord] = useState(/** @type {{ word: string, translation: string | null, loading: boolean, position: { x: number, y: number } } | null} */ (null));
  const [lookupWord, setLookupWord] = useState("");
  const [lookupResult, setLookupResult] = useState(/** @type {{ word: string, translation: string } | null} */ (null));
  const [lookupLoading, setLookupLoading] = useState(false);
  
  const messagesEndRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const chatContainerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const initialMessageSent = useRef(false);
  
  // Load conversation
  const { data: conversation, loading: convoLoading, update: updateConversation } = useDocument(
    collections.conversations,
    conversationId
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
  const { speak, speaking } = useSpeech();
  const languageKey = conversation?.language || "norwegian";
  const langInfo = SUPPORTED_LANGUAGES[languageKey] || null;
  
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
        !conversation ||
        !user?.uid ||
        !messages ||
        messages.length > 0
      ) {
        return;
      }
      
      initialMessageSent.current = true;
      setSending(true);
      
      try {
        const langName = langInfo?.name || conversation.language;
        const scenario = conversation.title;
        const context = conversation.description || "";
        
        const prompt = `You are starting a conversation practice session. The scenario is: "${scenario}"
${context ? `Context: ${context}` : ""}

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
  }, [conversation, messages, messagesLoading, user?.uid, conversationId]);
  
  /**
   * Handle sending a message
   */
  const handleSend = async () => {
    if (!input.trim() || !user?.uid || !conversation) return;
    
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
      
      // Build system prompt
      const langName = langInfo?.name || conversation.language;
      const scenario = conversation.title;
      const context = conversation.description || "";
      
      const systemPrompt = `You are a helpful language practice partner. You are helping the user practice ${langName} conversation.

The scenario is: "${scenario}"
${context ? `Additional context: ${context}` : ""}

Guidelines:
- If the user's message has spelling or grammar errors, FIRST provide a correction on its own line starting with "✏️ " followed by the corrected sentence. Then add a blank line and your response.
- If the message is correct, just respond normally without any correction prefix.
- Respond ONLY in ${langName} (both corrections and responses)
- Keep responses conversational and natural
- Use vocabulary appropriate for an intermediate learner
- Keep responses relatively short (1-3 sentences) to maintain a natural conversation flow
- Stay in character for the scenario

Example with correction:
✏️ Jeg vil gjerne ha en kopp kaffe.

Selvfølgelig! Vil du ha melk eller sukker?

Example without correction (message was correct):
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
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = chatContainerRef.current?.getBoundingClientRect();
    
    setSelectedWord({
      word: cleanWord,
      translation: null,
      loading: true,
      position: {
        x: rect.left - (containerRect?.left || 0) + rect.width / 2,
        y: rect.top - (containerRect?.top || 0) - 10,
      },
    });
    
    try {
      // Translate from target language to English
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
  
  // Loading state
  if (convoLoading || (messagesLoading && !messages)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }
  
  // Not found
  if (!conversation) {
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
    <Box style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <Group mb="md" justify="space-between" style={{ flexShrink: 0 }}>
        <Group gap="md">
          <ActionIcon variant="subtle" onClick={onBack}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Box>
            <Title order={4}>{conversation.title}</Title>
            <Group gap="xs">
              <Badge variant="light" color="indigo" size="sm" leftSection={<IconLanguage size={12} />}>
                {langInfo?.name || conversation.language}
              </Badge>
              {conversation.description && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {conversation.description}
                </Text>
              )}
            </Group>
          </Box>
        </Group>
      </Group>
      
      {/* Main chat area */}
      <Box style={{ display: "flex", flex: 1, gap: "1rem", minHeight: 0, overflow: "hidden" }}>
        {/* Left column: Messages + Input */}
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
                      Write in {langInfo?.name || conversation.language} to practice.
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
              <div ref={messagesEndRef} />
            </Stack>
          
          {/* Word tooltip */}
          {selectedWord && (
            <Paper
              shadow="lg"
              p="sm"
              withBorder
              style={{
                position: "absolute",
                left: selectedWord.position.x,
                top: selectedWord.position.y,
                transform: "translate(-50%, -100%)",
                zIndex: 100,
                minWidth: 120,
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
                )}
              </Stack>
            </Paper>
          )}
          </Box>
          
          {/* Input area - fixed at bottom */}
          <Group mt="md" gap="sm" style={{ flexShrink: 0 }}>
            <Textarea
              placeholder={`Write in ${langInfo?.name || conversation.language}...`}
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
              loading={sending}
              disabled={!input.trim()}
              leftSection={<IconSend size={18} />}
            >
              Send
            </Button>
          </Group>
        </Box>
        
        {/* Lookup panel */}
        <Paper
          withBorder
          p="md"
          style={{ width: 280, flexShrink: 0, alignSelf: "flex-start" }}
        >
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
              color="indigo"
              onClick={handleLookup}
              loading={lookupLoading}
            >
              <IconSearch size={16} />
            </ActionIcon>
          </Group>
          
          {lookupResult && (
            <Paper withBorder p="sm" bg="dark.7">
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
          </Text>
        </Paper>
      </Box>
    </Box>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message, isUser, onWordClick, onSpeak, speaking }) {
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
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" c="green.4">✏️</Text>
              <Text size="xs" c="green.3" style={{ fontStyle: "italic" }}>
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
              ? "linear-gradient(135deg, var(--mantine-color-indigo-6) 0%, var(--mantine-color-violet-6) 100%)"
              : "var(--mantine-color-dark-6)",
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: !isUser ? 4 : undefined,
          }}
        >
          <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
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

