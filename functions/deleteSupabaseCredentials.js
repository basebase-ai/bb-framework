/**
 * Delete Supabase Credentials
 *
 * Removes user's stored Supabase credentials from Firestore.
 *
 * @param {Object} params - Function parameters
 * @param {Object} context - Function context
 * @returns {Promise<{success: boolean}>}
 */
module.exports = async function (params, context) {
  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  context.log("Deleting Supabase credentials", { userId });

  try {
    const db = context.firestore();
    await db.collection("supabase-credentials").doc(userId).delete();

    context.log("Supabase credentials deleted successfully", { userId });

    return {
      success: true,
      message: "Credentials deleted successfully",
    };
  } catch (error) {
    context.error("Failed to delete Supabase credentials:", error);
    throw new Error(error.message || "Failed to delete credentials");
  }
};
