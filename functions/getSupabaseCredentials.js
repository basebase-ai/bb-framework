/**
 * Get Supabase Credentials
 *
 * Retrieves user's stored Supabase credentials from Firestore.
 *
 * @param {Object} params - Function parameters
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean, hasCredentials: boolean, projectUrl?: string}>}
 */
module.exports = async function (params, context) {
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  context.log("Getting Supabase credentials", { userId });

  try {
    const db = context.firestore();
    const credentialsDoc = await db
      .collection("supabase-credentials")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return {
        success: true,
        hasCredentials: false,
      };
    }

    const data = credentialsDoc.data();

    return {
      success: true,
      hasCredentials: true,
      projectUrl: data.projectUrl,
      // Don't return the API key to the frontend for security
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };
  } catch (error) {
    context.error("Failed to get Supabase credentials:", error);
    throw new Error(error.message || "Failed to get credentials");
  }
};
