/**
 * WordTooltip - Floating tooltip showing translation and pronunciation controls
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Paper,
  Stack,
  Text,
  ActionIcon,
  Group,
  Loader,
  Box,
  useMantineColorScheme,
} from "@mantine/core";
import { IconVolume, IconX } from "@tabler/icons-react";
import { useSpeech } from "../../hooks/useSpeech.js";
import { useUIStore } from "../../stores/uiStore.js";

/**
 * @param {{ onClose: () => void }} props
 */
export function WordTooltip({ onClose }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  
  const selectedWord = useUIStore((s) => s.selectedWord);
  const sourceLanguage = useUIStore((s) => s.sourceLanguage);
  const { speak, speaking, supported } = useSpeech();
  const tooltipRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [adjustedPosition, setAdjustedPosition] = useState(/** @type {{ top: number, left: number } | null} */ (null));

  // Handle click outside - use a small delay to prevent immediate dismissal on mobile
  useEffect(() => {
    let mounted = true;
    
    const handleClickOutside = (e) => {
      // Small delay to allow tooltip to render and position itself
      setTimeout(() => {
        if (mounted && tooltipRef.current && !tooltipRef.current.contains(e.target)) {
          onClose();
        }
      }, 50);
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Delay adding listeners to prevent immediate close on touch
    const timer = setTimeout(() => {
      if (mounted) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Reset position when word changes
  useEffect(() => {
    setAdjustedPosition(null);
  }, [selectedWord?.word, selectedWord?.position?.x, selectedWord?.position?.y]);

  // Adjust position after render to ensure tooltip stays on screen
  useEffect(() => {
    if (tooltipRef.current && selectedWord?.position) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const padding = 10;

      let top = selectedWord.position.y + padding;
      let left = selectedWord.position.x;

      // If tooltip would go off bottom, position it above the word instead
      if (top + rect.height > viewportHeight - padding) {
        // Position above - need to account for the word height (approx 24px)
        top = selectedWord.position.y - rect.height - 24 - padding;
        
        // If still off screen (very top), just clamp to viewport
        if (top < padding) {
          top = padding;
        }
      }

      // Ensure it doesn't go off the right edge
      if (left + rect.width > viewportWidth - padding) {
        left = viewportWidth - rect.width - padding;
      }

      // Ensure it doesn't go off the left edge
      if (left < padding) {
        left = padding;
      }

      setAdjustedPosition({ top, left });
    }
  }, [selectedWord?.position, selectedWord?.translation, selectedWord?.loading]);

  if (!selectedWord) return null;

  const { word, translation, position, loading, error } = selectedWord;

  // Calculate initial tooltip position, will be adjusted after render
  // Use safe defaults that work on mobile - center horizontally if no adjusted position yet
  const safeLeft = adjustedPosition?.left ?? Math.max(10, Math.min(position.x, window.innerWidth - 280));
  const safeTop = adjustedPosition?.top ?? Math.max(10, Math.min(position.y + 10, window.innerHeight - 200));
  
  const tooltipStyle = {
    position: /** @type {const} */ ("fixed"),
    left: safeLeft,
    top: safeTop,
    zIndex: 10000, // Higher z-index for mobile
    maxWidth: Math.min(260, window.innerWidth - 20),
    minWidth: Math.min(180, window.innerWidth - 20),
  };

  const handleSpeak = () => {
    speak(word, sourceLanguage);
  };

  return (
    <Paper
      ref={tooltipRef}
      shadow="xl"
      p="md"
      radius="md"
      style={{
        ...tooltipStyle,
        background: isDark ? "var(--mantine-color-dark-7)" : "var(--mantine-color-white)",
      }}
      withBorder
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={700} size="lg" c="pink.4">
            {word}
          </Text>
          <Group gap="xs">
            {supported && (
              <ActionIcon
                variant="subtle"
                color="pink"
                onClick={handleSpeak}
                loading={speaking}
                title="Play pronunciation"
              >
                <IconVolume size={18} />
              </ActionIcon>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onClose}
              title="Close"
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {loading ? (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">
              Translating...
            </Text>
          </Group>
        ) : error ? (
          <Text size="sm" c="red.4">
            {error}
          </Text>
        ) : translation ? (
          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              English
            </Text>
            <Text size="md" fw={500}>
              {translation}
            </Text>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}


