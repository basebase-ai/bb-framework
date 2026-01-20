/**
 * GlobalTranslator - Dropdown translator accessible from navbar on any screen
 */
import React, { useState, useCallback } from "react";
import {
  Text,
  TextInput,
  ActionIcon,
  Group,
  Paper,
  SegmentedControl,
  Loader,
  Box,
  Stack,
  useMantineColorScheme,
} from "@mantine/core";
import { IconArrowRight, IconVolume, IconLanguage, IconX } from "@tabler/icons-react";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { useSpeech } from "../hooks/useSpeech.js";
import { useUIStore } from "../stores/uiStore.js";
import { SUPPORTED_LANGUAGES } from "../schema.js";

/**
 * @param {{ opened: boolean, onClose: () => void }} props
 */
export function GlobalTranslator({ opened, onClose }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const { user } = useAuth();
  const { speak, supported: speechSupported } = useSpeech();
  const primaryLanguage = useUIStore((s) => s.primaryLanguage);
  const sourceLanguage = primaryLanguage || "spanish";

  const [lookupText, setLookupText] = useState("");
  const [lookupDirection, setLookupDirection] = useState(
    /** @type {"toEnglish" | "fromEnglish"} */ ("fromEnglish")
  );
  const [lookupResult, setLookupResult] = useState(/** @type {string | null} */ (null));
  const [lookupLoading, setLookupLoading] = useState(false);

  const { call: callLLM } = useFunction("askLLM");

  const langInfo = SUPPORTED_LANGUAGES[sourceLanguage];
  const langName = langInfo?.name || "Spanish";
  const langFlag = langInfo?.flag || "🇪🇸";

  /**
   * Play pronunciation
   * @param {string} word
   * @param {string} [lang]
   */
  const handleSpeak = (word, lang) => {
    speak(word, lang || sourceLanguage);
  };

  /**
   * Perform quick lookup translation
   */
  const handleLookup = useCallback(async () => {
    if (!lookupText.trim() || !user) return;

    setLookupLoading(true);
    setLookupResult(null);

    try {
      const prompt =
        lookupDirection === "toEnglish"
          ? `Translate the ${langName} word or phrase "${lookupText.trim()}" to English. Reply with ONLY the translation, nothing else.`
          : `Translate the English word or phrase "${lookupText.trim()}" to ${langName}. Reply with ONLY the translation, nothing else.`;

      const result = await callLLM({
        provider: "openai",
        model: "gpt-4o-mini",
        message: prompt,
        temperature: 0.1,
      });

      setLookupResult(result?.response?.trim() || "No translation found");
    } catch {
      setLookupResult("Translation failed");
    } finally {
      setLookupLoading(false);
    }
  }, [lookupText, lookupDirection, langName, user, callLLM]);

  /**
   * Handle Enter key in lookup input
   * @param {React.KeyboardEvent} e
   */
  const handleLookupKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLookup();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  /**
   * Clear the form
   */
  const handleClear = () => {
    setLookupText("");
    setLookupResult(null);
  };

  if (!opened) return null;

  return (
    <>
      {/* Invisible overlay to catch clicks outside */}
      <Box
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <Paper
        shadow="lg"
        p="md"
        withBorder
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          width: 320,
          zIndex: 1000,
          background: isDark ? "var(--mantine-color-dark-7)" : "var(--mantine-color-white)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <IconLanguage size={18} color="var(--mantine-color-pink-6)" />
            <Text fw={600} size="sm">
              Quick Translate
            </Text>
          </Group>
          <ActionIcon variant="subtle" size="sm" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </Group>

        <SegmentedControl
          size="xs"
          fullWidth
          value={lookupDirection}
          onChange={(v) => {
            setLookupDirection(/** @type {"toEnglish" | "fromEnglish"} */ (v));
            setLookupResult(null);
          }}
          data={[
            { label: `EN → ${langFlag} ${langName}`, value: "fromEnglish" },
            { label: `${langFlag} ${langName} → EN`, value: "toEnglish" },
          ]}
        />

        <Group gap="xs" wrap="nowrap">
          <TextInput
            placeholder={
              lookupDirection === "toEnglish"
                ? `Type ${langName}...`
                : "Type English..."
            }
            size="sm"
            style={{ flex: 1 }}
            value={lookupText}
            onChange={(e) => setLookupText(e.target.value)}
            onKeyDown={handleLookupKeyDown}
            disabled={lookupLoading}
            autoFocus
          />
          <ActionIcon
            variant="filled"
            color="pink"
            size="lg"
            onClick={handleLookup}
            disabled={!lookupText.trim() || lookupLoading}
          >
            {lookupLoading ? (
              <Loader size={14} color="white" />
            ) : (
              <IconArrowRight size={18} />
            )}
          </ActionIcon>
        </Group>

        {lookupResult && (
          <Paper
            p="sm"
            withBorder
            style={{
              background: isDark
                ? "var(--mantine-color-dark-6)"
                : "var(--mantine-color-gray-0)",
            }}
          >
            <Group gap="xs" wrap="nowrap" justify="space-between">
              <Text size="sm" fw={500} style={{ flex: 1 }}>
                {lookupResult}
              </Text>
              <Group gap={4}>
                {speechSupported && (
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="gray"
                    onClick={() =>
                      handleSpeak(
                        lookupResult,
                        lookupDirection === "toEnglish" ? "english" : sourceLanguage
                      )
                    }
                  >
                    <IconVolume size={14} />
                  </ActionIcon>
                )}
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={handleClear}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        )}

        <Text size="xs" c="dimmed">
          Press Enter to translate, Esc to close
        </Text>
      </Stack>
    </Paper>
    </>
  );
}
