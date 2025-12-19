/**
 * Fetch Apify Actors
 *
 * Retrieves actors from Apify using stored API token credentials.
 *
 * @param {Object} params - Function parameters
 * @param {number} [params.limit=20] - Maximum number of actors to return
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, actors: Array}>}
 */
module.exports = async function (params, context) {
  const { limit = 20 } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  context.log("Fetching Apify actors", { userId, limit });

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
    // Fetch actors from Apify
    const actorsResponse = await context.http.get(
      `https://api.apify.com/v2/acts?limit=${Math.min(limit, 100)}&my=true`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const actorsData = actorsResponse.data?.data?.items || [];

    // Parse actors
    /** @type {Array<{id: string, name: string, title?: string, username?: string, description?: string, createdAt?: string, modifiedAt?: string}>} */
    const actors = actorsData.map((actor) => ({
      id: actor.id,
      name: actor.name || "Untitled",
      title: actor.title || null,
      username: actor.username || null,
      description: actor.description || null,
      createdAt: actor.createdAt,
      modifiedAt: actor.modifiedAt,
    }));

    context.log("Apify actors fetched successfully", {
      actors: actors.length,
    });

    return {
      success: true,
      actors,
      total: actors.length,
    };
  } catch (error) {
    context.error("Failed to fetch Apify actors:", error);

    if (error.response?.status === 401) {
      throw new Error(
        "Apify authentication failed. Please check your API token."
      );
    } else if (error.response?.status === 403) {
      throw new Error(
        "Access denied. Make sure your API token has the required permissions."
      );
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch Apify actors"
    );
  }
};
