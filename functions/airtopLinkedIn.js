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
    const sessionResponse = await context.http.post(
      `${baseUrl}/sessions`,
      {
        configuration: {
          timeoutMinutes: 5,
          baseProfileId: profileId,
          persistProfile: true,
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

    sessionId = sessionResponse.data?.data?.id;
    if (!sessionId) {
      throw new Error("Failed to create session");
    }

    context.log("Session created", { sessionId });

    switch (action) {
      // =========================================================================
      // CONNECTIONS - Fetch user's LinkedIn connections
      // =========================================================================
      case "connections": {
        const { limit = 50 } = params;

        // Navigate to connections page
        const windowResponse = await context.http.post(
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

        windowId = windowResponse.data?.data?.windowId;
        if (!windowId) {
          throw new Error("Failed to create window");
        }

        context.log("Navigated to connections page", { windowId });

        // Wait for page to render
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Extract connections using AI
        const extractionPrompt = `
          Extract the LinkedIn connections visible on this page. For each connection, extract:
          - name: The person's full name
          - headline: Their job title/headline (if visible)
          - profileUrl: Their LinkedIn profile URL (if available)
          - connectedDate: When you connected (if visible, like "Connected 2 weeks ago")
          - profileImageUrl: URL of their profile picture (if visible)

          Return the data as a JSON array of objects. Extract up to ${limit} connections.
          If you can't find any connections, return an empty array.
          Only return valid JSON, no additional text.
        `;

        const queryResponse = await context.http.post(
          `${baseUrl}/sessions/${sessionId}/windows/${windowId}/page-query`,
          {
            prompt: extractionPrompt,
            configuration: {
              outputSchema: {
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
        context.log("AI extraction complete", { hasResponse: !!modelResponse });

        /** @type {Array<{name: string, headline?: string, profileUrl?: string, connectedDate?: string, profileImageUrl?: string}>} */
        let connections = [];
        try {
          if (typeof modelResponse === "string") {
            connections = JSON.parse(modelResponse);
          } else if (Array.isArray(modelResponse)) {
            connections = modelResponse;
          }
        } catch (parseError) {
          context.log("Could not parse AI response as JSON", {
            response: modelResponse,
          });
          connections = [];
        }

        // Update last used timestamp
        await userSecretsRef.update({
          "services.airtop.profiles.linkedin.lastUsed": new Date().toISOString(),
        });

        context.log("Connections fetched successfully", {
          count: connections.length,
        });

        return {
          success: true,
          connections: connections.slice(0, limit),
          total: connections.length,
        };
      }

      // =========================================================================
      // FEED - Fetch user's LinkedIn feed posts
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

        // Wait for page to render
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Extract feed posts using AI
        const extractionPrompt = `
          Extract the LinkedIn posts visible in this feed. For each post, extract:
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

          Return the data as a JSON array of objects. Extract up to ${limit} posts.
          If you can't find any posts, return an empty array.
          Only return valid JSON, no additional text.
        `;

        const queryResponse = await context.http.post(
          `${baseUrl}/sessions/${sessionId}/windows/${windowId}/page-query`,
          {
            prompt: extractionPrompt,
            configuration: {
              outputSchema: {
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
        context.log("AI extraction complete", { hasResponse: !!modelResponse });

        /** @type {Array<{authorName: string, authorHeadline?: string, content: string, timestamp?: string, likes?: number, comments?: number, postUrl?: string, hasImage?: boolean, hasVideo?: boolean}>} */
        let posts = [];
        try {
          if (typeof modelResponse === "string") {
            posts = JSON.parse(modelResponse);
          } else if (Array.isArray(modelResponse)) {
            posts = modelResponse;
          }
        } catch (parseError) {
          context.log("Could not parse AI response as JSON", {
            response: modelResponse,
          });
          posts = [];
        }

        // Update last used timestamp
        await userSecretsRef.update({
          "services.airtop.profiles.linkedin.lastUsed": new Date().toISOString(),
        });

        context.log("Feed posts fetched successfully", { count: posts.length });

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
    context.error("Failed to fetch LinkedIn data:", error);

    if (
      error.response?.status === 401 ||
      error.message?.includes("login") ||
      error.message?.includes("sign in")
    ) {
      throw new Error(
        "LinkedIn session expired. Please reconnect your LinkedIn account."
      );
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch LinkedIn data"
    );
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

