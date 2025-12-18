// Import Buffer for base64 decoding
const { Buffer } = require("buffer");

/**
 * Helper function to parse email addresses from header
 * @param {Array} headers - Gmail message headers
 * @param {string} name - Header name to find
 * @returns {string|null} Header value
 */
function getHeader(headers, name) {
  if (!headers || !Array.isArray(headers)) {
    return null;
  }
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header ? header.value : null;
}

/**
 * Helper function to decode base64url encoded string
 * @param {string} str - Base64url encoded string
 * @returns {string} Decoded string
 */
function decodeBase64Url(str) {
  if (!str) return "";
  try {
    // Replace URL-safe characters and pad if needed
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) {
      base64 += "=".repeat(4 - pad);
    }
    // Use Buffer.from for Node.js (Firebase Functions) compatibility
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    return decoded;
  } catch (error) {
    console.error("Failed to decode base64:", error);
    return "";
  }
}

/**
 * Helper function to extract message bodies from Gmail message parts
 * Extracts both plain text and HTML versions separately
 * @param {Object} payload - Gmail message payload
 * @param {Object} context - Function context for logging
 * @returns {Object} Object with bodyPlainText and bodyHtml properties
 */
function getMessageBodies(payload, context = null) {
  const result = {
    bodyPlainText: null,
    bodyHtml: null,
  };

  if (!payload) return result;

  if (context) {
    context.log("Parsing message body structure:", {
      mimeType: payload.mimeType,
      hasBodyData: !!(payload.body && payload.body.data),
      bodySize: payload.body?.size || 0,
      hasParts: !!(payload.parts && payload.parts.length > 0),
      partsCount: payload.parts?.length || 0,
    });
  }

  // Try to get body from main payload (simple emails)
  if (payload.body && payload.body.data) {
    const bodyContent = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/plain") {
      result.bodyPlainText = bodyContent;
      if (context) {
        context.log("✓ Found text/plain at root level");
      }
    } else if (payload.mimeType === "text/html") {
      result.bodyHtml = bodyContent;
      if (context) {
        context.log("✓ Found text/html at root level");
      }
    }
  }

  // If no body or need to check parts (multipart messages)
  if (payload.parts && Array.isArray(payload.parts)) {
    if (context) {
      context.log(
        "Checking multipart message with",
        payload.parts.length,
        "parts"
      );
    }
    extractFromParts(payload.parts, result, context, 1);
  }

  if (context) {
    context.log("Body extraction result:", {
      hasPlainText: !!result.bodyPlainText,
      plainTextLength: result.bodyPlainText?.length || 0,
      hasHtml: !!result.bodyHtml,
      htmlLength: result.bodyHtml?.length || 0,
    });
  }

  return result;
}

/**
 * Recursively extract plain text and HTML from message parts
 * @param {Array} parts - Gmail message parts
 * @param {Object} result - Result object to populate
 * @param {Object} context - Function context for logging
 * @param {number} depth - Recursion depth for logging
 */
function extractFromParts(parts, result, context = null, depth = 0) {
  const indent = "  ".repeat(depth);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (context) {
      context.log(`${indent}Part [${i}]:`, {
        mimeType: part.mimeType,
        hasBodyData: !!(part.body && part.body.data),
        bodySize: part.body?.size || 0,
        hasParts: !!(part.parts && part.parts.length > 0),
        partsCount: part.parts?.length || 0,
        filename: part.filename || null,
      });
    }

    // Extract plain text
    if (
      part.mimeType === "text/plain" &&
      part.body &&
      part.body.data &&
      !result.bodyPlainText
    ) {
      result.bodyPlainText = decodeBase64Url(part.body.data);
      if (context) {
        context.log(
          `${indent}✓ Found text/plain body (${part.body.size} bytes)`
        );
      }
    }
    // Extract HTML
    else if (
      part.mimeType === "text/html" &&
      part.body &&
      part.body.data &&
      !result.bodyHtml
    ) {
      result.bodyHtml = decodeBase64Url(part.body.data);
      if (context) {
        context.log(
          `${indent}✓ Found text/html body (${part.body.size} bytes)`
        );
      }
    }
    // Recursively check nested parts
    else if (part.parts && Array.isArray(part.parts)) {
      if (context) {
        context.log(`${indent}↳ Checking nested parts (${part.parts.length})`);
      }
      extractFromParts(part.parts, result, context, depth + 1);
    }
  }
}

/**
 * Get OAuth access token from Nango (handles refresh automatically)
 * @param {string} userId - User ID (used as endUserId in Nango)
 * @param {string} integrationId - Nango integration ID
 * @param {Object} context - Function context
 * @returns {Promise<string>} Access token
 */
async function getNangoAccessToken(userId, integrationId, context) {
  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error("NANGO_SECRET_KEY not configured");
  }

  try {
    // Find the connection by endUserId
    const listResponse = await context.http.get(
      "https://api.nango.dev/connections",
      {
        params: {
          endUserId: userId,
          integrationId: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const connections = listResponse.data?.connections || [];
    if (connections.length === 0) {
      throw new Error(
        `User has not connected ${integrationId}. Please connect first.`
      );
    }

    const connectionId = connections[0].connection_id;

    // Get connection with credentials (Nango auto-refreshes if expired)
    const connResponse = await context.http.get(
      `https://api.nango.dev/connections/${connectionId}`,
      {
        params: {
          provider_config_key: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const connection = connResponse.data;
    if (!connection.credentials?.access_token) {
      throw new Error(`No access token found for ${integrationId}`);
    }

    return connection.credentials.access_token;
  } catch (error) {
    if (
      error.response?.status === 404 ||
      error.message?.includes("not found") ||
      error.message?.includes("No ")
    ) {
      throw new Error(
        `User has not connected ${integrationId}. Please connect first.`
      );
    }
    throw error;
  }
}

/**
 * Framework function: Read Gmail messages
 * @param {Object} params - Function parameters
 * @param {string} [params.accessToken] - Gmail OAuth access token (from Nango - preferred)
 * @param {string} [params.refreshToken] - Gmail OAuth refresh token (legacy - will be exchanged for access token)
 * @param {string} [params.userId] - User ID to fetch Nango token for (alternative to accessToken/refreshToken)
 * @param {string} [params.query] - Gmail search query (e.g., "is:unread", "from:example@gmail.com")
 * @param {Array<string>} [params.labels] - Gmail labels to filter by (e.g., ["INBOX"], ["CATEGORY_PERSONAL"], ["CATEGORY_SOCIAL"])
 * @param {number} [params.days=7] - Number of days of messages to fetch (1-365)
 * @param {number} [params.maxResults=100] - Maximum number of messages to fetch (1-500)
 * @param {string} [params.saveToCollection] - Firestore collection to save messages to (optional)
 * @param {string} [params.idField] - Field to use as document ID when saving to Firestore (default: 'gmailMessageId')
 * @param {Array<string>} [params.selectFields] - Subset of fields to save to Firestore (saves all if not specified)
 * @param {Object} [params.appendFields] - Additional key:value pairs to append to each saved document
 * @param {boolean} [params.excludeBodies=false] - Exclude body content from returned messages (reduces size)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Gmail messages in JSON format
 *
 * @example
 * // Using Nango with userId (simplest - fetches token automatically)
 * readGmail({ userId: "user123", labels: ["INBOX"] })
 *
 * @example
 * // Using Nango (preferred) - access token provided directly
 * readGmail({ accessToken, labels: ["CATEGORY_PERSONAL"] })
 *
 * @example
 * // Legacy - using refresh token
 * readGmail({ refreshToken, labels: ["INBOX"] })
 *
 * @example
 * // Get social tab only
 * readGmail({ accessToken, labels: ["CATEGORY_SOCIAL"] })
 */
module.exports = async function (params, context) {
  const {
    accessToken: providedAccessToken,
    refreshToken,
    userId,
    query = "",
    labels,
    days = 7,
    maxResults = 100,
    saveToCollection,
    idField = "gmailMessageId",
    selectFields,
    appendFields,
    excludeBodies = false,
  } = params;

  // Validate required parameters - need accessToken, refreshToken, or userId
  if (!providedAccessToken && !refreshToken && !userId) {
    throw new Error(
      "One of accessToken, refreshToken, or userId parameter is required"
    );
  }

  // Validate parameters
  const messageDays = Math.max(1, Math.min(days, 365));
  const messageLimit = Math.max(1, Math.min(maxResults, 500));

  // Validate selectFields if provided
  if (selectFields !== undefined && !Array.isArray(selectFields)) {
    throw new Error("selectFields must be an array of field names");
  }

  // Validate appendFields if provided
  if (appendFields !== undefined && typeof appendFields !== "object") {
    throw new Error("appendFields must be an object");
  }

  // Validate idField if provided
  if (idField !== undefined && typeof idField !== "string") {
    throw new Error("idField must be a string");
  }

  // Validate labels if provided
  if (labels !== undefined && !Array.isArray(labels)) {
    throw new Error("labels must be an array of Gmail label names");
  }

  context.log("Reading Gmail messages", {
    query: query || "all",
    labels: labels || "none",
    days: messageDays,
    maxResults: messageLimit,
    saveToCollection: saveToCollection || "none",
    tokenSource: providedAccessToken ? "direct" : userId ? "nango" : "refresh",
  });

  try {
    // Get access token from one of three sources
    /** @type {string} */
    let accessToken;
    if (providedAccessToken) {
      accessToken = providedAccessToken;
      context.log("Using provided access token");
    } else if (userId) {
      // Fetch token from Nango using userId
      accessToken = await getNangoAccessToken(userId, "google-mail", context);
      context.log("Using Nango access token for user", { userId });
    } else {
      accessToken = await getAccessTokenFromRefreshToken(refreshToken, context);
    }

    const result = await fetchGmailMessages(
      accessToken,
      query,
      labels,
      messageDays,
      messageLimit,
      excludeBodies,
      context
    );

    // Save to Firestore if requested
    if (saveToCollection) {
      await saveMessagesToFirestore(
        result.messages,
        saveToCollection,
        idField,
        selectFields,
        appendFields,
        context
      );
    }

    return result;
  } catch (error) {
    context.error("Failed to read Gmail messages", error);
    throw new Error(`Gmail API error: ${error.message}`);
  }
};

/**
 * Exchange refresh token for access token
 * @param {string} refreshToken - Gmail OAuth refresh token
 * @param {Object} context - Function context
 * @returns {Promise<string>} Access token
 */
async function getAccessTokenFromRefreshToken(refreshToken, context) {
  context.log("Refreshing Gmail access token");

  // Get OAuth credentials from secrets
  const clientId = await context.getSecret("GMAIL_CLIENT_ID");
  const clientSecret = await context.getSecret("GMAIL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET secrets."
    );
  }

  try {
    // Build form data manually
    const formData = `client_id=${encodeURIComponent(
      clientId
    )}&client_secret=${encodeURIComponent(
      clientSecret
    )}&refresh_token=${encodeURIComponent(
      refreshToken
    )}&grant_type=refresh_token`;

    const response = await context.http.post(
      "https://oauth2.googleapis.com/token",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );

    if (!response.data.access_token) {
      throw new Error("No access token received from Google OAuth");
    }

    context.log("Successfully refreshed access token");
    return response.data.access_token;
  } catch (error) {
    context.error("Failed to refresh access token", error);

    if (error.response) {
      const errorData = error.response.data;
      throw new Error(
        `Failed to refresh Gmail token: ${
          errorData.error_description || errorData.error || "Unknown error"
        }`
      );
    }

    throw new Error(`Failed to refresh Gmail token: ${error.message}`);
  }
}

/**
 * Fetch Gmail messages from Gmail API
 * @param {string} accessToken - Gmail OAuth access token
 * @param {string} query - Gmail search query
 * @param {Array<string>|null} labels - Gmail labels to filter by
 * @param {number} days - Number of days back
 * @param {number} maxResults - Max messages to fetch
 * @param {boolean} excludeBodies - Whether to exclude body content from results
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Gmail messages
 */
async function fetchGmailMessages(
  accessToken,
  query,
  labels,
  days,
  maxResults,
  excludeBodies,
  context
) {
  context.log("Fetching Gmail messages from API", {
    days,
    maxResults,
    hasQuery: !!query,
    hasLabels: !!labels,
  });

  try {
    // Build Gmail search query
    let searchQuery = query || "";

    // Add label filters if provided
    if (labels && labels.length > 0) {
      const labelQueries = labels.map((label) => `label:${label}`).join(" OR ");
      if (searchQuery) {
        searchQuery += ` (${labelQueries})`;
      } else {
        searchQuery = labelQueries;
      }
    }

    context.log("Listing Gmail messages", {
      searchQuery,
      maxResults,
    });

    // Step 1: List message IDs using Gmail API
    const listResponse = await context.http.get(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages",
      {
        params: {
          q: searchQuery,
          maxResults: maxResults,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // Log the full response for debugging
    context.log("Gmail API list response received", {
      hasData: !!listResponse.data,
      hasMessages: !!listResponse.data?.messages,
      dataKeys: listResponse.data ? Object.keys(listResponse.data) : [],
      status: listResponse.status,
    });

    // Check for API errors
    if (listResponse.data.error) {
      throw new Error(
        `Gmail API error: ${
          listResponse.data.error.message ||
          JSON.stringify(listResponse.data.error)
        }`
      );
    }

    const messageIds = listResponse.data.messages || [];
    context.log("Message IDs extracted", {
      count: messageIds.length,
      firstFew: messageIds.slice(0, 3),
    });
    context.log("Gmail message list retrieved", {
      count: messageIds.length,
    });

    if (messageIds.length === 0) {
      return {
        success: true,
        messages: [],
        messageCount: 0,
        query: searchQuery,
        days,
        timestamp: new Date().toISOString(),
      };
    }

    // Step 2: Fetch full message details for each message
    const messages = [];

    for (const msg of messageIds) {
      try {
        context.log("Fetching message details", { messageId: msg.id });

        // Get full message details
        const messageResponse = await context.http.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            params: {
              format: "full",
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 30000,
          }
        );

        const messageData = messageResponse.data;

        // Extract message fields
        const headers = messageData.payload.headers;
        const from = getHeader(headers, "From");
        const to = getHeader(headers, "To");
        const cc = getHeader(headers, "Cc");
        const bcc = getHeader(headers, "Bcc");
        const subject = getHeader(headers, "Subject");
        const date = getHeader(headers, "Date");
        const messageId = getHeader(headers, "Message-ID");

        // Extract both plain text and HTML versions of message body
        context.log("=== Processing message ===", {
          messageId: msg.id,
          subject: getHeader(headers, "Subject")?.substring(0, 50),
        });
        const { bodyPlainText, bodyHtml } = getMessageBodies(
          messageData.payload,
          context
        );

        // Get internal date (Unix timestamp in milliseconds)
        const internalDate = messageData.internalDate
          ? new Date(parseInt(messageData.internalDate, 10))
          : null;

        // Prepare message object
        const message = {
          gmailMessageId: messageData.id,
          threadId: messageData.threadId || null,
          from: from || null,
          to: to || null,
          cc: cc || null,
          bcc: bcc || null,
          subject: subject || null,
          body: bodyHtml || bodyPlainText || null, // Prefer HTML, fallback to plain
          bodyPlainText: bodyPlainText || null,
          bodyHtml: bodyHtml || null,
          date: date || null,
          internalDate: internalDate ? internalDate.toISOString() : null,
          messageId: messageId || null,
          labelIds: messageData.labelIds || [],
          snippet: messageData.snippet || null,
        };

        messages.push(message);

        context.log("Message fetched successfully", {
          messageId: msg.id,
          subject: subject || "(no subject)",
        });
      } catch (error) {
        context.error("Failed to fetch message", {
          messageId: msg.id,
          error: error.message,
        });
        // Continue with next message instead of failing completely
      }
    }

    // If excludeBodies is true, remove large body fields to reduce result size
    const messagesToReturn = excludeBodies
      ? messages.map((msg) => {
          const { body, bodyPlainText, bodyHtml, ...rest } = msg;
          return rest;
        })
      : messages;

    const result = {
      success: true,
      messages: messagesToReturn,
      messageCount: messages.length,
      query: searchQuery,
      days,
      timestamp: new Date().toISOString(),
    };

    context.log("Gmail messages fetch completed", {
      messageCount: messages.length,
      bodiesExcluded: excludeBodies,
    });

    return result;
  } catch (error) {
    context.error("Gmail API call failed", error);

    // Handle specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 401) {
        throw new Error(
          "Invalid Gmail access token. Please refresh the token."
        );
      } else if (status === 403) {
        throw new Error(
          "Gmail API access forbidden. Check API permissions and quotas."
        );
      } else if (status === 404) {
        throw new Error("Gmail API endpoint not found");
      } else if (status === 429) {
        throw new Error(
          "Gmail API rate limit exceeded. Please try again later."
        );
      } else if (errorData && errorData.error && errorData.error.message) {
        throw new Error(`Gmail API error: ${errorData.error.message}`);
      } else {
        throw new Error(`Gmail API error (${status}): ${error.message}`);
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout for Gmail API");
    } else {
      throw new Error(`Network error calling Gmail API: ${error.message}`);
    }
  }
}

/**
 * Save messages to Firestore collection
 * @param {Array<Object>} messages - Messages to save
 * @param {string} collectionName - Firestore collection name
 * @param {string} idField - Field to use as document ID
 * @param {Array<string>|null} selectFields - Fields to include (null = all)
 * @param {Object|null} appendFields - Fields to append to each document
 * @param {Object} context - Function context
 * @returns {Promise<void>}
 */
async function saveMessagesToFirestore(
  messages,
  collectionName,
  idField,
  selectFields,
  appendFields,
  context
) {
  if (!context.firebase) {
    throw new Error(
      "Firebase is not available in context. Ensure this function is called with proper Firebase context."
    );
  }

  context.log("Saving messages to Firestore", {
    collection: collectionName,
    messageCount: messages.length,
    idField,
    selectFields: selectFields || "all",
    hasAppendFields: !!appendFields,
  });

  const batch = context.firebase.batch();
  const collectionRef = context.firebase.collection(collectionName);
  let savedCount = 0;

  for (const message of messages) {
    try {
      // Determine document ID
      let docId = null;
      if (message[idField] !== null && message[idField] !== undefined) {
        docId = String(message[idField]).trim();
      }

      if (!docId || docId === "" || docId === "null" || docId === "undefined") {
        context.log("Skipping message without valid ID field", {
          idField,
          fieldValue: message[idField],
          subject: message.subject?.substring(0, 50),
        });
        continue;
      }

      // Build document data
      let docData = {};

      // Start with message fields
      if (selectFields && selectFields.length > 0) {
        // Only include selected fields
        for (const fieldName of selectFields) {
          if (message[fieldName] !== undefined) {
            docData[fieldName] = message[fieldName];
          }
        }
      } else {
        // Include all fields
        docData = { ...message };
      }

      // Always include the Gmail message ID
      docData._gmailMessageId = message.gmailMessageId;
      docData._threadId = message.threadId;

      // Append additional fields if provided
      if (appendFields) {
        docData = { ...docData, ...appendFields };
      }

      // Add timestamp
      docData._syncedAt = new Date().toISOString();

      // Add to batch
      const docRef = collectionRef.doc(docId);
      batch.set(docRef, docData, { merge: true });
      savedCount++;

      // Commit batch every 500 operations (Firestore limit)
      if (savedCount % 500 === 0) {
        await batch.commit();
        context.log(`Committed batch of ${savedCount} messages`);
      }
    } catch (error) {
      context.error("Error preparing message for Firestore", {
        messageId: message.gmailMessageId,
        error: error.message,
      });
    }
  }

  // Commit remaining messages
  if (savedCount % 500 !== 0) {
    await batch.commit();
  }

  context.log("Successfully saved messages to Firestore", {
    collection: collectionName,
    savedCount,
  });
}
