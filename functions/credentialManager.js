/**
 * Credential Manager
 *
 * Generic function for managing service credentials in user-secrets collection.
 * Use the `action` parameter to specify the operation.
 *
 * Credentials are stored at: user-secrets/{userId}/services/{serviceName}
 *
 * @param {Object} params - Function parameters
 * @param {string} params.action - Action: "save" | "get" | "delete"
 * @param {string} params.serviceName - Service name (e.g., "supabase", "postgres", "mongodb")
 * @param {Object} [params.credentials] - Credentials to save (required for save action)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Action-specific result
 */
module.exports = async function (params, context) {
  const { action, serviceName, credentials } = params;

  if (!action) {
    throw new Error("action is required: save | get | delete");
  }

  if (!serviceName) {
    throw new Error("serviceName is required");
  }

  const userId = context.auth?.uid || context.userId;

  if (!userId) {
    throw new Error("User must be authenticated");
  }

  const db = context.firestore();
  const userSecretsRef = db.collection("user-secrets").doc(userId);

  switch (action) {
    // =========================================================================
    // SAVE - Store credentials for a service
    // =========================================================================
    case "save": {
      if (!credentials || typeof credentials !== "object") {
        throw new Error("credentials object is required for save action");
      }

      context.log("Saving credentials", { userId, serviceName });

      try {
        // Use set with merge to update only the specific service
        await userSecretsRef.set(
          {
            services: {
              [serviceName]: {
                ...credentials,
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        context.log("Credentials saved successfully", { serviceName });

        return {
          success: true,
          message: `${serviceName} credentials saved`,
        };
      } catch (error) {
        context.error("Failed to save credentials:", error);
        throw new Error(`Failed to save ${serviceName} credentials`);
      }
    }

    // =========================================================================
    // GET - Retrieve credentials for a service
    // =========================================================================
    case "get": {
      context.log("Getting credentials", { userId, serviceName });

      try {
        const doc = await userSecretsRef.get();

        if (!doc.exists) {
          return {
            success: true,
            hasCredentials: false,
          };
        }

        const data = doc.data();
        const serviceCredentials = data?.services?.[serviceName];

        if (!serviceCredentials) {
          return {
            success: true,
            hasCredentials: false,
          };
        }

        // Return credential metadata without exposing sensitive values
        // Only return non-sensitive fields
        const safeFields = {};
        for (const [key, value] of Object.entries(serviceCredentials)) {
          // Don't expose keys, passwords, connection strings
          if (
            !key.toLowerCase().includes("key") &&
            !key.toLowerCase().includes("password") &&
            !key.toLowerCase().includes("secret") &&
            !key.toLowerCase().includes("connectionstring")
          ) {
            safeFields[key] = value;
          }
        }

        return {
          success: true,
          hasCredentials: true,
          ...safeFields,
        };
      } catch (error) {
        context.error("Failed to get credentials:", error);
        throw new Error(`Failed to get ${serviceName} credentials`);
      }
    }

    // =========================================================================
    // DELETE - Remove credentials for a service
    // =========================================================================
    case "delete": {
      context.log("Deleting credentials", { userId, serviceName });

      try {
        const { FieldValue } = require("firebase-admin/firestore");

        await userSecretsRef.update({
          [`services.${serviceName}`]: FieldValue.delete(),
          updatedAt: new Date().toISOString(),
        });

        context.log("Credentials deleted successfully", { serviceName });

        return {
          success: true,
          message: `${serviceName} credentials deleted`,
        };
      } catch (error) {
        // If document doesn't exist, that's fine
        if (error.code === 5) {
          return {
            success: true,
            message: `No ${serviceName} credentials to delete`,
          };
        }
        context.error("Failed to delete credentials:", error);
        throw new Error(`Failed to delete ${serviceName} credentials`);
      }
    }

    default:
      throw new Error(`Unknown action: ${action}. Use: save | get | delete`);
  }
};
