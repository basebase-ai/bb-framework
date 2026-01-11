/**
 * QuickTranslate - Bidirectional translation lookup panel
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
} from "@mantine/core";
import { IconArrowRight, IconVolume } from "@tabler/icons-react";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { useFunction } from "../../../../framework/hooks/useFunction.js";
import { useSpeech } from "../../hooks/useSpeech.js";
import { useUIStore } from "../../stores/uiStore.js";
import { SUPPORTED_LANGUAGES } from "../../schema.js";

export function QuickTranslate() {
  const { user } = useAuth();
  const { speak, supported: speechSupported } = useSpeech();
  const sourceLanguage = useUIStore((s) => s.sourceLanguage);

  const [lookupText, setLookupText] = useState("");
  const [lookupDirection, setLookupDirection] = useState(
    /** @type {"toEnglish" | "fromEnglish"} */ ("toEnglish")
  );
  const [lookupResult, setLookupResult] = useState(/** @type {string | null} */ (null));
  const [lookupLoading, setLookupLoading] = useState(false);

  const { call: callLLM } = useFunction("askLLM");

  const langName = SUPPORTED_LANGUAGES[sourceLanguage]?.name || "Norwegian";

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
  };

  return (
    <Paper
      p="sm"
      withBorder
      style={{
        background: "var(--mantine-color-dark-7)",
        borderColor: "var(--mantine-color-dark-5)",
      }}
    >
      <Text fw={600} size="sm" mb="xs">
        Quick Translate
      </Text>
      <SegmentedControl
        size="xs"
        fullWidth
        mb="xs"
        value={lookupDirection}
        onChange={(v) => setLookupDirection(/** @type {"toEnglish" | "fromEnglish"} */ (v))}
        data={[
          { label: `${langName} → EN`, value: "toEnglish" },
          { label: `EN → ${langName}`, value: "fromEnglish" },
        ]}
      />
      <Group gap="xs" wrap="nowrap">
        <TextInput
          placeholder={lookupDirection === "toEnglish" ? `Type ${langName}...` : "Type English..."}
          size="xs"
          style={{ flex: 1 }}
          value={lookupText}
          onChange={(e) => setLookupText(e.target.value)}
          onKeyDown={handleLookupKeyDown}
          disabled={lookupLoading}
        />
        <ActionIcon
          variant="filled"
          color="pink"
          size="md"
          onClick={handleLookup}
          disabled={!lookupText.trim() || lookupLoading}
        >
          {lookupLoading ? <Loader size={14} color="white" /> : <IconArrowRight size={16} />}
        </ActionIcon>
      </Group>
      {lookupResult && (
        <Group gap="xs" mt="xs" wrap="nowrap">
          <Text size="sm" c="green.4" style={{ flex: 1 }}>
            {lookupResult}
          </Text>
          {speechSupported && (
            <ActionIcon
              variant="subtle"
              size="xs"
              color="gray"
              onClick={() =>
                handleSpeak(lookupResult, lookupDirection === "toEnglish" ? "english" : sourceLanguage)
              }
            >
              <IconVolume size={12} />
            </ActionIcon>
          )}
        </Group>
      )}
    </Paper>
  );
}


