/**
 * Nango Utilities for Backend Functions
 *
 * Helper functions for easily working with Nango OAuth in cloud functions.
 * Uses end_user.id (Firebase UID) to look up connections since Nango generates
 * connection IDs automatically.
 *
 * @example
 * const { getOAuthToken, isOAuthConnected } = require("./lib/nango-utils.js");
 *
 * module.exports = async function(params, context) {
 *   const userId = context.auth.uid;
 *
 *   // Check if user has HubSpot connected
 *   if (!await isOAuthConnected(userId, "hubspot", context)) {
 *     throw new Error("Please connect HubSpot first");
 *   }
 *
 *   // Get valid token (Nango handles refresh automatically)
 *   const token = await getOAuthToken(userId, "hubspot", context);
 *
 *   // Use token to call HubSpot API
 *   const response = await context.http.get("https://api.hubapi.com/...", {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 *
 *   return { data: response.data };
 * };
 */

/** @type {string | null} */
let cachedSecretKey = null;

/**
 * Get Nango secret key from context
 * @param {Object} context - Function context
 * @returns {Promise<string>}
 */
async function getSecretKey(context) {
  if (cachedSecretKey) {
    return cachedSecretKey;
  }

  const secretKey = await context.getSecret("NANGO_SECRET_KEY");
  if (!secretKey) {
    throw new Error(
      "NANGO_SECRET_KEY not configured. Add it to your environment secrets."
    );
  }

  cachedSecretKey = secretKey;
  return secretKey;
}

/**
 * Find a connection by endUserId and integrationId
 * @param {string} userId - User's Firebase UID (used as endUserId)
 * @param {string} integrationId - Nango integration ID
 * @param {Object} context - Function context
 * @returns {Promise<Object|null>} Connection object or null
 */
async function findConnection(userId, integrationId, context) {
  const secretKey = await getSecretKey(context);

  try {
    // API: GET /connections?endUserId=<id>&integrationId=<id>
    const response = await context.http.get(
      "https://api.nango.dev/connections",
      {
        params: {
          endUserId: userId,
          integrationId: integrationId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const connections = response.data?.connections || [];
    return connections.length > 0 ? connections[0] : null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get a valid OAuth access token for a user and integration.
 * Nango automatically handles token refresh - you always get a valid token.
 *
 * @param {string} userId - User's Firebase UID
 * @param {string} integrationId - Nango integration ID (e.g., "google-mail", "hubspot")
 * @param {Object} context - Function context
 * @returns {Promise<string>} Valid access token
 *
 * @example
 * const token = await getOAuthToken(userId, "salesforce", context);
 * // Use token to call Salesforce API
 */
async function getOAuthToken(userId, integrationId, context) {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!integrationId) {
    throw new Error("integrationId is required");
  }

  const secretKey = await getSecretKey(context);

  // Find the connection
  const connection = await findConnection(userId, integrationId, context);

  if (!connection) {
    throw new Error(
      `User has not connected ${integrationId}. Please connect first.`
    );
  }

  // Get connection with credentials (Nango auto-refreshes if needed)
  // API: GET /connections/{connectionId}?provider_config_key=<id>
  const response = await context.http.get(
    `https://api.nango.dev/connections/${connection.connection_id}`,
    {
      params: {
        provider_config_key: integrationId,
      },
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      timeout: 10000,
    }
  );

  const connData = response.data;

  if (!connData.credentials?.access_token) {
    throw new Error(`No access token found for ${integrationId}`);
  }

  return connData.credentials.access_token;
}

/**
 * Check if a user has connected a specific integration.
 *
 * @param {string} userId - User's Firebase UID
 * @param {string} integrationId - Nango integration ID
 * @param {Object} context - Function context
 * @returns {Promise<boolean>} True if connected
 *
 * @example
 * if (!await isOAuthConnected(userId, "slack", context)) {
 *   throw new Error("Please connect Slack first");
 * }
 */
async function isOAuthConnected(userId, integrationId, context) {
  if (!userId || !integrationId) {
    return false;
  }

  try {
    const connection = await findConnection(userId, integrationId, context);
    return connection !== null;
  } catch {
    return false;
  }
}

/**
 * Get all OAuth connections for a user.
 *
 * @param {string} userId - User's Firebase UID
 * @param {Object} context - Function context
 * @returns {Promise<Array<{integrationId: string, connectionId: string, createdAt: string}>>}
 *
 * @example
 * const connections = await getConnections(userId, context);
 * // Returns: [{ integrationId: "hubspot", connectionId: "conn_xxx", createdAt: "..." }]
 */
async function getConnections(userId, context) {
  if (!userId) {
    return [];
  }

  const secretKey = await getSecretKey(context);

  try {
    // API: GET /connections?endUserId=<id>
    const response = await context.http.get(
      "https://api.nango.dev/connections",
      {
        params: {
          endUserId: userId,
        },
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        timeout: 10000,
      }
    );

    const connections = response.data?.connections || [];

    return connections.map((conn) => ({
      integrationId: conn.provider_config_key || conn.integration_id,
      connectionId: conn.connection_id,
      createdAt: conn.created_at,
    }));
  } catch (error) {
    context.error("Failed to list connections:", error);
    return [];
  }
}

/**
 * Get full connection details including credentials.
 * Use this when you need more than just the access token.
 *
 * @param {string} userId - User's Firebase UID
 * @param {string} integrationId - Nango integration ID
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Full connection object with credentials
 */
async function getConnection(userId, integrationId, context) {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!integrationId) {
    throw new Error("integrationId is required");
  }

  const secretKey = await getSecretKey(context);

  // Find the connection
  const connection = await findConnection(userId, integrationId, context);

  if (!connection) {
    throw new Error(
      `User has not connected ${integrationId}. Please connect first.`
    );
  }

  // Get full connection with credentials
  // API: GET /connections/{connectionId}?provider_config_key=<id>
  const response = await context.http.get(
    `https://api.nango.dev/connections/${connection.connection_id}`,
    {
      params: {
        provider_config_key: integrationId,
      },
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      timeout: 10000,
    }
  );

  return response.data;
}

module.exports = {
  getOAuthToken,
  isOAuthConnected,
  getConnections,
  getConnection,
  findConnection,
};
