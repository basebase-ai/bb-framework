/**
 * Save Supabase Credentials
 *
 * Securely stores user's Supabase project URL and API key in Firestore.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.projectUrl - Supabase project URL (e.g., https://xyz.supabase.co)
 * @param {string} params.apiKey - Supabase API key (anon or service role)
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean}>}
 */
module.exports = async function (params, context) {
  const { projectUrl, apiKey } = params;
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  if (!projectUrl) {
    throw new Error("projectUrl is required");
  }

  if (!apiKey) {
    throw new Error("apiKey is required");
  }

  // Validate URL format
  if (
    !projectUrl.includes("supabase.co") &&
    !projectUrl.includes("supabase.in")
  ) {
    throw new Error("Invalid Supabase project URL");
  }

  context.log("Saving Supabase credentials", {
    userId,
    projectUrl: projectUrl.substring(0, 30) + "...",
  });

  try {
    // Store credentials in Firestore under user's document
    const db = context.firestore();
    const credentialsDoc = db.collection("supabase-credentials").doc(userId);

    await credentialsDoc.set({
      projectUrl: projectUrl.replace(/\/$/, ""), // Remove trailing slash
      apiKey,
      updatedAt: new Date().toISOString(),
      userId,
    });

    context.log("Supabase credentials saved successfully", { userId });

    return {
      success: true,
      message: "Credentials saved successfully",
    };
  } catch (error) {
    context.error("Failed to save Supabase credentials:", error);
    throw new Error(error.message || "Failed to save credentials");
  }
};
