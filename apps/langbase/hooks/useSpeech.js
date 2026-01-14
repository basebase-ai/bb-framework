/**
 * Custom hook for text-to-speech using browser's Web Speech API
 */
import { useCallback, useState, useEffect } from "react";
import { SUPPORTED_LANGUAGES } from "../schema.js";

/**
 * @typedef {Object} SpeechState
 * @property {boolean} speaking - Whether speech is currently playing
 * @property {boolean} supported - Whether speech synthesis is supported
 * @property {boolean} hasVoice - Whether a voice for the language is available
 * @property {(text: string, languageKey: string) => void} speak - Speak the text
 * @property {() => void} stop - Stop speaking
 */

/**
 * Hook for text-to-speech functionality
 * @returns {SpeechState}
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState(
    /** @type {SpeechSynthesisVoice[]} */ ([])
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);

      // Get voices (may need to wait for them to load)
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };

      loadVoices();

      // Chrome loads voices async
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  /**
   * Find the best voice for a language
   * @param {string} languageKey - Key from SUPPORTED_LANGUAGES
   * @returns {SpeechSynthesisVoice | null}
   */
  const findVoice = useCallback(
    (languageKey) => {
      const langConfig = SUPPORTED_LANGUAGES[languageKey];
      if (!langConfig || availableVoices.length === 0) return null;

      const speechCode = langConfig.speechCode;
      const langCode = langConfig.code;

      // Try to find exact match first
      let voice = availableVoices.find((v) => v.lang === speechCode);

      // Try partial match (e.g., "nb" matches "nb-NO")
      if (!voice) {
        voice = availableVoices.find(
          (v) => v.lang.startsWith(langCode) || v.lang.startsWith(speechCode.split("-")[0])
        );
      }

      // For Norwegian, also try "no-NO" variant
      if (!voice && languageKey === "norwegian") {
        voice = availableVoices.find(
          (v) => v.lang === "no-NO" || v.lang.startsWith("no")
        );
      }

      return voice || null;
    },
    [availableVoices]
  );

  /**
   * Speak text in the specified language
   * @param {string} text - Text to speak
   * @param {string} languageKey - Key from SUPPORTED_LANGUAGES
   */
  const speak = useCallback(
    (text, languageKey) => {
      if (!supported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const langConfig = SUPPORTED_LANGUAGES[languageKey];
      const voice = findVoice(languageKey);

      // Debug logging for troubleshooting
      if (process.env.NODE_ENV === "development") {
        console.log("[Speech] Language key:", languageKey);
        console.log("[Speech] Lang config:", langConfig);
        console.log("[Speech] Found voice:", voice?.name, voice?.lang);
        console.log("[Speech] Available voices:", availableVoices.length);
      }

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else if (langConfig) {
        // No voice found - set lang property and try to find ANY voice for this language
        utterance.lang = langConfig.speechCode;
        
        // Try to find a voice that matches the language code prefix
        const fallbackVoice = availableVoices.find(
          (v) => v.lang.toLowerCase().startsWith(langConfig.code.toLowerCase())
        );
        if (fallbackVoice) {
          utterance.voice = fallbackVoice;
          utterance.lang = fallbackVoice.lang;
          if (process.env.NODE_ENV === "development") {
            console.log("[Speech] Using fallback voice:", fallbackVoice.name);
          }
        }
      }

      utterance.rate = 0.9; // Slightly slower for learning
      utterance.pitch = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = (e) => {
        console.error("[Speech] Error:", e);
        setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [supported, findVoice, availableVoices]
  );

  /**
   * Stop speaking
   */
  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [supported]);

  /**
   * Check if a voice is available for a language
   * @param {string} languageKey
   * @returns {boolean}
   */
  const hasVoiceForLanguage = useCallback(
    (languageKey) => {
      return findVoice(languageKey) !== null;
    },
    [findVoice]
  );

  return {
    speaking,
    supported,
    availableVoices,
    speak,
    stop,
    hasVoiceForLanguage,
    /**
     * Get diagnostic info for a language
     * @param {string} languageKey
     * @returns {{ hasVoice: boolean, voiceName: string | null, voiceLang: string | null }}
     */
    getVoiceInfo: (languageKey) => {
      const voice = findVoice(languageKey);
      return {
        hasVoice: voice !== null,
        voiceName: voice?.name || null,
        voiceLang: voice?.lang || null,
      };
    },
  };
}


