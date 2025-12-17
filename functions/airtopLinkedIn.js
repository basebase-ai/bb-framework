/**
 * Airtop LinkedIn Data Fetching
 *
 * Unified function for fetching LinkedIn data using saved Airtop profiles.
 * Use the `action` parameter to specify what data to fetch.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.action - Action to perform: "connections" | "feed"
 * @param {number} [params.limit] - Maximum items to fetch (default: 50 for connections, 20 for feed)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Action-specific result with fetched data
 */
module.exports = async function (params, context) {
  const { action } = params;

  if (!action) {
    throw new Error("action is required");
  }

  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const apiKey = await context.getSecret("AIRTOP_API_KEY");
  if (!apiKey) {
    throw new Error("AIRTOP_API_KEY not configured");
  }

  const baseUrl = "https://api.airtop.ai/api/v1";
  const db = context.firestore();
  const userSecretsRef = db.collection("user-secrets").doc(userId);

  // Get the user's LinkedIn profile from user-secrets
  const userSecretsDoc = await userSecretsRef.get();
  const airtopData = userSecretsDoc.exists
    ? userSecretsDoc.data()?.services?.airtop
    : null;

  if (!airtopData?.profiles?.linkedin) {
    throw new Error(
      "LinkedIn not connected. Please connect LinkedIn first via the live view."
    );
  }

  const profileId = airtopData.profiles.linkedin.profileId;

  context.log("Using saved profile", { profileId, action });

  /** @type {string | null} */
  let sessionId = null;
  /** @type {string | null} */
  let windowId = null;

  try {
    // Create a session with the saved profile
    context.log("Creating session with profile", { profileId });
    
    let sessionResponse;
    try {
      sessionResponse = await context.http.post(
        `${baseUrl}/sessions`,
        {
          configuration: {
            timeoutMinutes: 5,
            baseProfileId: profileId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );
    } catch (createError) {
      const errorDetail = JSON.stringify({
        status: createError.response?.status,
        data: createError.response?.data,
        message: createError.message,
      });
      throw new Error(`Failed to create session: ${errorDetail}`);
    }

    sessionId = sessionResponse.data?.data?.id;
    if (!sessionId) {
      throw new Error(`Failed to create session - no ID returned. Response: ${JSON.stringify(sessionResponse.data)}`);
    }

    context.log("Session created, waiting for ready state", { sessionId });

    // Poll for session to be ready (status = "active" or "running")
    const maxWaitMs = 60000; // 60 seconds max
    const pollIntervalMs = 2000; // Check every 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      let statusResponse;
      try {
        statusResponse = await context.http.get(
          `${baseUrl}/sessions/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 10000,
          }
        );
      } catch (pollError) {
        const errorDetail = JSON.stringify({
          status: pollError.response?.status,
          data: pollError.response?.data,
          message: pollError.message,
        });
        throw new Error(`Failed to poll session status: ${errorDetail}`);
      }

      const status = statusResponse.data?.data?.status;
      context.log("Session status check", { sessionId, status });

      if (status === "active" || status === "running") {
        context.log("Session is ready", { sessionId, status });
        break;
      }

      if (status === "ended" || status === "error" || status === "failed") {
        throw new Error(`Session failed with status: ${status}. Full response: ${JSON.stringify(statusResponse.data)}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Final status check
    let finalStatusResponse;
    try {
      finalStatusResponse = await context.http.get(
        `${baseUrl}/sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000,
        }
      );
    } catch (finalCheckError) {
      const errorDetail = JSON.stringify({
        status: finalCheckError.response?.status,
        data: finalCheckError.response?.data,
        message: finalCheckError.message,
      });
      throw new Error(`Failed final session status check: ${errorDetail}`);
    }

    const finalStatus = finalStatusResponse.data?.data?.status;
    if (finalStatus !== "active" && finalStatus !== "running") {
      throw new Error(`Session failed to become ready (status: ${finalStatus})`);
    }

    context.log("Session ready, proceeding with action", { sessionId, action });

    switch (action) {
      // =========================================================================
      // CONNECTIONS - Fetch user's LinkedIn connections with scroll support
      // =========================================================================
      case "connections": {
        const { limit = 50 } = params;

        // Navigate to connections page
        let windowResponse;
        try {
          windowResponse = await context.http.post(
            `${baseUrl}/sessions/${sessionId}/windows`,
            {
              url: "https://www.linkedin.com/mynetwork/invite-connect/connections/",
              waitUntil: "load",
              screenResolution: "1280x800",
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 60000,
            }
          );
        } catch (windowError) {
          const errorDetail = JSON.stringify({
            status: windowError.response?.status,
            data: windowError.response?.data,
            message: windowError.message,
          });
          throw new Error(`Failed to create window for connections: ${errorDetail}`);
        }

        windowId = windowResponse.data?.data?.windowId;
        if (!windowId) {
          throw new Error(`Failed to create window - no ID returned. Response: ${JSON.stringify(windowResponse.data)}`);
        }

        context.log("Navigated to connections page", { windowId });

        // Wait for initial page to render
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Helper to create unique connection key for deduplication
        /** @param {{name: string, headline?: string}} connection */
        const getConnectionKey = (connection) => {
          return `${connection.name}:${connection.headline || ""}`;
        };

        // Accumulated connections with deduplication
        /** @type {Map<string, {name: string, headline?: string, profileUrl?: string, connectedDate?: string, profileImageUrl?: string}>} */
        const allConnections = new Map();

        // Extraction prompt
        const extractionPrompt = `
          Extract ALL LinkedIn connections visible on this page. For each connection, extract:
          - name: The person's full name
          - headline: Their job title/headline (if visible)
          - profileUrl: Their LinkedIn profile URL (if available)
          - connectedDate: When you connected (if visible, like "Connected 2 weeks ago")
          - profileImageUrl: URL of their profile picture (if visible)

          Return the data as a JSON object with a "connections" array.
          If you can't find any connections, return {"connections": []}.
          Only return valid JSON, no additional text.
        `;

        const outputSchema = JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            connections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  headline: { type: "string" },
                  profileUrl: { type: "string" },
                  connectedDate: { type: "string" },
                  profileImageUrl: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
          required: ["connections"],
        });

        // Scroll and extract loop
        const maxScrolls = Math.min(15, Math.ceil(limit / 10)); // ~10 connections per viewport
        let scrollCount = 0;
        let consecutiveEmptyExtractions = 0;

        while (allConnections.size < limit && scrollCount < maxScrolls) {
          context.log("Extracting connections", { scrollCount, currentTotal: allConnections.size });

          // Extract connections from current viewport
          const queryResponse = await context.http.post(
            `${baseUrl}/sessions/${sessionId}/windows/${windowId}/page-query`,
            {
              prompt: extractionPrompt,
              configuration: { outputSchema },
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 60000,
            }
          );

          const modelResponse = queryResponse.data?.data?.modelResponse;
          
          /** @type {Array<{name: string, headline?: string, profileUrl?: string, connectedDate?: string, profileImageUrl?: string}>} */
          let newConnections = [];
          try {
            let parsed;
            if (typeof modelResponse === "string") {
              parsed = JSON.parse(modelResponse);
            } else {
              parsed = modelResponse;
            }
            newConnections = parsed?.connections || [];
            if (!Array.isArray(newConnections)) {
              newConnections = [];
            }
          } catch (parseError) {
            context.log("Could not parse AI response", { error: parseError.message });
            newConnections = [];
          }

          // Add new connections (deduplicated)
          const beforeCount = allConnections.size;
          for (const conn of newConnections) {
            const key = getConnectionKey(conn);
            if (!allConnections.has(key)) {
              allConnections.set(key, conn);
            }
          }
          const addedCount = allConnections.size - beforeCount;

          context.log("Connections extracted", { 
            extracted: newConnections.length, 
            newUnique: addedCount, 
            total: allConnections.size 
          });

          // If we got no new connections twice in a row, stop scrolling
          if (addedCount === 0) {
            consecutiveEmptyExtractions++;
            if (consecutiveEmptyExtractions >= 2) {
              context.log("No new connections found after scrolling, stopping");
              break;
            }
          } else {
            consecutiveEmptyExtractions = 0;
          }

          // Check if we have enough
          if (allConnections.size >= limit) {
            context.log("Reached requested limit", { limit, total: allConnections.size });
            break;
          }

          // Scroll down to load more connections
          scrollCount++;
          
          try {
            await context.http.post(
              `${baseUrl}/sessions/${sessionId}/windows/${windowId}/scroll`,
              {
                scrollBy: { y: 600 }, // Scroll down 600 pixels
              },
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                timeout: 30000,
              }
            );
            context.log("Scrolled down", { scrollCount });
          } catch (scrollError) {
            context.log("Scroll failed, stopping", { error: scrollError.message });
            break;
          }

          // Wait for new content to load after scroll
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Convert map to array
        const connections = Array.from(allConnections.values());

        // Update last used timestamp
        await userSecretsRef.update({
          "services.airtop.profiles.linkedin.lastUsed": new Date().toISOString(),
        });

        context.log("Connections fetched successfully", {
          count: connections.length,
          scrollsPerformed: scrollCount,
        });

        return {
          success: true,
          connections: connections.slice(0, limit),
          total: connections.length,
        };
      }

      // =========================================================================
      // FEED - Fetch user's LinkedIn feed posts with infinite scroll support
      // =========================================================================
      case "feed": {
        const { limit = 20 } = params;

        // Navigate to feed
        const windowResponse = await context.http.post(
          `${baseUrl}/sessions/${sessionId}/windows`,
          {
            url: "https://www.linkedin.com/feed/",
            waitUntil: "load",
            screenResolution: "1280x800",
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          }
        );

        windowId = windowResponse.data?.data?.windowId;
        if (!windowId) {
          throw new Error("Failed to create window");
        }

        context.log("Navigated to feed", { windowId });

        // Wait for initial page to render
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Helper to create unique post key for deduplication
        /** @param {{authorName: string, content: string}} post */
        const getPostKey = (post) => {
          const contentSnippet = (post.content || "").slice(0, 100);
          return `${post.authorName}:${contentSnippet}`;
        };

        // Accumulated posts with deduplication
        /** @type {Map<string, {authorName: string, authorHeadline?: string, content: string, timestamp?: string, likes?: number, comments?: number, postUrl?: string, hasImage?: boolean, hasVideo?: boolean}>} */
        const allPosts = new Map();

        // Extraction prompt (fixed for each extraction)
        const extractionPrompt = `
          Extract ALL LinkedIn posts visible in this feed viewport. For each post, extract:
          - authorName: The name of the person or company who posted
          - authorHeadline: Their job title or company tagline
          - authorProfileUrl: URL to their LinkedIn profile
          - content: The text content of the post (first 500 characters if long)
          - timestamp: When it was posted (e.g., "2h ago", "3d ago")
          - likes: Number of likes/reactions (as a number, or 0 if not visible)
          - comments: Number of comments (as a number, or 0 if not visible)
          - postUrl: URL to the specific post (if available)
          - hasImage: Whether the post contains an image (true/false)
          - hasVideo: Whether the post contains a video (true/false)

          Return the data as a JSON object with a "posts" array. Extract all visible posts.
          If you can't find any posts, return {"posts": []}.
          Only return valid JSON, no additional text.
        `;

        const outputSchema = JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            posts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  authorName: { type: "string" },
                  authorHeadline: { type: "string" },
                  authorProfileUrl: { type: "string" },
                  content: { type: "string" },
                  timestamp: { type: "string" },
                  likes: { type: "number" },
                  comments: { type: "number" },
                  postUrl: { type: "string" },
                  hasImage: { type: "boolean" },
                  hasVideo: { type: "boolean" },
                },
                required: ["authorName", "content"],
              },
            },
          },
          required: ["posts"],
        });

        // Scroll and extract loop
        const maxScrolls = Math.min(10, Math.ceil(limit / 5)); // ~5 posts per viewport, max 10 scrolls
        let scrollCount = 0;
        let consecutiveEmptyExtractions = 0;

        while (allPosts.size < limit && scrollCount < maxScrolls) {
          context.log("Extracting posts", { scrollCount, currentTotal: allPosts.size });

          // Extract posts from current viewport
          const queryResponse = await context.http.post(
            `${baseUrl}/sessions/${sessionId}/windows/${windowId}/page-query`,
            {
              prompt: extractionPrompt,
              configuration: { outputSchema },
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 60000,
            }
          );

          const modelResponse = queryResponse.data?.data?.modelResponse;
          
          /** @type {Array<{authorName: string, authorHeadline?: string, content: string, timestamp?: string, likes?: number, comments?: number, postUrl?: string, hasImage?: boolean, hasVideo?: boolean}>} */
          let newPosts = [];
          try {
            let parsed;
            if (typeof modelResponse === "string") {
              parsed = JSON.parse(modelResponse);
            } else {
              parsed = modelResponse;
            }
            newPosts = parsed?.posts || [];
            if (!Array.isArray(newPosts)) {
              newPosts = [];
            }
          } catch (parseError) {
            context.log("Could not parse AI response", { error: parseError.message });
            newPosts = [];
          }

          // Add new posts (deduplicated)
          const beforeCount = allPosts.size;
          for (const post of newPosts) {
            const key = getPostKey(post);
            if (!allPosts.has(key)) {
              allPosts.set(key, post);
            }
          }
          const addedCount = allPosts.size - beforeCount;
          
          context.log("Posts extracted", { 
            extracted: newPosts.length, 
            newUnique: addedCount, 
            total: allPosts.size 
          });

          // If we got no new posts twice in a row, stop scrolling
          if (addedCount === 0) {
            consecutiveEmptyExtractions++;
            if (consecutiveEmptyExtractions >= 2) {
              context.log("No new posts found after scrolling, stopping");
              break;
            }
          } else {
            consecutiveEmptyExtractions = 0;
          }

          // Check if we have enough
          if (allPosts.size >= limit) {
            context.log("Reached requested limit", { limit, total: allPosts.size });
            break;
          }

          // Scroll down to load more posts
          scrollCount++;
          
          try {
            await context.http.post(
              `${baseUrl}/sessions/${sessionId}/windows/${windowId}/scroll`,
              {
                scrollBy: { y: 800 }, // Scroll down 800 pixels
              },
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                timeout: 30000,
              }
            );
            context.log("Scrolled down", { scrollCount });
          } catch (scrollError) {
            context.log("Scroll failed, stopping", { error: scrollError.message });
            break;
          }

          // Wait for new content to load after scroll
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Convert map to array
        const posts = Array.from(allPosts.values());

        // Update last used timestamp
        await userSecretsRef.update({
          "services.airtop.profiles.linkedin.lastUsed": new Date().toISOString(),
        });

        context.log("Feed posts fetched successfully", { 
          count: posts.length,
          scrollsPerformed: scrollCount 
        });

        return {
          success: true,
          posts: posts.slice(0, limit),
          total: posts.length,
        };
      }

      default:
        throw new Error(
          `Unknown action: ${action}. Valid actions: connections, feed`
        );
    }
  } catch (error) {
    context.error("Failed to fetch LinkedIn data:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      profileId,
    });

    if (
      error.response?.status === 401 ||
      error.message?.includes("login") ||
      error.message?.includes("sign in")
    ) {
      throw new Error(
        "LinkedIn session expired. Please reconnect your LinkedIn account."
      );
    }

    // Pass through the FULL error message - don't strip details
    // If this is an axios error, include the response data
    if (error.response?.data) {
      throw new Error(
        `API Error: ${JSON.stringify(error.response.data)} | Original: ${error.message}`
      );
    }
    
    // Otherwise just pass through our detailed error message
    throw error;
  } finally {
    // Always clean up the session
    if (sessionId) {
      try {
        await context.http.delete(`${baseUrl}/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000,
        });
        context.log("Session terminated", { sessionId });
      } catch (cleanupError) {
        context.log("Warning: Could not terminate session", {
          error: cleanupError.message,
        });
      }
    }
  }
};

