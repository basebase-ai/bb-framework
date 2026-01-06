/**
 * translateWord - Translate a single word from a source language to English
 *
 * Uses OpenAI GPT for high-quality single word translation with context awareness.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.word - The word to translate
 * @param {string} params.sourceLanguage - Source language code (e.g., "no" for Norwegian)
 * @param {string} [params.targetLanguage] - Target language code (default: "en")
 * @param {string} [params.context] - Optional sentence context for better translation
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Translation result
 */
module.exports = async function (params, context) {
  const { word, sourceLanguage, targetLanguage = "en", context: sentenceContext } = params;

  // Validate required parameters
  if (!word) {
    throw new Error("word is required");
  }

  if (!sourceLanguage) {
    throw new Error("sourceLanguage is required");
  }

  const normalizedWord = word.toLowerCase().trim();

  if (!normalizedWord) {
    throw new Error("word cannot be empty");
  }

  context.log("Translating word", { word: normalizedWord, sourceLanguage, targetLanguage });

  // Map language codes to full names
  const languageNames = {
    no: "Norwegian",
    nb: "Norwegian Bokmål",
    nn: "Norwegian Nynorsk",
    sv: "Swedish",
    da: "Danish",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    nl: "Dutch",
    pt: "Portuguese",
    en: "English",
  };

  const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
  const targetLangName = languageNames[targetLanguage] || targetLanguage;

  // Build the prompt
  let prompt = `Translate the ${sourceLangName} word "${normalizedWord}" to ${targetLangName}. `;

  if (sentenceContext) {
    prompt += `Context: "${sentenceContext}". `;
  }

  prompt += `Reply with ONLY the ${targetLangName} translation, nothing else. `;
  prompt += `If the word has multiple common meanings, give the most common one. `;
  prompt += `Do not include any punctuation, explanation, or additional text.`;

  try {
    // Get API key
    const apiKey = await context.getSecret("OPENAI_API_KEY");

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Call OpenAI API directly for faster response
    const response = await context.http.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a precise translator. You translate single words between languages. Always respond with only the translated word, no explanations or punctuation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const translation = response.data.choices[0]?.message?.content?.trim();

    if (!translation) {
      throw new Error("No translation received from API");
    }

    context.log("Translation complete", {
      word: normalizedWord,
      translation,
      sourceLanguage,
      targetLanguage,
    });

    return {
      success: true,
      word: normalizedWord,
      translation,
      sourceLanguage,
      targetLanguage,
    };
  } catch (error) {
    context.error("Translation failed", error);

    if (error.response?.status === 401) {
      throw new Error("Invalid API key");
    }

    if (error.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }

    throw new Error(`Translation failed: ${error.message}`);
  }
};


