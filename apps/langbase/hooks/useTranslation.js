/**
 * Custom hook for word translation
 * Uses cloud function with localStorage caching and optionally saves to a flashcard deck
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { useFunction } from "../../../framework/hooks/useFunction.js";
import { useAuth } from "../../../framework/hooks/useAuth.js";
import { useCollection } from "../../../framework/hooks/useCollection.js";
import { collections } from "../schema.js";

const CACHE_KEY = "flashcards_translations";

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
 * Hook for translating words with localStorage caching and optional deck storage
 * @param {string | null} deckId - Optional deck ID to save cards to
 * @returns {{ translate: (word: string, sourceLanguage: string, context?: string) => Promise<TranslationResult>, loading: boolean, error: string | null }}
 */
export function useTranslation(deckId = null) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  
  // Track words added this session to prevent race condition duplicates
  const [addedWords, setAddedWords] = useState(/** @type {Set<string>} */ (new Set()));

  // Clear added words tracking when deck changes
  useEffect(() => {
    setAddedWords(new Set());
  }, [deckId]);

  // Cloud function for LLM translation
  const { call: callLLM } = useFunction("askLLM");

  // Cards collection for saving to deck
  const cardQueryOptions = useMemo(
    () => ({
      where: deckId && user?.uid ? [
        ["deckId", "==", deckId],
        ["owner", "==", user.uid],
      ] : [],
    }),
    [deckId, user?.uid]
  );
  const { data: existingCards, add: addCard } = useCollection(collections.cards, cardQueryOptions);

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

        // Still add to deck if not already there
        if (deckId) {
          const alreadyInDeck = existingCards?.some(
            (c) => c.front.toLowerCase() === normalizedWord
          ) || addedWords.has(normalizedWord);
          
          if (!alreadyInDeck) {
            setAddedWords((prev) => new Set([...prev, normalizedWord]));
            addCard({
              deckId,
              front: normalizedWord,
              back: cached.translation,
              box: 1,
              correctCount: 0,
              incorrectCount: 0,
            }).catch(() => {});
          }
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

        // Save to deck if linked (only single words or short phrases)
        const isSimpleWord = !normalizedWord.includes(" ") || normalizedWord.split(" ").length <= 3;
        if (deckId && isSimpleWord) {
          // Check if already exists in deck (Firestore) or was added this session (local)
          const alreadyInDeck = existingCards?.some(
            (c) => c.front.toLowerCase() === normalizedWord
          ) || addedWords.has(normalizedWord);

          if (!alreadyInDeck) {
            setAddedWords((prev) => new Set([...prev, normalizedWord]));
            addCard({
              deckId,
              front: normalizedWord,
              back: translation,
              box: 1,
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
    [user, callLLM, deckId, existingCards, addCard, addedWords]
  );

  return {
    translate,
    loading,
    error,
  };
}
