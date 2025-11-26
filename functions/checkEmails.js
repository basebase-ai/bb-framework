/**
 * Check Gmail for new messages and flag important ones using AI
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
  const { getOAuthToken, isOAuthConnected } = require("./lib/oauth-utils.js");

  try {
    context.log("Starting email check", { userId: userId || "all users" });

    const db = context.firebase.firestore();
    const now = new Date();

    // Get user configs to check
    let userConfigsQuery = db.collection("nomail_user_configs")
      .where("enabled", "==", true);

    // If specific userId provided, filter to that user
    if (userId) {
      userConfigsQuery = userConfigsQuery.where("userId", "==", userId);
    } else {
      // Only check users whose last check was more than checkIntervalMinutes ago
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      userConfigsQuery = userConfigsQuery
        .where("lastCheckTime", "<", oneHourAgo)
        .limit(10); // Process 10 users at a time
    }

    const userConfigsSnapshot = await userConfigsQuery.get();

    if (userConfigsSnapshot.empty) {
      context.log("No users to check");
      return {
        success: true,
        message: "No users need checking at this time",
        usersChecked: 0,
      };
    }

    context.log(`Checking emails for ${userConfigsSnapshot.size} users`);

    let totalNewEmails = 0;
    let totalImportantEmails = 0;

    // Process each user
    for (const configDoc of userConfigsSnapshot.docs) {
      const config = configDoc.data();
      
      try {
        context.log(`Processing user: ${config.userId}`);

        // Check if user has Gmail OAuth connected
        const hasGmail = await isOAuthConnected(config.userId, "google", context);
        if (!hasGmail) {
          context.log(`User ${config.userId} doesn't have Gmail connected, skipping`);
          continue;
        }

        // Get valid Gmail access token (auto-refreshes if expired)
        const accessToken = await getOAuthToken(config.userId, "google", context);
        
        // Fetch Gmail messages using the access token
        const newMessages = await fetchGmailMessages(config, accessToken, context);
        
        if (newMessages.length === 0) {
          context.log(`No new messages for user ${config.userId}`);
          await db.collection("nomail_user_configs").doc(configDoc.id).update({
            lastCheckTime: now,
          });
          continue;
        }

        totalNewEmails += newMessages.length;
        context.log(`Found ${newMessages.length} new messages for user ${config.userId}`);

        // Analyze messages with LLM to determine which need responses
        const importantMessages = await analyzeMessagesWithAI(newMessages, context);
        totalImportantEmails += importantMessages.length;

        // Store important messages in Firestore
        const batch = db.batch();
        
        for (const msg of importantMessages) {
          const emailRef = db.collection("nomail_emails").doc();
          batch.set(emailRef, {
            userId: config.userId,
            gmailMessageId: msg.id,
            gmailThreadId: msg.threadId,
            from: msg.from,
            to: msg.to || [],
            cc: msg.cc || [],
            bcc: msg.bcc || [],
            subject: msg.subject,
            snippet: msg.snippet,
            receivedAt: msg.receivedAt,
            needsResponse: true,
            llmReason: msg.llmReason,
            isRead: false,
            isArchived: false,
            labels: msg.labels || [],
            createdAt: now,
            updatedAt: now,
          });
        }

        // Update last check time
        batch.update(db.collection("nomail_user_configs").doc(configDoc.id), {
          lastCheckTime: now,
        });

        await batch.commit();
        context.log(`Stored ${importantMessages.length} important messages for user ${config.userId}`);

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

/**
 * Fetch new Gmail messages for a user
 * @param {Object} config - User configuration
 * @param {string} accessToken - Valid Gmail OAuth access token
 * @param {Object} context - Function context
 * @returns {Promise<Array>} Array of message objects
 */
async function fetchGmailMessages(config, accessToken, context) {
  // TODO: Implement actual Gmail API integration with googleapis package
  // This is a placeholder that shows the structure
  
  context.log("Fetching Gmail messages (currently simulated)");
  
  // For now, return empty array
  // In production, uncomment and implement the code below:
  return [];
  
  /* Example of what the Gmail API integration would look like:
  
  const { google } = require('googleapis');
  const gmail = google.gmail({ version: 'v1' });
  
  // Set up OAuth2 client with the access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  // Calculate query time
  const afterTimestamp = config.lastCheckTime ? 
    Math.floor(config.lastCheckTime.toDate().getTime() / 1000) : 
    Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000); // Last 24 hours
  
  // List messages
  const response = await gmail.users.messages.list({
    userId: 'me',
    auth: oauth2Client,
    q: `after:${afterTimestamp} -label:sent -label:draft`,
    maxResults: 50,
  });
  
  if (!response.data.messages) {
    return [];
  }
  
  // Fetch full details for each message
  const messages = [];
  for (const msg of response.data.messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      auth: oauth2Client,
      id: msg.id,
      format: 'full',
    });
    
    const headers = fullMessage.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
    
    messages.push({
      id: fullMessage.data.id,
      threadId: fullMessage.data.threadId,
      from: getHeader('From'),
      to: getHeader('To').split(',').map(e => e.trim()).filter(Boolean),
      cc: getHeader('Cc').split(',').map(e => e.trim()).filter(Boolean),
      subject: getHeader('Subject'),
      snippet: fullMessage.data.snippet,
      receivedAt: new Date(parseInt(fullMessage.data.internalDate)),
      labels: fullMessage.data.labelIds || [],
    });
  }
  
  return messages;
  */
}

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
    // Prepare messages for LLM analysis
    const messageSummaries = messages.map((msg, idx) => ({
      index: idx,
      id: msg.id,
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      snippet: msg.snippet?.substring(0, 200), // First 200 chars
      receivedAt: msg.receivedAt,
    }));

    const prompt = `You are an email filtering assistant. Analyze the following emails and identify which ones need a response from the user.

An email needs a response if it:
- Contains a direct question or request
- Requires action or decision from the recipient
- Is from an important contact (boss, client, family)
- Contains time-sensitive information
- Is a personal email (not automated/marketing)

DO NOT flag emails that:
- Are automated notifications or receipts
- Are marketing or promotional emails
- Are newsletters or updates
- Are FYI/informational only
- Are from no-reply addresses

Here are the emails to analyze:

${JSON.stringify(messageSummaries, null, 2)}

Respond with a JSON array of objects for ONLY the emails that need responses. Each object should have:
{
  "index": <number>,
  "reason": "<brief explanation why this needs a response>"
}

If no emails need responses, return an empty array: []`;

    context.log("Calling LLM to analyze messages", { count: messages.length });

    // Call the askLLM function
    const llmResult = await context.callFunction("askLLM", {
      provider: "openai",
      model: "gpt-4",
      message: prompt,
      options: {
        temperature: 0.3, // Lower temperature for more consistent results
        maxTokens: 1000,
      },
    });

    if (!llmResult.success) {
      throw new Error("LLM call failed: " + llmResult.error);
    }

    // Parse LLM response
    let importantIndices = [];
    try {
      const responseText = llmResult.response.trim();
      // Remove markdown code blocks if present
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      importantIndices = JSON.parse(jsonText);
    } catch (parseError) {
      context.error("Failed to parse LLM response:", parseError);
      context.log("LLM response was:", llmResult.response);
      // Fall back to returning no important messages
      return [];
    }

    // Build result array with reasons
    const importantMessages = importantIndices.map(item => {
      const originalMessage = messages[item.index];
      return {
        ...originalMessage,
        llmReason: item.reason,
      };
    });

    context.log(`LLM identified ${importantMessages.length} important messages`);

    return importantMessages;

  } catch (error) {
    context.error("Error analyzing messages with AI:", error);
    // Return empty array instead of failing the entire check
    return [];
  }
}

// Token refresh is now handled automatically by getOAuthToken() in oauth-utils.js
// No need for custom refresh logic in this function

