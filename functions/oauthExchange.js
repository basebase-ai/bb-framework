/**
 * Framework Function: OAuth Token Exchange
 *
 * Exchanges OAuth authorization code for access/refresh tokens and stores them securely
 * in the user-secrets collection. This is provider-agnostic and works with Google,
 * Microsoft, GitHub, etc.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.provider - OAuth provider (google, microsoft, github)
 * @param {string} params.code - Authorization code from OAuth callback
 * @param {string} params.redirectUri - Redirect URI used in OAuth flow
 * @param {Object} context - Function context
 * @returns {Promise<Object>} Success result
 */
module.exports = async function (params, context) {
  const { provider, code, redirectUri } = params;
  const userId = context.auth?.uid || context.userId;

  // Validate parameters
  if (!provider) {
    throw new Error("Provider is required");
  }
  if (!code) {
    throw new Error("Authorization code is required");
  }
  if (!userId) {
    throw new Error("User must be authenticated");
  }

  context.log("Processing OAuth token exchange", { provider, userId });

  try {
    // Exchange code for tokens based on provider
    const tokens = await exchangeCodeForTokens(
      provider,
      code,
      redirectUri,
      context
    );

    // Store tokens in user-secrets collection
    await storeTokens(userId, provider, tokens, context);

    context.log("OAuth token exchange successful", { provider, userId });

    return {
      success: true,
      provider,
      message: `${provider} connected successfully`,
    };
  } catch (error) {
    context.error("OAuth token exchange failed:", error);
    throw error;
  }
};

/**
 * Exchange authorization code for tokens (provider-specific)
 */
async function exchangeCodeForTokens(provider, code, redirectUri, context) {
  const configs = {
    google: {
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: await context.getSecret("GMAIL_CLIENT_ID"),
      clientSecret: await context.getSecret("GMAIL_CLIENT_SECRET"),
      grantType: "authorization_code",
    },
    microsoft: {
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId: await context.getSecret("MICROSOFT_CLIENT_ID"),
      clientSecret: await context.getSecret("MICROSOFT_CLIENT_SECRET"),
      grantType: "authorization_code",
    },
    github: {
      tokenUrl: "https://github.com/login/oauth/access_token",
      clientId: await context.getSecret("GITHUB_CLIENT_ID"),
      clientSecret: await context.getSecret("GITHUB_CLIENT_SECRET"),
    },
  };

  const config = configs[provider.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  if (!config.clientId || !config.clientSecret) {
    const secretPrefix =
      provider.toLowerCase() === "google" ? "GMAIL" : provider.toUpperCase();
    throw new Error(
      `OAuth credentials not configured for provider: ${provider}. ` +
        `Set ${secretPrefix}_CLIENT_ID and ${secretPrefix}_CLIENT_SECRET`
    );
  }

  if (!redirectUri) {
    throw new Error("Redirect URI is required for token exchange");
  }

  // Build request payload
  const payload = {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
  };

  if (config.grantType) {
    payload.grant_type = config.grantType;
  }

  context.log("Exchanging code with OAuth provider", { provider });

  try {
    // Make token exchange request
    const response = await context.http.post(config.tokenUrl, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    const data = response.data;

    // Normalize response across providers
    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || "Bearer",
      scope: data.scope || null,
    };

    return tokens;
  } catch (error) {
    context.error("Token exchange HTTP request failed:", error);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 400) {
        throw new Error(
          `Invalid authorization code or redirect URI for ${provider}`
        );
      } else if (status === 401) {
        throw new Error(`Invalid OAuth credentials for ${provider}`);
      } else {
        throw new Error(
          `${provider} token exchange failed (${status}): ${
            errorData.error_description || errorData.error || "Unknown error"
          }`
        );
      }
    }

    throw new Error(
      `Network error during ${provider} token exchange: ${error.message}`
    );
  }
}

/**
 * Store encrypted tokens in user-secrets collection
 */
async function storeTokens(userId, provider, tokens, context) {
  // Get access to raw Firestore
  const db = context.firestore();

  // Use ISO strings for timestamps (compatible with Firestore)
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + tokens.expiresIn * 1000
  ).toISOString();

  // Encrypt sensitive tokens
  const encryptedAccessToken = await encryptToken(tokens.accessToken, context);
  const encryptedRefreshToken = tokens.refreshToken
    ? await encryptToken(tokens.refreshToken, context)
    : null;

  // Prepare provider data
  const providerData = {
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    expiresAt,
    tokenType: tokens.tokenType,
    scope: tokens.scope,
    grantedAt: now,
  };

  // Use userId as document ID for easy lookup
  // Note: user-secrets is a system collection, so we use raw firestore() instead of namespaced firebase
  const secretRef = db.collection("user-secrets").doc(userId);

  try {
    // Get existing document or create new one
    const secretDoc = await secretRef.get();

    if (secretDoc.exists) {
      // Update existing document - merge provider data
      await secretRef.update({
        [`services.${provider}`]: providerData,
        updatedAt: now,
      });
    } else {
      // Create new document
      await secretRef.set({
        userId,
        services: {
          [provider]: providerData,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    context.log("Tokens stored successfully", { userId, provider });
  } catch (error) {
    context.error("Failed to store tokens:", error);
    // Include the original error details for debugging
    throw new Error(
      `Failed to store OAuth tokens in database: ${error.message}`
    );
  }
}

/**
 * Encrypt a token using AES-256-GCM
 */
async function encryptToken(token, context) {
  // Get encryption key from environment
  const encryptionKey = await context.getSecret("ENCRYPTION_KEY");

  if (!encryptionKey) {
    // If no encryption key is set, store token in plain text (not recommended for production)
    context.log("WARNING: ENCRYPTION_KEY not set, tokens stored unencrypted");
    return token;
  }

  try {
    const crypto = require("crypto");
    const algorithm = "aes-256-gcm";

    // Ensure key is 32 bytes
    const key = crypto.createHash("sha256").update(encryptionKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Return as: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    context.error("Encryption failed:", error);
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypt a token (for use in other functions)
 * @param {string} encryptedToken - Token in format "iv:authTag:encrypted"
 * @param {Object} context - Function context
 * @returns {Promise<string>} Decrypted token
 */
async function decryptToken(encryptedToken, context) {
  const encryptionKey = await context.getSecret("ENCRYPTION_KEY");

  if (!encryptionKey) {
    // Token stored in plain text
    return encryptedToken;
  }

  try {
    const crypto = require("crypto");
    const algorithm = "aes-256-gcm";

    // Split encrypted token
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error("Invalid encrypted token format");
    }

    const key = crypto.createHash("sha256").update(encryptionKey).digest();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    context.error("Decryption failed:", error);
    throw new Error("Failed to decrypt token");
  }
}

// Export helper for use in other functions
module.exports.decryptToken = decryptToken;
