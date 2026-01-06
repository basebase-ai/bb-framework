/**
 * Custom hook for word translation
 * Uses cloud function with localStorage caching and saves to vocabulary database
 */
import { useState, useCallback, useMemo } from "react";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";

const CACHE_KEY = "readtolearn_translations";

/**
 * @typedef {Object} TranslationResult
 * @property {string} word - Original word
 * @property {string} translation - Translated word
 * @property {boolean} fromCache - Whether result came from cache
 */

/**
 * @typedef {Object} CachedTranslation
 * @property {string} translation - The translation
 * @property {number} lookupCount - Number of times looked up
 * @property {number} lastUsed - Timestamp of last use
 */

/**
 * Get language name from code
 * @param {string} code
 * @returns {string}
 */
function getLanguageName(code) {
  const names = {
    no: "Norwegian",
    sv: "Swedish",
    da: "Danish",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    nl: "Dutch",
    pt: "Portuguese",
  };
  return names[code] || code;
}

/**
 * Get cache from localStorage
 * @returns {Record<string, CachedTranslation>}
 */
function getCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save cache to localStorage
 * @param {Record<string, CachedTranslation>} cache
 */
function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Generate cache key for a word
 * @param {string} word
 * @param {string} sourceLanguage
 * @param {string} [context]
 * @returns {string}
 */
function getCacheKey(word, sourceLanguage, context) {
  const base = `${sourceLanguage}:${word.toLowerCase().trim()}`;
  // Include context hash for context-dependent translations
  if (context) {
    // Simple hash of context to differentiate same word in different contexts
    const contextHash = context.slice(0, 50).replace(/\s+/g, "_");
    return `${base}:${contextHash}`;
  }
  return base;
}

/**
 * Hook for translating words with localStorage caching and database storage
 * @returns {{ translate: (word: string, sourceLanguage: string, context?: string) => Promise<TranslationResult>, loading: boolean, error: string | null }}
 */
export function useTranslation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  // Cloud function for LLM translation
  const { call: callLLM } = useFunction("askLLM");

  // Memoize query options to prevent infinite re-renders
  const vocabQueryOptions = useMemo(
    () => ({
      where: user ? [["owner", "==", user.uid]] : [],
    }),
    [user?.uid]
  );

  // Vocabulary collection for database storage
  const { data: vocabulary, add: addVocab, update: updateVocab } = useCollection(
    collections.vocabulary,
    vocabQueryOptions
  );

  /**
   * Translate a word
   * @param {string} word - Word to translate
   * @param {string} sourceLanguage - Source language code (e.g., "no" for Norwegian)
   * @param {string} [context] - Optional context (surrounding words)
   * @returns {Promise<TranslationResult>}
   */
  const translate = useCallback(
    async (word, sourceLanguage, context) => {
      if (!word || !user) {
        throw new Error("Word and authentication required");
      }

      const normalizedWord = word.toLowerCase().trim();
      setError(null);

      // Check localStorage cache first (fastest)
      const cacheKey = getCacheKey(normalizedWord, sourceLanguage, context);
      const cache = getCache();
      const cached = cache[cacheKey];

      if (cached) {
        // Update lookup count and last used in localStorage
        cache[cacheKey] = {
          ...cached,
          lookupCount: cached.lookupCount + 1,
          lastUsed: Date.now(),
        };
        saveCache(cache);

        // Also update lookup count in database (fire and forget)
        const dbEntry = vocabulary?.find(
          (v) => v.word.toLowerCase() === normalizedWord && v.sourceLanguage === sourceLanguage
        );
        if (dbEntry) {
          updateVocab(dbEntry.id, { lookupCount: (dbEntry.lookupCount || 0) + 1 }).catch(() => {});
        }

        return {
          word: normalizedWord,
          translation: cached.translation,
          fromCache: true,
        };
      }

      // Call translation via LLM
      setLoading(true);

      try {
        const langName = getLanguageName(sourceLanguage);

        // Build prompt with or without context
        let prompt;
        if (context) {
          prompt = `Given this ${langName} text: "${context}"

Translate the word in brackets [${normalizedWord}] to English based on the context. Reply with ONLY a single English word or short phrase that best fits this context. No explanations.`;
        } else {
          prompt = `Translate the ${langName} word "${normalizedWord}" to English. Reply with ONLY the most common English translation. No explanations.`;
        }

        const result = await callLLM({
          provider: "openai",
          model: "gpt-4o-mini",
          message: prompt,
          temperature: 0.1,
        });

        const translation = result?.response?.trim();

        if (!translation) {
          throw new Error("No translation received");
        }

        // Cache the translation in localStorage
        cache[cacheKey] = {
          translation,
          lookupCount: 1,
          lastUsed: Date.now(),
        };
        saveCache(cache);

        // Save to database (for vocabulary list and flashcards)
        // Only save single words (not phrases with context)
        const isSimpleWord = !normalizedWord.includes(" ") || normalizedWord.split(" ").length <= 3;
        if (isSimpleWord) {
          // Check if already exists in database
          const existing = vocabulary?.find(
            (v) => v.word.toLowerCase() === normalizedWord && v.sourceLanguage === sourceLanguage
          );

          if (existing) {
            // Update existing entry
            updateVocab(existing.id, {
              translation, // Update translation in case it improved
              lookupCount: (existing.lookupCount || 0) + 1,
            }).catch(() => {});
          } else {
            // Add new vocabulary word
            addVocab({
              word: normalizedWord,
              translation,
              sourceLanguage,
              lookupCount: 1,
              masteryLevel: 0,
              correctCount: 0,
              incorrectCount: 0,
            }).catch(() => {});
          }
        }

        return {
          word: normalizedWord,
          translation,
          fromCache: false,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Translation failed";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, callLLM, vocabulary, addVocab, updateVocab]
  );

  return {
    translate,
    loading,
    error,
  };
}
