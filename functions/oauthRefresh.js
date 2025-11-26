/**
 * Framework Function: OAuth Token Refresh
 * 
 * Refreshes an expired access token using the refresh token.
 * This is automatically called when needed by backend functions.
 * 
 * @param {Object} params - Function parameters
 * @param {string} params.provider - OAuth provider (google, microsoft, github)
 * @param {string} [params.userId] - User ID (defaults to authenticated user)
 * @param {Object} context - Function context
 * @returns {Promise<Object>} New tokens
 */
module.exports = async function (params, context) {
  const { provider } = params;
  const userId = params.userId || context.auth?.uid;

  if (!provider) {
    throw new Error("Provider is required");
  }
  if (!userId) {
    throw new Error("User ID is required");
  }

  context.log("Refreshing OAuth token", { provider, userId });

  try {
    const db = context.firebase.firestore();

    // Get current tokens from user-secrets
    const secretDoc = await db.collection("user-secrets").doc(userId).get();
    
    if (!secretDoc.exists) {
      throw new Error(`No OAuth tokens found for user ${userId}`);
    }

    const providerData = secretDoc.data().services?.[provider];
    
    if (!providerData || !providerData.refreshToken) {
      throw new Error(`No refresh token found for provider ${provider}`);
    }

    // Decrypt refresh token
    const { decryptToken } = require("./oauthExchange.js");
    const refreshToken = await decryptToken(providerData.refreshToken, context);

    // Refresh the token
    const newTokens = await refreshAccessToken(provider, refreshToken, context);

    // Update stored tokens
    await updateTokens(userId, provider, newTokens, context);

    context.log("Token refresh successful", { provider, userId });

    return {
      success: true,
      provider,
      expiresAt: newTokens.expiresAt,
    };
  } catch (error) {
    context.error("Token refresh failed:", error);
    throw error;
  }
};

/**
 * Refresh access token with OAuth provider
 */
async function refreshAccessToken(provider, refreshToken, context) {
  const configs = {
    google: {
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: await context.getSecret("GMAIL_CLIENT_ID"),
      clientSecret: await context.getSecret("GMAIL_CLIENT_SECRET"),
    },
    microsoft: {
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId: await context.getSecret("MICROSOFT_CLIENT_ID"),
      clientSecret: await context.getSecret("MICROSOFT_CLIENT_SECRET"),
    },
    // GitHub tokens don't expire, so refresh not needed
  };

  const config = configs[provider.toLowerCase()];
  if (!config) {
    throw new Error(`Token refresh not supported for provider: ${provider}`);
  }

  const payload = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  };

  context.log("Refreshing token with OAuth provider", { provider });

  try {
    const response = await context.http.post(config.tokenUrl, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    const data = response.data;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers return new refresh token
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || "Bearer",
    };
  } catch (error) {
    context.error("Token refresh HTTP request failed:", error);
    
    if (error.response?.status === 400) {
      throw new Error(
        `Refresh token invalid or expired for ${provider}. User needs to re-authenticate.`
      );
    }
    
    throw new Error(`Failed to refresh ${provider} token: ${error.message}`);
  }
}

/**
 * Update tokens in user-secrets collection
 */
async function updateTokens(userId, provider, tokens, context) {
  const db = context.firebase.firestore();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tokens.expiresIn * 1000);

  // Encrypt new access token
  const crypto = require("crypto");
  const encryptionKey = await context.getSecret("ENCRYPTION_KEY");
  
  let encryptedAccessToken;
  let encryptedRefreshToken = null;
  
  if (encryptionKey) {
    // Encrypt tokens
    const algorithm = "aes-256-gcm";
    const key = crypto.createHash("sha256").update(encryptionKey).digest();
    
    // Encrypt access token
    const ivAccess = crypto.randomBytes(16);
    const cipherAccess = crypto.createCipheriv(algorithm, key, ivAccess);
    let encryptedAccess = cipherAccess.update(tokens.accessToken, "utf8", "hex");
    encryptedAccess += cipherAccess.final("hex");
    const authTagAccess = cipherAccess.getAuthTag();
    encryptedAccessToken = `${ivAccess.toString("hex")}:${authTagAccess.toString("hex")}:${encryptedAccess}`;
    
    // Encrypt refresh token if provided
    if (tokens.refreshToken) {
      const ivRefresh = crypto.randomBytes(16);
      const cipherRefresh = crypto.createCipheriv(algorithm, key, ivRefresh);
      let encryptedRefresh = cipherRefresh.update(tokens.refreshToken, "utf8", "hex");
      encryptedRefresh += cipherRefresh.final("hex");
      const authTagRefresh = cipherRefresh.getAuthTag();
      encryptedRefreshToken = `${ivRefresh.toString("hex")}:${authTagRefresh.toString("hex")}:${encryptedRefresh}`;
    }
  } else {
    encryptedAccessToken = tokens.accessToken;
    encryptedRefreshToken = tokens.refreshToken;
  }

  // Update only the tokens that changed
  const updates = {
    [`services.${provider}.accessToken`]: encryptedAccessToken,
    [`services.${provider}.expiresAt`]: expiresAt,
    [`services.${provider}.tokenType`]: tokens.tokenType,
    updatedAt: now,
  };

  // Update refresh token if a new one was provided
  if (encryptedRefreshToken) {
    updates[`services.${provider}.refreshToken`] = encryptedRefreshToken;
  }

  await db.collection("user-secrets").doc(userId).update(updates);

  context.log("Tokens updated successfully", { userId, provider });
}

