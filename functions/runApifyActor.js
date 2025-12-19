/**
 * Run Apify Actor
 *
 * Generic function to run any Apify actor with custom input.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.actorId - Actor ID (e.g., "dev_fusion/Linkedin-Profile-Scraper")
 * @param {Object} params.input - Input object to pass to the actor
 * @param {number} [params.timeoutSecs=120] - Timeout in seconds
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, items: Array, runId?: string}>}
 */
module.exports = async function (params, context) {
  const { actorId, input, timeoutSecs = 120 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!actorId) {
    throw new Error("actorId is required");
  }

  context.log("Running Apify actor", {
    userId,
    actorId,
    inputKeys: Object.keys(input || {}),
  });

  const db = context.firestore();

  // Get stored credentials from user-secrets
  const userSecretsDoc = await db.collection("user-secrets").doc(userId).get();
  const apifyCredentials = userSecretsDoc.exists
    ? userSecretsDoc.data()?.services?.apify
    : null;

  if (!apifyCredentials) {
    throw new Error("Apify not connected. Please add your API token first.");
  }

  const apiToken = apifyCredentials.apiToken;

  if (!apiToken) {
    throw new Error("No API token found for Apify");
  }

  try {
    // Run the actor synchronously and get dataset items directly
    const runResponse = await context.http.post(
      `https://api.apify.com/v2/acts/${encodeURIComponent(
        actorId
      )}/run-sync-get-dataset-items`,
      input || {},
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        timeout: timeoutSecs * 1000,
      }
    );

    // The response is the dataset items directly
    const items = runResponse.data || [];

    context.log("Apify actor completed successfully", {
      actorId,
      itemCount: items.length,
    });

    return {
      success: true,
      items,
      total: items.length,
    };
  } catch (error) {
    context.error("Failed to run Apify actor:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Apify authentication failed. Please check your API token."
      );
    } else if (error.response?.status === 404) {
      throw new Error(`Actor not found: ${actorId}`);
    } else if (error.response?.status === 402) {
      throw new Error(
        "Insufficient Apify credits. Please check your account balance."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to run Apify actor"
    );
  }
};
