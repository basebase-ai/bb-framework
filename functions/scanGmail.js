/**
 * Scan Gmail for important new messages using AI
 *
 * This function:
 * 1. Fetches new Gmail messages for the user since last check
 * 2. Sends message summaries to LLM to determine which need responses
 * 3. Stores important messages in Firestore
 *
 * @param {Object} params - Function parameters
 * @param {string} [params.userId] - Specific user to check (optional, for manual checks)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Result with processed message counts
 */
module.exports = async function (params, context) {
  const { userId } = params;

  // Inline OAuth utility functions (can't require local files in function execution)
  async function getRefreshToken(userId, provider, context) {
    // Use context.firestore() for system collections like user-secrets
    const db = context.firestore();
    const secretDoc = await db.collection("user-secrets").doc(userId).get();

    if (!secretDoc.exists) {
      throw new Error(`No OAuth tokens found for user ${userId}`);
    }

    const providerData = secretDoc.data().services?.[provider];
    if (!providerData) {
      throw new Error(`Provider ${provider} not connected for user ${userId}`);
    }

    if (!providerData.refreshToken) {
      throw new Error(
        `No refresh token found for ${provider} for user ${userId}`
      );
    }

    return providerData.refreshToken;
  }

  async function isOAuthConnected(userId, provider, context) {
    // Use context.firestore() for system collections like user-secrets
    const db = context.firestore();
    const secretDoc = await db.collection("user-secrets").doc(userId).get();

    if (!secretDoc.exists) {
      return false;
    }

    const providerData = secretDoc.data().services?.[provider];
    return providerData?.accessToken ? true : false;
  }

  try {
    context.log("Starting email check", { userId: userId || "all users" });

    const db = context.firebase;
    const now = new Date();
    const nowTimestamp = context.firebase.FieldValue.serverTimestamp();

    // Get user configs to check
    let userConfigsSnapshot;

    // If specific userId provided, get their config directly (userId is the doc ID)
    if (userId) {
      context.log("Fetching config for specific user", { userId });
      // Don't use nomail_ prefix - context.firebase already namespaces it
      const configRef = db.collection("user-configs").doc(userId);
      const configDoc = await configRef.get();

      if (!configDoc.exists) {
        context.log("No config found for user", { userId });
        return {
          success: false,
          message: `No user-config object found for userId: ${userId}. User may need to save settings first.`,
          usersChecked: 0,
        };
      }

      // Process just this user
      userConfigsSnapshot = {
        docs: [configDoc],
        size: 1,
        empty: false,
      };
    } else {
      // Batch mode: query for users who need checking
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const userConfigsQuery = db
        .collection("user-configs")
        .where("enabled", "==", true)
        .where("lastCheckTime", "<", oneHourAgo)
        .limit(10); // Process 10 users at a time

      userConfigsSnapshot = await userConfigsQuery.get();
    }

    if (userConfigsSnapshot.empty) {
      context.log("No users to check in batch mode");
      return {
        success: true,
        message:
          "No users need checking at this time (all users recently checked or no enabled configs found)",
        usersChecked: 0,
      };
    }

    context.log(`Checking emails for ${userConfigsSnapshot.docs.length} users`);

    let totalNewEmails = 0;
    let totalImportantEmails = 0;

    // Process each user
    for (const configDoc of userConfigsSnapshot.docs) {
      const config = configDoc.data();

      try {
        context.log(`Processing user: ${config.userId}`);

        // Check if user has Gmail OAuth connected
        const hasGmail = await isOAuthConnected(
          config.userId,
          "google",
          context
        );
        if (!hasGmail) {
          context.log(
            `User ${config.userId} doesn't have Gmail connected, skipping`
          );
          continue;
        }

        // Get refresh token from user-secrets
        const refreshToken = await getRefreshToken(
          config.userId,
          "google",
          context
        );

        // Calculate days since last check (default to 1 day if no lastCheckTime)
        let daysSinceLastCheck = 1;
        if (config.lastCheckTime) {
          const lastCheckDate = config.lastCheckTime.toDate
            ? config.lastCheckTime.toDate()
            : new Date(config.lastCheckTime);
          daysSinceLastCheck = Math.ceil(
            (now.getTime() - lastCheckDate.getTime()) / (24 * 60 * 60 * 1000)
          );
        }

        // Fetch Gmail messages using readGmail function
        // Use excludeBodies to avoid hitting Firestore 1MB document limit
        const gmailResult = await context.callFunction("readGmail", {
          refreshToken: refreshToken,
          query: "is:unread", // Only unread messages
          days: Math.min(daysSinceLastCheck, 7), // Max 7 days lookback
          maxResults: 50,
          excludeBodies: true, // Exclude large body fields from result
        });

        const newMessages = gmailResult.messages || [];

        if (newMessages.length === 0) {
          context.log(`No new messages for user ${config.userId}`);
          // Only update config if it exists in DB
          if (configDoc.id) {
            await db.collection("user-configs").doc(configDoc.id).update({
              lastCheckTime: nowTimestamp,
            });
          }
          continue;
        }

        totalNewEmails += newMessages.length;
        context.log(
          `Found ${newMessages.length} new messages for user ${config.userId}`
        );

        // Analyze messages with LLM to determine which need responses
        const importantMessages = await analyzeMessagesWithAI(
          newMessages,
          context
        );
        totalImportantEmails += importantMessages.length;

        // Store important messages in Firestore (without bodies for now)
        const batch = db.batch();

        for (const msg of importantMessages) {
          // Use gmailMessageId as document ID to prevent duplicates
          const emailRef = db.collection("emails").doc(msg.gmailMessageId);
          batch.set(
            emailRef,
            {
              userId: config.userId,
              gmailMessageId: msg.gmailMessageId,
              gmailThreadId: msg.threadId,
              from: msg.from,
              to: msg.to || [],
              cc: msg.cc || [],
              bcc: msg.bcc || [],
              subject: msg.subject,
              snippet: msg.snippet,
              receivedAt: msg.internalDate || null,
              needsResponse: true,
              urgencyScore: msg.urgencyScore || null,
              llmReason: msg.llmReason,
              isRead: false,
              isArchived: false,
              labelIds: msg.labelIds || [],
              bodiesFetched: false, // Flag to indicate bodies need to be fetched separately
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            },
            { merge: true }
          ); // Use merge to avoid overwriting existing fields
        }

        // Update last check time (only if config exists in DB)
        if (configDoc.id) {
          batch.update(db.collection("user-configs").doc(configDoc.id), {
            lastCheckTime: nowTimestamp,
          });
        }

        await batch.commit();
        context.log(
          `Stored ${importantMessages.length} important messages for user ${config.userId}`
        );
      } catch (userError) {
        context.error(`Error processing user ${config.userId}:`, userError);
        // Continue with next user
      }
    }

    const result = {
      success: true,
      usersChecked: userConfigsSnapshot.size,
      totalNewEmails,
      totalImportantEmails,
      timestamp: now.toISOString(),
    };

    context.log("Email check completed", result);
    return result;
  } catch (error) {
    context.error("Email check failed:", error);
    throw error;
  }
};

// Note: fetchGmailMessages has been replaced by calling the readGmail function
// This follows the DRY (Don't Repeat Yourself) principle by reusing existing functionality

/**
 * Analyze messages with AI to determine which need responses
 * @param {Array} messages - Array of email messages
 * @param {Object} context - Function context
 * @returns {Promise<Array>} Array of important messages with llmReason
 */
async function analyzeMessagesWithAI(messages, context) {
  if (messages.length === 0) {
    return [];
  }

  try {
    // Process in batches of 20 to avoid token limits
    const BATCH_SIZE = 20;
    const allImportantMessages = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      context.log(`Analyzing email batch ${Math.floor(i / BATCH_SIZE) + 1}`, {
        batchSize: batch.length,
        totalMessages: messages.length,
      });

      const importantInBatch = await analyzeBatch(batch, i, context);
      allImportantMessages.push(...importantInBatch);
    }

    return allImportantMessages;
  } catch (error) {
    context.error("Error analyzing messages with AI:", error);
    // Return empty array instead of failing the entire check
    return [];
  }
}

/**
 * Analyze a batch of messages
 * @param {Array} batch - Batch of messages to analyze
 * @param {number} offset - Offset for indexing
 * @param {Object} context - Function context
 * @returns {Promise<Array>} Important messages in this batch
 */
async function analyzeBatch(batch, offset, context) {
  try {
    // Prepare messages for LLM analysis
    const messageSummaries = batch.map((msg, idx) => ({
      index: idx,
      id: msg.gmailMessageId,
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      snippet: msg.snippet?.substring(0, 150), // Reduced to 150 chars
      receivedAt: msg.internalDate || msg.receivedAt,
    }));

    const prompt = `You are an email urgency analyzer. Score each email on urgency from 0-10.

URGENCY SCORING GUIDE:
10 = Critical: Payment failures, account issues, urgent requests from boss/family
8-9 = High: Direct questions from colleagues, meeting requests, time-sensitive decisions
6-7 = Medium: Personal emails that would be polite to respond to
3-5 = Low: FYI emails, newsletters from people you know
0-2 = None: Marketing, automated receipts, promotional emails, no-reply addresses

EXAMPLES:
- "Payment failed" from bank → 10
- "Can you review this?" from colleague → 8
- "Thanks for meeting" from friend → 4
- "20% off sale!" from store → 0

Here are the emails to score:

${JSON.stringify(messageSummaries, null, 2)}

Respond with a JSON array with a score for EVERY email:
[
  {"index": 0, "urgency": 8, "reason": "Payment failure requires immediate action"},
  {"index": 1, "urgency": 2, "reason": "Automated confirmation"}
]

Return scores for ALL ${messageSummaries.length} emails in the same order.`;

    context.log("Calling LLM to analyze message batch", {
      count: batch.length,
    });

    // Call the askLLM function
    const llmResult = await context.callFunction("askLLM", {
      provider: "openai",
      model: "gpt-5-mini", // Fast, cost-efficient model for well-defined tasks
      message: prompt,
      options: {
        maxTokens: 3000, // Still generous but can reduce since low effort uses fewer reasoning tokens
      },
    });

    if (!llmResult.success) {
      throw new Error("LLM call failed: " + llmResult.error);
    }

    // Parse LLM response
    let emailScores = [];
    try {
      const responseText = llmResult.response.trim();
      // Remove markdown code blocks if present
      const jsonText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
      emailScores = JSON.parse(jsonText);
    } catch (parseError) {
      context.error("Failed to parse LLM response:", parseError);
      context.log("LLM response was:", llmResult.response);
      // Fall back to returning no important messages
      return [];
    }

    // Filter for high-urgency emails (score >= 7)
    const URGENCY_THRESHOLD = 7;
    const importantMessages = emailScores
      .filter((item) => item.urgency >= URGENCY_THRESHOLD)
      .map((item) => {
        const originalMessage = batch[item.index];
        return {
          ...originalMessage,
          urgencyScore: item.urgency,
          llmReason: item.reason,
        };
      });

    context.log(
      `LLM scored ${emailScores.length} emails, ${importantMessages.length} are high-urgency (>= ${URGENCY_THRESHOLD})`
    );

    return importantMessages;
  } catch (error) {
    context.error("Error analyzing batch:", error);
    // Return empty array instead of failing
    return [];
  }
}

// Token refresh is now handled automatically by getOAuthToken() in oauth-utils.js
// No need for custom refresh logic in this function
